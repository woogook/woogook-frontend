import { NextResponse } from "next/server";
import { relayLocalElectionToBackend } from "@/app/api/_shared/local-election-relay";
import { buildBackendPath } from "@/lib/local-election-backend";
import { cityQuerySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = cityQuerySchema.safeParse({
    city: searchParams.get("city"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "city is required" }, { status: 400 });
  }

  const { city } = parsed.data;
  return relayLocalElectionToBackend(
    buildBackendPath("/api/local-election/v1/regions/sigungu", {
      city_name_canonical: city,
    }),
  );
}
