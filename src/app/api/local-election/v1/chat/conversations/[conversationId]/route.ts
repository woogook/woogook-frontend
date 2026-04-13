import { proxyToBackend } from "../../_shared";
import { observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  return observeRoute(request, "local-election/chat/conversations/[conversationId]", async () => {
    const { conversationId } = await context.params;
    const search = new URL(request.url).search;

    return proxyToBackend(
      request,
      `/api/local-election/v1/chat/conversations/${encodeURIComponent(conversationId)}${search}`,
      {
        method: "GET",
      },
    );
  });
}
