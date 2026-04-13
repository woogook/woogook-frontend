import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.WOOGOOK_BACKEND_BASE_URL?.trim().replace(
  /\/$/,
  "",
);

export function buildMissingLocalCouncilBackendResponse() {
  return NextResponse.json(
    {
      error: "Missing WOOGOOK_BACKEND_BASE_URL",
      message: "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    },
    { status: 503 },
  );
}

export async function proxyLocalCouncilToBackend(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (!BACKEND_BASE_URL) {
    return buildMissingLocalCouncilBackendResponse();
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
    });

    const body = await response.text();
    const headers = new Headers();
    headers.set(
      "content-type",
      response.headers.get("content-type") || "application/json; charset=utf-8",
    );

    return new Response(body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("[local-council/proxy] error", error);
    return NextResponse.json(
      {
        error: "Local council backend unavailable",
        message: "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 503 },
    );
  }
}
