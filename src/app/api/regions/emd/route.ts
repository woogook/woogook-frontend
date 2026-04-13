import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { logServerEvent, observeRoute } from "@/lib/observability/server";
import {
  buildDatabaseUnavailableResponse,
  isDatabaseUnavailableError,
} from "@/lib/pg-error";
import { citySigunguQuerySchema, emdResponseSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return observeRoute(request, "regions/emd", async (context) => {
    const { searchParams } = new URL(request.url);
    const parsed = citySigunguQuerySchema.safeParse({
      city: searchParams.get("city"),
      sigungu: searchParams.get("sigungu"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "city and sigungu are required" },
        { status: 400 },
      );
    }

    try {
      const { city, sigungu } = parsed.data;
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
      return NextResponse.json(emdResponseSchema.parse({ emd }));
    } catch (error) {
      await logServerEvent({
        level: "error",
        signalType: "server_error",
        component: "next-api",
        route: context.routeName,
        requestId: context.requestId,
        correlationId: context.correlationId,
        httpMethod: request.method,
        errorName: error instanceof Error ? error.name : "EmdQueryError",
        errorMessage:
          error instanceof Error ? error.message : "Failed to load emd",
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (isDatabaseUnavailableError(error)) {
        return buildDatabaseUnavailableResponse("emd");
      }
      return NextResponse.json({ error: "Failed to load emd" }, { status: 500 });
    }
  });
}
