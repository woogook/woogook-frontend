import { proxyToBackendWithObservability } from "@/app/api/_shared/backend-proxy";
import { observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/assembly/v1/members/:mona_cd/pledges?category=...[&limit=...] -> FastAPI
export async function GET(
  request: Request,
  context: { params: Promise<{ mona_cd: string }> },
) {
  return observeRoute(
    request,
    "assembly/v1/members/[mona_cd]/pledges",
    async () => {
      const { mona_cd: monaCdRaw } = await context.params;
      const monaCd = encodeURIComponent(monaCdRaw);
      const url = new URL(request.url);
      return proxyToBackendWithObservability({
        request,
        path: `/api/assembly/v1/members/${monaCd}/pledges${url.search}`,
        observableRoute: "assembly/v1/members/[mona_cd]/pledges",
        missingBackendMessage:
          "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
        unavailableMessage:
          "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
        unavailableError: "Assembly backend unavailable",
      });
    },
  );
}
