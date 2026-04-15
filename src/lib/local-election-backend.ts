export type BackendRelayErrorBody = {
  error: string;
  message: string;
};

type BackendRelayOptions = {
  path: string;
  init?: RequestInit;
  baseUrl?: string | null;
  missingBaseUrlBody?: BackendRelayErrorBody;
  unavailableBody: BackendRelayErrorBody;
  errorTag?: string;
};

function buildJsonResponse(body: BackendRelayErrorBody, status: number): Response {
  return Response.json(body, { status });
}

function normalizeBackendBaseUrl(baseUrl?: string | null): string | null {
  const trimmed = baseUrl?.trim().replace(/\/$/, "");
  return trimmed ? trimmed : null;
}

export function buildBackendPath(
  path: string,
  query?: Record<string, string | null | undefined>,
): string {
  if (!query) {
    return path;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    searchParams.set(key, value);
  }

  const search = searchParams.toString();
  return search ? `${path}?${search}` : path;
}

export async function relayToBackend({
  path,
  init,
  baseUrl = process.env.WOOGOOK_BACKEND_BASE_URL,
  missingBaseUrlBody,
  unavailableBody,
  errorTag = "[backend-relay] error",
}: BackendRelayOptions): Promise<Response> {
  const normalizedBaseUrl = normalizeBackendBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    return buildJsonResponse(
      missingBaseUrlBody ?? {
        error: "Missing WOOGOOK_BACKEND_BASE_URL",
        message: "백엔드 연결 정보가 아직 준비되지 않았습니다.",
      },
      503,
    );
  }

  try {
    const response = await fetch(`${normalizedBaseUrl}${path}`, {
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
    console.error(errorTag, error);
    return buildJsonResponse(unavailableBody, 503);
  }
}

async function relayBackendResponse(response: Response): Promise<Response> {
  const body = await response.text();
  const headers = new Headers();
  const contentType = response.headers.get("content-type");

  headers.set("content-type", contentType ?? "application/json; charset=utf-8");

  return new Response(body, {
    status: response.status,
    headers,
  });
}
