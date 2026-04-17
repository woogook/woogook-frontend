import { proxyToBackendWithObservability } from "@/app/api/_shared/backend-proxy";

const LOCAL_COUNCIL_PROXY_TIMEOUT_MS = 2000;

export async function proxyLocalCouncilToBackend(
  request: Request,
  path: string,
  options?: {
    init?: RequestInit;
    observableRoute?: string;
  },
): Promise<Response> {
  return proxyToBackendWithObservability({
    request,
    path,
    init: options?.init,
    observableRoute: options?.observableRoute,
    timeoutMs: LOCAL_COUNCIL_PROXY_TIMEOUT_MS,
    missingBackendMessage:
      "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    unavailableMessage:
      "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    unavailableError: "Local council backend unavailable",
  });
}
