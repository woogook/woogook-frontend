"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { reportBrowserError, sendBrowserEvents } from "@/lib/observability/client";

function normalizeError(reason: unknown) {
  if (reason instanceof Error) {
    return reason;
  }

  return new Error(typeof reason === "string" ? reason : "Unknown browser error");
}

export default function ObservabilityBootstrap() {
  const pathname = usePathname();
  const hasLoggedSessionStart = useRef(false);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void reportBrowserError(normalizeError(event.error ?? event.message), {
        source: "window.error",
      });
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      void reportBrowserError(normalizeError(event.reason), {
        source: "window.unhandledrejection",
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    if (!hasLoggedSessionStart.current) {
      hasLoggedSessionStart.current = true;
      void sendBrowserEvents([
        {
          level: "info",
          signalType: "browser_event",
          userAction: "session-start",
          context: {
            userAgent: navigator.userAgent,
          },
        },
      ]);
    }

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const search = typeof window === "undefined" ? "" : window.location.search;

    void sendBrowserEvents([
      {
        level: "info",
        signalType: "browser_event",
        route: `${pathname}${search}`,
        userAction: "page-view",
        latencyMs: navigationEntry
          ? Number(navigationEntry.duration.toFixed(2))
          : undefined,
        context: {
          pathname,
          search,
        },
      },
    ]);
  }, [pathname]);

  return null;
}
