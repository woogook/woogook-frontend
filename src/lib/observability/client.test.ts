import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getOrCreateBrowserSessionId,
  sendBrowserEvents,
} from "@/lib/observability/client";

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();

  return {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as typeof globalThis & { window?: Window }).window;
});

describe("getOrCreateBrowserSessionId", () => {
  it("reuses the same session id for repeated calls", () => {
    const storage = createMemoryStorage();

    const first = getOrCreateBrowserSessionId(storage);
    const second = getOrCreateBrowserSessionId(storage);

    expect(first).toBe(second);
  });

  it("falls back to fetch when sendBeacon returns false", async () => {
    const storage = createMemoryStorage();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 202 }));

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        sessionStorage: storage,
        location: {
          pathname: "/local-election",
          search: "",
        },
      },
    });

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        sendBeacon: vi.fn().mockReturnValue(false),
      },
    });

    await sendBrowserEvents([
      {
        level: "error",
        signalType: "browser_error",
        errorMessage: "beacon failed",
      },
    ]);

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/observability/browser-events",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      }),
    );
  });
});
