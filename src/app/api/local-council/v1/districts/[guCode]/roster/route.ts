import { proxyLocalCouncilToBackend } from "../../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ guCode: string }> },
) {
  const { guCode } = await context.params;

  return proxyLocalCouncilToBackend(
    `/api/local-council/v1/districts/${encodeURIComponent(guCode)}/roster`,
  );
}
