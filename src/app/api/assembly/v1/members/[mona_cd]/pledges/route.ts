import { proxyToBackend } from "@/app/api/local-election/v1/chat/_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/assembly/v1/members/:mona_cd/pledges?category=...[&limit=...] -> FastAPI
export async function GET(
  request: Request,
  context: { params: Promise<{ mona_cd: string }> },
) {
  const { mona_cd: monaCdRaw } = await context.params;
  const monaCd = encodeURIComponent(monaCdRaw);
  const url = new URL(request.url);
  return proxyToBackend(`/api/assembly/v1/members/${monaCd}/pledges${url.search}`);
}
