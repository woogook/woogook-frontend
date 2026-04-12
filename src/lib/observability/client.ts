import {
  CORRELATION_HEADER,
  attachCorrelationId,
  createCorrelationId,
} from "@/lib/observability/correlation";

const BROWSER_SESSION_STORAGE_KEY = "woogook:observability:session-id";

type BrowserStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type BrowserEventInput = {
  level: "debug" | "info" | "warn" | "error";
  signalType: "browser_error" | "browser_event";
  route?: string;
  userAction?: string;
  errorName?: string;
  errorMessage?: string;
  stack?: string;
  httpMethod?: string;
  httpStatus?: number;
  latencyMs?: number;
  correlationId?: string;
  context?: Record<string, unknown>;
};

export function getOrCreateBrowserSessionId(
  storage?: BrowserStorage,
) {
  if (!storage) {
    if (typeof window === "undefined") {
      return "server-render";
    }
    storage = window.sessionStorage;
  }

  const existing = storage.getItem(BROWSER_SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = crypto.randomUUID();
  storage.setItem(BROWSER_SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

export function createBrowserCorrelationHeaders(
  init?: HeadersInit,
  correlationId = createCorrelationId(),
) {
  const headers = new Headers(init);
  attachCorrelationId(headers, correlationId);
  return { headers, correlationId };
}

function getCurrentRoute() {
  if (typeof window === "undefined") {
    return undefined;
  }
  return `${window.location.pathname}${window.location.search}`;
}

export function buildBrowserEvent(input: BrowserEventInput) {
  return {
    timestamp: new Date().toISOString(),
    level: input.level,
    signalType: input.signalType,
    route: input.route ?? getCurrentRoute(),
    userAction: input.userAction,
    errorName: input.errorName,
    errorMessage: input.errorMessage,
    stack: input.stack,
    httpMethod: input.httpMethod,
    httpStatus: input.httpStatus,
    latencyMs: input.latencyMs,
    correlationId: input.correlationId,
    context: input.context,
  };
}

export async function sendBrowserEvents(events: BrowserEventInput[]) {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    sessionId: getOrCreateBrowserSessionId(),
    events: events.map((event) => buildBrowserEvent(event)),
  });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/observability/browser-events", blob);
    return;
  }

  await fetch("/api/observability/browser-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

export function reportBrowserError(error: Error, context?: Record<string, unknown>) {
  return sendBrowserEvents([
    {
      level: "error",
      signalType: "browser_error",
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      context,
    },
  ]);
}

export function reportClientApiFailure(params: {
  route: string;
  httpMethod: string;
  httpStatus?: number;
  errorMessage: string;
  correlationId?: string;
}) {
  return sendBrowserEvents([
    {
      level: "error",
      signalType: "browser_error",
      route: params.route,
      httpMethod: params.httpMethod,
      httpStatus: params.httpStatus,
      errorMessage: params.errorMessage,
      correlationId: params.correlationId,
      userAction: "client-api-failure",
    },
  ]);
}

export { CORRELATION_HEADER };
