import { NextResponse } from "next/server";

import {
  buildIncidentSummary,
  fetchRecentIncidentEvents,
  formatIncidentSummary,
} from "@/lib/observability/analyzer";
import { grafanaAlertPayloadSchema } from "@/lib/observability/contracts";
import { fetchWithTimeout } from "@/lib/observability/http";
import { logServerEvent, observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function maybeInvokeLlmWebhook(
  url: string | undefined,
  payload: Record<string, unknown>,
  timeoutMs: number,
) {
  if (!url) {
    return null;
  }

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
    timeoutMs,
  );

  if (!response.ok) {
    throw new Error(`LLM webhook failed with status ${response.status}`);
  }

  return response.json().catch(() => null);
}

async function maybeSendDiscord(
  url: string | undefined,
  content: string,
  timeoutMs: number,
) {
  if (!url) {
    return;
  }

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
      cache: "no-store",
    },
    timeoutMs,
  );

  if (!response.ok) {
    throw new Error(`Discord webhook failed with status ${response.status}`);
  }
}

export async function POST(request: Request) {
  return observeRoute(request, "observability/analyzer", async (context) => {
    const config = context.config;
    const payload = grafanaAlertPayloadSchema.parse(await request.json());
    const recentEvents = await fetchRecentIncidentEvents({
      alert: payload,
      config,
      maxEvents: 30,
    });

    let summary = buildIncidentSummary(payload, recentEvents);

    try {
      const llmResponse = await maybeInvokeLlmWebhook(
        config.llmWebhookUrl,
        {
          alert: payload,
          summary,
          recentEvents,
        },
        config.outboundTimeoutMs,
      );
      if (llmResponse && typeof llmResponse === "object") {
        const candidate = llmResponse as Partial<typeof summary>;
        summary = {
          headline: candidate.headline ?? summary.headline,
          rootCauseCandidates:
            candidate.rootCauseCandidates ?? summary.rootCauseCandidates,
          impactSummary: candidate.impactSummary ?? summary.impactSummary,
          nextActions: candidate.nextActions ?? summary.nextActions,
          confidence: candidate.confidence ?? summary.confidence,
        };
      }
    } catch (error) {
      await logServerEvent({
        config,
        channel: "analyzer",
        level: "error",
        signalType: "pipeline_event",
        component: "llm-analyzer",
        route: context.routeName,
        requestId: context.requestId,
        correlationId: context.correlationId,
        errorName: error instanceof Error ? error.name : "LlmWebhookError",
        errorMessage:
          error instanceof Error ? error.message : "LLM webhook invocation failed",
      });
    }

    const formatted = formatIncidentSummary(summary);

    try {
      await maybeSendDiscord(
        config.discordWebhookUrl,
        formatted,
        config.outboundTimeoutMs,
      );
    } catch (error) {
      await logServerEvent({
        config,
        channel: "analyzer",
        level: "error",
        signalType: "pipeline_event",
        component: "llm-analyzer",
        route: context.routeName,
        requestId: context.requestId,
        correlationId: context.correlationId,
        errorName: error instanceof Error ? error.name : "DiscordWebhookError",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Discord webhook notification failed",
      });
    }

    await logServerEvent({
      config,
      channel: "analyzer",
      level: "info",
      signalType: "analysis_result",
      component: "llm-analyzer",
      route: payload.labels.route,
      requestId: context.requestId,
      correlationId: context.correlationId,
      context: {
        alertTitle: payload.title,
        summary,
        recentEventCount: recentEvents.length,
      },
    });

    return NextResponse.json({
      summary,
      recent_event_count: recentEvents.length,
      correlation_id: context.correlationId,
    });
  });
}
