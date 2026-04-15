import { NextResponse } from "next/server";
import { relayLocalElectionToBackend } from "@/app/api/_shared/local-election-relay";
import { buildBackendPath } from "@/lib/local-election-backend";
import {
  ballotsSearchParamsSchema,
} from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = ballotsSearchParamsSchema.safeParse({
    city: searchParams.get("city"),
    sigungu: searchParams.get("sigungu"),
    emd: searchParams.get("emd"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "city and sigungu are required",
        message: "시/도와 구/군/시는 필수입니다.",
      },
      { status: 400 },
    );
  }

  const { city, sigungu, emd } = parsed.data;
  return relayLocalElectionToBackend(
    buildBackendPath("/api/local-election/v1/ballots", {
      city_name_canonical: city,
      sigungu_name: sigungu,
      emd_name: emd,
    }),
  );
}
