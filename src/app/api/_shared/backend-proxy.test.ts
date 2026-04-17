import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { logServerEventMock } = vi.hoisted(() => ({
  logServerEventMock: vi.fn(),
}));

vi.mock("@/lib/observability/server", () => ({
  logServerEvent: logServerEventMock,
}));

import { proxyToBackendWithObservability } from "@/app/api/_shared/backend-proxy";

const originalBackendBaseUrl = process.env.WOOGOOK_BACKEND_BASE_URL;
const originalObservabilityTimeout =
  process.env.WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS;

describe("proxyToBackendWithObservability", () => {
  beforeEach(() => {
    logServerEventMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalBackendBaseUrl == null) {
      delete process.env.WOOGOOK_BACKEND_BASE_URL;
    } else {
      process.env.WOOGOOK_BACKEND_BASE_URL = originalBackendBaseUrl;
    }
    if (originalObservabilityTimeout == null) {
      delete process.env.WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS;
    } else {
      process.env.WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS =
        originalObservabilityTimeout;
    }
  });

  it("returns a localized 503 and logs a structured error when backend base url is missing", async () => {
    delete process.env.WOOGOOK_BACKEND_BASE_URL;

    const response = await proxyToBackendWithObservability({
      request: new Request("https://example.com/api/local-council/v1/resolve", {
        method: "GET",
        headers: {
          "x-correlation-id": "corr-missing-backend",
        },
      }),
      path: "/api/local-council/v1/resolve?address=%EC%84%9C%EC%9A%B8",
      observableRoute: "local-council/v1/resolve",
      missingBackendMessage: "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
      unavailableMessage: "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "Missing WOOGOOK_BACKEND_BASE_URL",
      message: "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    });
    expect(logServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        component: "proxy",
        route: "local-council/v1/resolve",
        correlationId: "corr-missing-backend",
        httpStatus: 503,
        errorName: "MissingBackendBaseUrl",
      }),
    );
  });

  it("propagates correlation ids to the backend and relays them back to the client", async () => {
    process.env.WOOGOOK_BACKEND_BASE_URL = "https://backend.example.com";
    process.env.WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS = "4321";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-correlation-id": "corr-from-backend",
        },
      }),
    );

    const response = await proxyToBackendWithObservability({
      request: new Request("https://example.com/api/assembly/v1/members/123/card", {
        method: "GET",
        headers: {
          "x-correlation-id": "corr-from-client",
        },
      }),
      path: "/api/assembly/v1/members/123/card?source=test-suite",
      observableRoute: "assembly/v1/members/[mona_cd]/card",
      missingBackendMessage: "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
      unavailableMessage: "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://backend.example.com/api/assembly/v1/members/123/card?source=test-suite",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.any(Headers),
      }),
    );
    const forwardedHeaders = fetchSpy.mock.calls[0]?.[1]?.headers as Headers;
    expect(forwardedHeaders.get("x-correlation-id")).toBe("corr-from-client");
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe("corr-from-backend");
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(logServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        component: "proxy",
        route: "assembly/v1/members/[mona_cd]/card",
        correlationId: "corr-from-client",
        httpStatus: 200,
      }),
    );
  });

  it("streams the backend response body without buffering it into text first", async () => {
    process.env.WOOGOOK_BACKEND_BASE_URL = "https://backend.example.com";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("streamed-body", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      }),
    );

    const response = await proxyToBackendWithObservability({
      request: new Request("https://example.com/api/assembly/v1/members"),
      path: "/api/assembly/v1/members",
      observableRoute: "assembly/v1/members",
      missingBackendMessage: "missing",
      unavailableMessage: "unavailable",
    });

    await expect(response.text()).resolves.toBe("streamed-body");
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  });

  it("uses a route-specific timeout override when provided", async () => {
    process.env.WOOGOOK_BACKEND_BASE_URL = "https://backend.example.com";
    process.env.WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS = "4321";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (_input, init) => {
        await new Promise((resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        });
        throw new Error("unreachable");
      },
    );

    const startedAt = Date.now();

    const response = await proxyToBackendWithObservability({
      request: new Request("https://example.com/api/local-council/v1/resolve", {
        method: "GET",
      }),
      path: "/api/local-council/v1/resolve?address=%EC%84%9C%EC%9A%B8",
      observableRoute: "local-council/v1/resolve",
      missingBackendMessage:
        "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
      unavailableMessage:
        "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
      timeoutMs: 10,
    });

    expect(Date.now() - startedAt).toBeLessThan(500);
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "Backend unavailable",
      message: "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    });
  });
});
