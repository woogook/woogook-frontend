import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { citiesResponseSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await pool.query<{ city_name_canonical: string }>(
      `
        select distinct city_name_canonical
        from local_election_contest
        where city_name_canonical is not null
        order by city_name_canonical;
      `,
    );

    const cities = result.rows.map((r) => r.city_name_canonical);
    return NextResponse.json(citiesResponseSchema.parse({ cities }));
  } catch (error) {
    console.error("[regions/cities] error", error);
    return NextResponse.json({ error: "Failed to load cities" }, { status: 500 });
  }
}
