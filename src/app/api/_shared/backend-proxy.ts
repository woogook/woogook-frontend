import { NextResponse } from "next/server";

import {
  CORRELATION_HEADER,
  getOrCreateCorrelationId,
} from "@/lib/observability/correlation";
import { logServerEvent } from "@/lib/observability/server";

function getBackendBaseUrl() {
  return process.env.WOOGOOK_BACKEND_BASE_URL?.trim().replace(/\/$/, "") || null;
}

type ProxyToBackendWithObservabilityParams = {
  request: Request;
  path: string;
  observableRoute?: string;
  init?: RequestInit;
  missingBackendMessage: string;
  unavailableMessage: string;
  unavailableError?: string;
};

function buildJsonErrorResponse(params: {
  error: string;
  message: string;
  status: number;
  correlationId?: string;
}) {
  return NextResponse.json(
    {
      error: params.error,
      message: params.message,
    },
    {
      status: params.status,
      headers: params.correlationId
        ? { [CORRELATION_HEADER]: params.correlationId }
        : undefined,
    },
  );
}

async function relayBackendResponse(
  response: Response,
  fallbackCorrelationId: string,
): Promise<Response> {
  const body = await response.text();
  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  const correlationId =
    response.headers.get(CORRELATION_HEADER) ?? fallbackCorrelationId;

  headers.set(
    "content-type",
    contentType || "application/json; charset=utf-8",
  );
  headers.set(CORRELATION_HEADER, correlationId);

  return new Response(body, {
    status: response.status,
    headers,
  });
}

export async function proxyToBackendWithObservability({
  request,
  path,
  observableRoute,
  init,
  missingBackendMessage,
  unavailableMessage,
  unavailableError = "Backend unavailable",
}: ProxyToBackendWithObservabilityParams): Promise<Response> {
  const baseUrl = getBackendBaseUrl();
  const correlationId = getOrCreateCorrelationId(new Headers(request.headers));
  const routeForLogs = observableRoute ?? path.split("?")[0] ?? path;

  if (!baseUrl) {
    await logServerEvent({
      level: "warn",
      signalType: "server_error",
      component: "proxy",
      route: routeForLogs,
      correlationId,
      httpMethod: init?.method ?? request.method,
      httpStatus: 503,
      errorName: "MissingBackendBaseUrl",
      errorMessage: "WOOGOOK_BACKEND_BASE_URL is not configured",
    });
    return buildJsonErrorResponse({
      error: "Missing WOOGOOK_BACKEND_BASE_URL",
      message: missingBackendMessage,
      status: 503,
      correlationId,
    });
  }

  const startedAt = Date.now();

  try {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    if (init?.body) {
      headers.set("Content-Type", "application/json");
    }
    headers.set(CORRELATION_HEADER, correlationId);

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers,
    });

    await logServerEvent({
      level: response.ok ? "info" : "warn",
      signalType: "server_request",
      component: "proxy",
      route: routeForLogs,
      correlationId,
      httpMethod: init?.method ?? request.method,
      httpStatus: response.status,
      latencyMs: Date.now() - startedAt,
      tags: ["backend-proxy"],
    });

    return relayBackendResponse(response, correlationId);
  } catch (error) {
    await logServerEvent({
      level: "error",
      signalType: "server_error",
      component: "proxy",
      route: routeForLogs,
      correlationId,
      httpMethod: init?.method ?? request.method,
      httpStatus: 503,
      latencyMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : "ProxyFetchError",
      errorMessage:
        error instanceof Error ? error.message : "Proxy request failed",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return buildJsonErrorResponse({
      error: unavailableError,
      message: unavailableMessage,
      status: 503,
      correlationId,
    });
  }
}
