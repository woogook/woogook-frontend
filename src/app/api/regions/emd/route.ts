import { NextResponse } from "next/server";
import { relayLocalElectionRegionToBackend } from "@/app/api/_shared/local-election-relay";
import { buildBackendPath } from "@/lib/local-election-backend";
import { citySigunguQuerySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = citySigunguQuerySchema.safeParse({
    city: searchParams.get("city"),
    sigungu: searchParams.get("sigungu"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "city and sigungu are required" }, { status: 400 });
  }

  const { city, sigungu } = parsed.data;
  return relayLocalElectionRegionToBackend(
    buildBackendPath("/api/local-election/v1/regions/emd", {
      city_name_canonical: city,
      sigungu_name: sigungu,
    }),
  );
}
