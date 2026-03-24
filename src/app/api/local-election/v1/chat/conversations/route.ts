import { proxyToBackend } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();

  return proxyToBackend("/api/local-election/v1/chat/conversations", {
    method: "POST",
    body,
  });
}
