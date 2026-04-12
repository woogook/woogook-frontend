import { describe, expect, it } from "vitest";

import { getOrCreateBrowserSessionId } from "@/lib/observability/client";

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

describe("getOrCreateBrowserSessionId", () => {
  it("reuses the same session id for repeated calls", () => {
    const storage = createMemoryStorage();

    const first = getOrCreateBrowserSessionId(storage);
    const second = getOrCreateBrowserSessionId(storage);

    expect(first).toBe(second);
  });
});
