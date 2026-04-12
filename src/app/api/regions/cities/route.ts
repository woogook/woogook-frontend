import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { observeRoute, logServerEvent } from "@/lib/observability/server";
import {
  buildDatabaseUnavailableResponse,
  isDatabaseUnavailableError,
} from "@/lib/pg-error";
import { citiesResponseSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return observeRoute(request, "regions/cities", async (context) => {
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
      await logServerEvent({
        level: "error",
        signalType: "server_error",
        component: "next-api",
        route: context.routeName,
        requestId: context.requestId,
        correlationId: context.correlationId,
        httpMethod: request.method,
        errorName: error instanceof Error ? error.name : "CitiesQueryError",
        errorMessage:
          error instanceof Error ? error.message : "Failed to load cities",
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (isDatabaseUnavailableError(error)) {
        return buildDatabaseUnavailableResponse("cities");
      }
      return NextResponse.json({ error: "Failed to load cities" }, { status: 500 });
    }
  });
}
