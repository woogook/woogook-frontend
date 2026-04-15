import { proxyToBackendWithObservability } from "@/app/api/_shared/backend-proxy";

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
    missingBackendMessage:
      "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    unavailableMessage:
      "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    unavailableError: "Local council backend unavailable",
  });
}
