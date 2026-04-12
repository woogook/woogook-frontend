import { proxyToBackend } from "../_shared";
import { observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return observeRoute(request, "local-election/chat/conversations", async () => {
    const body = await request.text();

    return proxyToBackend(request, "/api/local-election/v1/chat/conversations", {
      method: "POST",
      body,
    });
  });
}
