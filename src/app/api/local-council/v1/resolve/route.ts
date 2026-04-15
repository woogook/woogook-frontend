import { NextResponse } from "next/server";

import { proxyLocalCouncilToBackend } from "../_shared";
import { observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return observeRoute(request, "local-council/v1/resolve", async () => {
    const url = new URL(request.url);
    const address = url.searchParams.get("address")?.trim();

    if (!address) {
      return NextResponse.json(
        {
          error: "address is required",
          message: "지역 정보가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const query = new URLSearchParams({ address });
    return proxyLocalCouncilToBackend(
      request,
      `/api/local-council/v1/resolve?${query.toString()}`,
      { observableRoute: "local-council/v1/resolve" },
    );
  });
}
