import { NextResponse } from "next/server";

import {
  buildIncidentSummary,
  type GrafanaAlertPayload,
  fetchRecentIncidentEvents,
} from "@/lib/observability/analyzer";
import { parseGrafanaAlertPayloads } from "@/lib/observability/contracts";
import {
  formatDiscordIncidentMessage,
  sendDiscordMessage,
} from "@/lib/observability/discord";
import {
  buildIncidentKey,
  filterIncidentEvents,
  findRecentIncidentCooldown,
  shouldAnalyzeAlert,
} from "@/lib/observability/incident-policy";
import type { ObservabilityConfig } from "@/lib/observability/config";
import { enhanceIncidentSummary } from "@/lib/observability/providers";
import { logServerEvent, observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getActionableEvents(recentEvents: Awaited<ReturnType<typeof fetchRecentIncidentEvents>>) {
  const filtered = filterIncidentEvents(recentEvents);
  return filtered.length > 0 ? filtered : recentEvents;
}

type AnalyzerResult =
  | {
      skipped: true;
      reason: "filtered" | "cooldown";
      correlation_id: string;
      incident_key?: string;
      last_analyzed_at?: string;
    }
  | {
      summary: Awaited<ReturnType<typeof buildIncidentSummary>>;
      recent_event_count: number;
      incident_key: string;
      correlation_id: string;
    };

type AnalyzerContext = {
  config: ObservabilityConfig;
  requestId: string;
  correlationId: string;
  routeName: string;
};

async function analyzeAlert({
  alert,
  context,
}: {
  alert: GrafanaAlertPayload;
  context: AnalyzerContext;
}): Promise<{ status: 200 | 202; body: AnalyzerResult }> {
  const config = context.config;
  if (!shouldAnalyzeAlert(alert)) {
    return {
      status: 202,
      body: {
        skipped: true,
        reason: "filtered",
        correlation_id: context.correlationId,
      } satisfies AnalyzerResult,
    };
  }

  const incidentKey = buildIncidentKey(alert);
  const cooldown = await findRecentIncidentCooldown({
    config,
    incidentKey,
  });

  if (cooldown.skip) {
    return {
      status: 202,
      body: {
        skipped: true,
        reason: "cooldown",
        incident_key: incidentKey,
        last_analyzed_at: cooldown.lastAnalyzedAt,
        correlation_id: context.correlationId,
      } satisfies AnalyzerResult,
    };
  }

  const recentEvents = await fetchRecentIncidentEvents({
    alert,
    config,
    maxEvents: 30,
  });
  const actionableEvents = getActionableEvents(recentEvents);

  let summary = buildIncidentSummary(alert, actionableEvents);

  try {
    summary = await enhanceIncidentSummary({
      alert,
      baselineSummary: summary,
      config,
      recentEvents: actionableEvents,
    });
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
      errorName: error instanceof Error ? error.name : "LlmProviderError",
      errorMessage:
        error instanceof Error ? error.message : "LLM provider invocation failed",
      context: {
        incidentKey,
        llmMode: config.llmMode ?? "direct",
        llmProvider: config.llmProvider ?? "upstage",
      },
    });
  }

  try {
    const formatted = formatDiscordIncidentMessage({
      alert,
      incidentKey,
      recentEventCount: actionableEvents.length,
      summary,
    });
    await sendDiscordMessage({
      url: config.discordWebhookUrl,
      content: formatted,
      timeoutMs: config.outboundTimeoutMs,
    });
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
        error instanceof Error ? error.message : "Discord webhook notification failed",
      context: {
        incidentKey,
        alert,
        summary,
        recentEventCount: actionableEvents.length,
      },
    });
  }

  await logServerEvent({
    config,
    channel: "analyzer",
    level: "info",
    signalType: "analysis_result",
    component: "llm-analyzer",
    route: alert.labels.route,
    requestId: context.requestId,
    correlationId: context.correlationId,
    context: {
      incidentKey,
      alertTitle: alert.title,
      summary,
      recentEventCount: actionableEvents.length,
      llmMode: config.llmMode ?? "direct",
      llmProvider: config.llmProvider ?? "upstage",
    },
  });

  return {
    status: 200,
    body: {
      summary,
      recent_event_count: actionableEvents.length,
      incident_key: incidentKey,
      correlation_id: context.correlationId,
    } satisfies AnalyzerResult,
  };
}

export async function POST(request: Request) {
  return observeRoute(request, "observability/analyzer", async (context) => {
    const alerts = parseGrafanaAlertPayloads(await request.json()) as GrafanaAlertPayload[];
    const results: Array<{ status: 200 | 202; body: AnalyzerResult }> = [];

    for (const alert of alerts) {
      results.push(await analyzeAlert({ alert, context }));
    }

    if (results.length === 1) {
      const [result] = results;
      return NextResponse.json(result?.body, { status: result?.status });
    }

    const hasProcessed = results.some((result) => result.status === 200);
    return NextResponse.json(
      {
        results: results.map((result) => result.body),
        correlation_id: context.correlationId,
      },
      { status: hasProcessed ? 200 : 202 },
    );
  });
}
