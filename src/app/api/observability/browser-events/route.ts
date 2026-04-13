import { NextResponse } from "next/server";

import { browserEventBatchSchema } from "@/lib/observability/contracts";
import { recordBrowserEventMetric } from "@/lib/observability/metrics";
import { logServerEvent, observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BROWSER_EVENT_BATCH_CONCURRENCY = 8;

export async function POST(request: Request) {
  return observeRoute(request, "observability/browser-events", async (context) => {
    const payload = browserEventBatchSchema.parse(await request.json());

    for (
      let start = 0;
      start < payload.events.length;
      start += BROWSER_EVENT_BATCH_CONCURRENCY
    ) {
      await Promise.all(
        payload.events
          .slice(start, start + BROWSER_EVENT_BATCH_CONCURRENCY)
          .map(async (event) => {
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
          }),
      );
    }

    return NextResponse.json({
      accepted: payload.events.length,
      correlation_id: context.correlationId,
    });
  });
}
