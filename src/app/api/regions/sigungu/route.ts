import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { logServerEvent, observeRoute } from "@/lib/observability/server";
import {
  buildDatabaseUnavailableResponse,
  isDatabaseUnavailableError,
} from "@/lib/pg-error";
import { cityQuerySchema, sigunguResponseSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return observeRoute(request, "regions/sigungu", async (context) => {
    const { searchParams } = new URL(request.url);
    const parsed = cityQuerySchema.safeParse({
      city: searchParams.get("city"),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "city is required" }, { status: 400 });
    }

    try {
      const { city } = parsed.data;
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
      return NextResponse.json(sigunguResponseSchema.parse({ sigungu: sgun }));
    } catch (error) {
      await logServerEvent({
        level: "error",
        signalType: "server_error",
        component: "next-api",
        route: context.routeName,
        requestId: context.requestId,
        correlationId: context.correlationId,
        httpMethod: request.method,
        errorName: error instanceof Error ? error.name : "SigunguQueryError",
        errorMessage:
          error instanceof Error ? error.message : "Failed to load sigungu",
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (isDatabaseUnavailableError(error)) {
        return buildDatabaseUnavailableResponse("sigungu");
      }
      return NextResponse.json({ error: "Failed to load sigungu" }, { status: 500 });
    }
  });
}
