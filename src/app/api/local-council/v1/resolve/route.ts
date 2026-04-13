import { NextResponse } from "next/server";

import { proxyLocalCouncilToBackend } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
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
  return proxyLocalCouncilToBackend(`/api/local-council/v1/resolve?${query.toString()}`);
}
