import { NextResponse } from "next/server";

import { CORRELATION_HEADER, getOrCreateCorrelationId } from "@/lib/observability/correlation";
import { logServerEvent } from "@/lib/observability/server";

const BACKEND_BASE_URL = process.env.WOOGOOK_BACKEND_BASE_URL?.trim().replace(
  /\/$/,
  "",
);

function buildBackendBaseUrl() {
  if (!BACKEND_BASE_URL) {
    return null;
  }

  return BACKEND_BASE_URL;
}

export function buildMissingBackendBaseUrlResponse() {
  return NextResponse.json(
    {
      error: "Missing WOOGOOK_BACKEND_BASE_URL",
      message: "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    },
    { status: 503 },
  );
}

export async function proxyToBackend(
  request: Request,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl = buildBackendBaseUrl();
  const correlationId = getOrCreateCorrelationId(new Headers(request.headers));
  if (!baseUrl) {
    await logServerEvent({
      level: "warn",
      signalType: "server_error",
      component: "proxy",
      route: path,
      correlationId,
      httpMethod: init?.method ?? request.method,
      httpStatus: 503,
      errorName: "MissingBackendBaseUrl",
      errorMessage: "WOOGOOK_BACKEND_BASE_URL is not configured",
    });
    return buildMissingBackendBaseUrlResponse();
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
      route: path,
      correlationId,
      httpMethod: init?.method ?? request.method,
      httpStatus: response.status,
      latencyMs: Date.now() - startedAt,
      tags: ["backend-proxy"],
    });
    return relayBackendResponse(response);
  } catch (error) {
    await logServerEvent({
      level: "error",
      signalType: "server_error",
      component: "proxy",
      route: path,
      correlationId,
      httpMethod: init?.method ?? request.method,
      httpStatus: 503,
      latencyMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : "ProxyFetchError",
      errorMessage:
        error instanceof Error ? error.message : "Proxy request failed",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Chat backend unavailable",
        message: "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 503 },
    );
  }
}

async function relayBackendResponse(response: Response): Promise<Response> {
  const body = await response.text();
  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  const correlationId = response.headers.get(CORRELATION_HEADER);

  if (contentType) {
    headers.set("content-type", contentType);
  } else {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  if (correlationId) {
    headers.set(CORRELATION_HEADER, correlationId);
  }

  return new Response(body, {
    status: response.status,
    headers,
  });
}
