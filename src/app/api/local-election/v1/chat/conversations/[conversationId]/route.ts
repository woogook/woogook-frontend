import { proxyToBackend } from "../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await context.params;
  const search = new URL(request.url).search;

  return proxyToBackend(
    `/api/local-election/v1/chat/conversations/${encodeURIComponent(conversationId)}${search}`,
    {
      method: "GET",
    },
  );
}
