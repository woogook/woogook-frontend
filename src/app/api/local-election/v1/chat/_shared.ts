import { NextResponse } from "next/server";

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
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl = buildBackendBaseUrl();
  if (!baseUrl) {
    return buildMissingBackendBaseUrlResponse();
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
    });

    return relayBackendResponse(response);
  } catch (error) {
    console.error("[local-election/chat-proxy] error", error);
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

  if (contentType) {
    headers.set("content-type", contentType);
  } else {
    headers.set("content-type", "application/json; charset=utf-8");
  }

  return new Response(body, {
    status: response.status,
    headers,
  });
}
