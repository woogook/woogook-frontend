import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const sigungu = searchParams.get("sigungu")?.trim();

  if (!city || !sigungu) {
    return NextResponse.json({ error: "city and sigungu are required" }, { status: 400 });
  }

  try {
    const result = await pool.query<{ emd_name: string | null }>(
      `
        select distinct e.emd_name
        from local_election_contest_emd e
        join local_election_contest c on c.contest_id = e.contest_id
        where c.city_name_canonical = $1
          and c.sigungu_name = $2
          and e.emd_name is not null
        order by e.emd_name;
      `,
      [city, sigungu],
    );

    const emd = result.rows.map((r) => r.emd_name).filter(Boolean) as string[];
    return NextResponse.json({ emd });
  } catch (error) {
    console.error("[regions/emd] error", error);
    return NextResponse.json({ error: "Failed to load emd" }, { status: 500 });
  }
}
