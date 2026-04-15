import { proxyToBackendWithObservability } from "@/app/api/_shared/backend-proxy";
import { observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/assembly/v1/members?region=...&district=...
 * 브라우저 → Next → WOOGOOK_BACKEND_BASE_URL(woogook-backend FastAPI)로 그대로 전달
 */

export async function GET(request: Request) {
  return observeRoute(request, "assembly/v1/members", async () => {
    const url = new URL(request.url);
    const pathWithQuery = `/api/assembly/v1/members${url.search}`;
    return proxyToBackendWithObservability({
      request,
      path: pathWithQuery,
      observableRoute: "assembly/v1/members",
      missingBackendMessage:
        "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
      unavailableMessage:
        "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
      unavailableError: "Assembly backend unavailable",
    });
  });
}
