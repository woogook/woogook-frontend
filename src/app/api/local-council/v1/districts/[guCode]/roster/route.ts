import { proxyLocalCouncilToBackend } from "../../../_shared";
import { observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ guCode: string }> },
) {
  return observeRoute(
    request,
    "local-council/v1/districts/[guCode]/roster",
    async () => {
      const { guCode } = await context.params;

      return proxyLocalCouncilToBackend(
        request,
        `/api/local-council/v1/districts/${encodeURIComponent(guCode)}/roster`,
        {
          observableRoute: "local-council/v1/districts/[guCode]/roster",
        },
      );
    },
  );
}
