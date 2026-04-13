import { proxyToBackend } from "@/app/api/local-election/v1/chat/_shared";
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
    return proxyToBackend(request, pathWithQuery);
  });
}
