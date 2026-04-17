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
  timeoutMs?: number;
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
  timeoutMs,
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

  const upstreamSignal = init?.signal;
  const timeoutController =
    typeof timeoutMs === "number" && timeoutMs > 0 ? new AbortController() : null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let abortFromUpstream: (() => void) | null = null;

  if (timeoutController) {
    abortFromUpstream = () => {
      timeoutController.abort(
        upstreamSignal?.reason instanceof Error
          ? upstreamSignal.reason
          : new Error("upstream request aborted"),
      );
    };

    if (upstreamSignal?.aborted) {
      abortFromUpstream();
    } else if (upstreamSignal) {
      upstreamSignal.addEventListener("abort", abortFromUpstream, {
        once: true,
      });
    }

    timeoutId = setTimeout(() => {
      timeoutController.abort(
        new Error(`backend relay timed out after ${timeoutMs}ms`),
      );
    }, timeoutMs);
  }

  try {
    const response = await fetch(`${normalizedBaseUrl}${path}`, {
      ...init,
      cache: "no-store",
      signal: timeoutController?.signal ?? upstreamSignal,
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
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (upstreamSignal && abortFromUpstream) {
      upstreamSignal.removeEventListener("abort", abortFromUpstream);
    }
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
