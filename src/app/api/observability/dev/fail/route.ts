import { NextResponse } from "next/server";

import { logServerEvent, observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseStatus(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 400 && parsed <= 599 ? parsed : 503;
}

export async function GET(request: Request) {
  return observeRoute(request, "observability/dev/fail", async (context) => {
    if (context.config.environment !== "local") {
      return NextResponse.json(
        { error: "Not Found", message: "This route is only available in local mode." },
        { status: 404, headers: { "x-correlation-id": context.correlationId } },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = parseStatus(searchParams.get("status"));
    const reason =
      searchParams.get("reason") ?? "Synthetic observability failure for alert verification";

    await logServerEvent({
      config: context.config,
      level: "error",
      signalType: "server_error",
      component: "next-api",
      route: context.routeName,
      requestId: context.requestId,
      correlationId: context.correlationId,
      httpMethod: request.method,
      httpStatus: status,
      errorName: "SyntheticObservabilityError",
      errorMessage: reason,
      tags: ["synthetic-failure"],
    });

    return NextResponse.json(
      {
        error: "Synthetic observability failure",
        message: reason,
        status,
        correlation_id: context.correlationId,
      },
      { status, headers: { "x-correlation-id": context.correlationId } },
    );
  });
}
