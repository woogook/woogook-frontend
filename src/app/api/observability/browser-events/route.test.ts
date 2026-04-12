import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  logServerEventMock,
  observeRouteMock,
  recordBrowserEventMetricMock,
} = vi.hoisted(() => ({
  logServerEventMock: vi.fn(),
  observeRouteMock: vi.fn(),
  recordBrowserEventMetricMock: vi.fn(),
}));

vi.mock("@/lib/observability/server", () => ({
  logServerEvent: logServerEventMock,
  observeRoute: observeRouteMock,
}));

vi.mock("@/lib/observability/metrics", () => ({
  recordBrowserEventMetric: recordBrowserEventMetricMock,
}));

import { POST } from "@/app/api/observability/browser-events/route";

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("POST /api/observability/browser-events", () => {
  beforeEach(() => {
    logServerEventMock.mockReset();
    observeRouteMock.mockReset();
    recordBrowserEventMetricMock.mockReset();

    observeRouteMock.mockImplementation(async (_request, _routeName, handler) =>
      handler({
        config: {
          environment: "local",
          release: "test-release",
          localRootDir: ".logs/frontend",
          writeLocalFiles: true,
          rotateBytes: 1024,
          retentionDays: 14,
          mirrorToCloudInLocal: false,
          outboundTimeoutMs: 1_000,
          analyzerLookbackMinutes: 10,
        },
        requestId: "request-1",
        correlationId: "correlation-1",
        routeName: "observability/browser-events",
      }),
    );
  });

  it("starts logging every browser event before waiting for the first append to finish", async () => {
    const first = createDeferred();
    const second = createDeferred();
    logServerEventMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const request = {
      json: vi.fn().mockResolvedValue({
        sessionId: "session-1",
        events: [
          {
            timestamp: "2026-04-12T12:00:00.000Z",
            level: "error",
            signalType: "browser_error",
            errorMessage: "first failure",
          },
          {
            timestamp: "2026-04-12T12:00:01.000Z",
            level: "warn",
            signalType: "browser_event",
            userAction: "retry-click",
          },
        ],
      }),
    } as unknown as Request;

    const responsePromise = POST(request);
    await Promise.resolve();
    await Promise.resolve();

    expect(logServerEventMock).toHaveBeenCalledTimes(2);
    expect(recordBrowserEventMetricMock).toHaveBeenCalledTimes(2);

    first.resolve();
    second.resolve();

    const response = await responsePromise;
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      accepted: 2,
      correlation_id: "correlation-1",
    });
  });
});
