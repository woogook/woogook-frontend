import { proxyToBackendWithObservability } from "@/app/api/_shared/backend-proxy";
import { observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/assembly/v1/members/:mona_cd/pledge-summary -> FastAPI
export async function GET(
  request: Request,
  context: { params: Promise<{ mona_cd: string }> },
) {
  return observeRoute(
    request,
    "assembly/v1/members/[mona_cd]/pledge-summary",
    async () => {
      const { mona_cd: monaCdRaw } = await context.params;
      const monaCd = encodeURIComponent(monaCdRaw);
      return proxyToBackendWithObservability({
        request,
        path: `/api/assembly/v1/members/${monaCd}/pledge-summary`,
        observableRoute: "assembly/v1/members/[mona_cd]/pledge-summary",
        missingBackendMessage:
          "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
        unavailableMessage:
          "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
        unavailableError: "Assembly backend unavailable",
      });
    },
  );
}
