import { proxyToBackend } from "@/app/api/local-election/v1/chat/_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/assembly/v1/members/:mona_cd/pledge-summary -> FastAPI
export async function GET(
  request: Request,
  context: { params: Promise<{ mona_cd: string }> },
) {
  const { mona_cd: monaCdRaw } = await context.params;
  const monaCd = encodeURIComponent(monaCdRaw);
  return proxyToBackend(
    request,
    `/api/assembly/v1/members/${monaCd}/pledge-summary`,
  );
}
