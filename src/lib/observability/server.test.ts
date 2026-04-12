import { NextResponse } from "next/server";

import { afterEach, describe, expect, it } from "vitest";

import type { ObservabilityEvent } from "@/lib/observability/types";
import {
  buildLokiPayload,
  observeRoute,
  shouldSendEventToCloud,
} from "@/lib/observability/server";

const originalEnv = {
  writeLocalFiles: process.env.WOOGOOK_OBSERVABILITY_WRITE_LOCAL_FILES,
  lokiPushUrl: process.env.WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL,
};

afterEach(() => {
  if (originalEnv.writeLocalFiles == null) {
    delete process.env.WOOGOOK_OBSERVABILITY_WRITE_LOCAL_FILES;
  } else {
    process.env.WOOGOOK_OBSERVABILITY_WRITE_LOCAL_FILES = originalEnv.writeLocalFiles;
  }

  if (originalEnv.lokiPushUrl == null) {
    delete process.env.WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL;
  } else {
    process.env.WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL = originalEnv.lokiPushUrl;
  }
});

describe("buildLokiPayload", () => {
  it("maps an event into a Loki stream with stable labels", () => {
    const payload = buildLokiPayload({
      timestamp: "2026-04-12T12:00:00.000Z",
      level: "error",
      signalType: "server_error",
      service: "woogook-frontend",
      component: "next-api",
      environment: "production",
      release: "release-1",
      route: "/api/ballots",
      errorMessage: "Failed to load ballots",
    } satisfies ObservabilityEvent);

    expect(payload.streams).toHaveLength(1);
    expect(payload.streams[0]?.stream).toMatchObject({
      service: "woogook-frontend",
      component: "next-api",
      environment: "production",
      level: "error",
    });
    expect(payload.streams[0]?.values[0]?.[1]).toContain('"route":"/api/ballots"');
  });

  it("does not send informational request logs to cloud by default", () => {
    const shouldSend = shouldSendEventToCloud(
      {
        environment: "production",
        release: "release-1",
        localRootDir: ".logs/frontend",
        rotateBytes: 1024,
        retentionDays: 14,
        mirrorToCloudInLocal: false,
        lokiPushUrl: "https://example.com/loki",
      },
      {
        timestamp: "2026-04-12T12:00:00.000Z",
        level: "info",
        signalType: "server_request",
        service: "woogook-frontend",
        component: "next-api",
        environment: "production",
        release: "release-1",
      },
    );

    expect(shouldSend).toBe(false);
  });

  it("preserves the original handler response while attaching the correlation header", async () => {
    process.env.WOOGOOK_OBSERVABILITY_WRITE_LOCAL_FILES = "0";
    delete process.env.WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL;

    const response = NextResponse.json(
      { ok: true },
      { headers: { "x-test-header": "kept" } },
    );

    const observed = await observeRoute(
      new Request("https://example.com/api/test", {
        method: "GET",
      }),
      "observability/test",
      async () => response,
    );

    expect(observed).toBe(response);
    expect(observed.headers.get("x-test-header")).toBe("kept");
    expect(observed.headers.get("x-correlation-id")).toBeTruthy();
  });
});
