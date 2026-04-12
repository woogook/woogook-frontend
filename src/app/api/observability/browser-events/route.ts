import { NextResponse } from "next/server";

import { browserEventBatchSchema } from "@/lib/observability/contracts";
import { recordBrowserEventMetric } from "@/lib/observability/metrics";
import { logServerEvent, observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return observeRoute(request, "observability/browser-events", async (context) => {
    const payload = browserEventBatchSchema.parse(await request.json());

    for (const event of payload.events) {
      recordBrowserEventMetric({
        signalType: event.signalType,
        level: event.level,
      });
      await logServerEvent({
        channel: "browser",
        config: context.config,
        timestamp: event.timestamp,
        level: event.level,
        signalType: event.signalType,
        component: "browser",
        route: event.route,
        sessionId: payload.sessionId,
        requestId: context.requestId,
        correlationId: event.correlationId ?? context.correlationId,
        userAction: event.userAction,
        errorName: event.errorName,
        errorMessage: event.errorMessage,
        stack: event.stack,
        httpMethod: event.httpMethod,
        httpStatus: event.httpStatus,
        latencyMs: event.latencyMs,
        context: event.context,
      });
    }

    return NextResponse.json({
      accepted: payload.events.length,
      correlation_id: context.correlationId,
    });
  });
}
