import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  buildDatabaseUnavailableResponse,
  isDatabaseUnavailableError,
} from "@/lib/pg-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();

  if (!city) {
    return NextResponse.json({ error: "city is required" }, { status: 400 });
  }

  try {
    const result = await pool.query<{ sigungu_name: string | null }>(
      `
        select distinct sigungu_name
        from local_election_contest
        where city_name_canonical = $1
          and sigungu_name is not null
        order by sigungu_name;
      `,
      [city],
    );

    const sgun = result.rows.map((r) => r.sigungu_name).filter(Boolean) as string[];
    return NextResponse.json({ sigungu: sgun });
  } catch (error) {
    console.error("[regions/sigungu] error", error);
    if (isDatabaseUnavailableError(error)) {
      return buildDatabaseUnavailableResponse("sigungu");
    }
    return NextResponse.json({ error: "Failed to load sigungu" }, { status: 500 });
  }
}
