import { proxyLocalCouncilToBackend } from "../../_shared";
import { observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ personKey: string }> },
) {
  return observeRoute(
    request,
    "local-council/v1/persons/[personKey]",
    async () => {
      const { personKey } = await context.params;

      return proxyLocalCouncilToBackend(
        request,
        `/api/local-council/v1/persons/${encodeURIComponent(personKey)}`,
        {
          observableRoute: "local-council/v1/persons/[personKey]",
        },
      );
    },
  );
}
