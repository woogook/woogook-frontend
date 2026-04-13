import { proxyToBackend } from "../../../_shared";
import { observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  return observeRoute(
    request,
    "local-election/chat/conversations/[conversationId]/messages",
    async () => {
      const { conversationId } = await context.params;
      const body = await request.text();

      return proxyToBackend(
        request,
        `/api/local-election/v1/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          method: "POST",
          body,
        },
      );
    },
  );
}
