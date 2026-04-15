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

type AnalyzerSkipReason =
  | "filtered"
  | "cooldown"
  | "duplicate_in_batch"
  | "analysis_failed";

type AnalyzerResult =
  | {
      skipped: true;
      reason: AnalyzerSkipReason;
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

type AnalyzerResponse = { status: 200 | 202; body: AnalyzerResult };

type AnalyzerContext = {
  config: ObservabilityConfig;
  requestId: string;
  correlationId: string;
  routeName: string;
};

function isSkippedResult(result: AnalyzerResult): result is Extract<AnalyzerResult, { skipped: true }> {
  return "skipped" in result;
}

function buildSkippedResult({
  reason,
  context,
  incidentKey,
  lastAnalyzedAt,
}: {
  reason: AnalyzerSkipReason;
  context: AnalyzerContext;
  incidentKey?: string;
  lastAnalyzedAt?: string;
}): AnalyzerResponse {
  return {
    status: 202,
    body: {
      skipped: true,
      reason,
      incident_key: incidentKey,
      last_analyzed_at: lastAnalyzedAt,
      correlation_id: context.correlationId,
    } satisfies AnalyzerResult,
  };
}

async function logAnalyzerFailure(params: {
  alert: GrafanaAlertPayload;
  context: AnalyzerContext;
  incidentKey: string;
  error: unknown;
}) {
  const { alert, context, incidentKey, error } = params;
  try {
    await logServerEvent({
      config: context.config,
      channel: "analyzer",
      level: "error",
      signalType: "pipeline_event",
      component: "llm-analyzer",
      route: context.routeName,
      requestId: context.requestId,
      correlationId: context.correlationId,
      errorName: error instanceof Error ? error.name : "AnalyzerBatchError",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unexpected batched analyzer failure",
      context: {
        incidentKey,
        alertTitle: alert.title,
        route: alert.labels.route,
        component: alert.labels.component,
      },
    });
  } catch (loggingError) {
    console.error(
      "[observability/analyzer] failed to log isolated batch failure",
      loggingError,
    );
  }
}

async function analyzeAlert({
  alert,
  context,
  incidentKey,
  skipPolicyCheck = false,
}: {
  alert: GrafanaAlertPayload;
  context: AnalyzerContext;
  incidentKey?: string;
  skipPolicyCheck?: boolean;
}): Promise<AnalyzerResponse> {
  const config = context.config;
  if (!skipPolicyCheck && !shouldAnalyzeAlert(alert)) {
    return buildSkippedResult({
      reason: "filtered",
      context,
    });
  }

  const resolvedIncidentKey = incidentKey ?? buildIncidentKey(alert);
  const cooldown = await findRecentIncidentCooldown({
    config,
    incidentKey: resolvedIncidentKey,
  });

  if (cooldown.skip) {
    return buildSkippedResult({
      reason: "cooldown",
      context,
      incidentKey: resolvedIncidentKey,
      lastAnalyzedAt: cooldown.lastAnalyzedAt,
    });
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
        incidentKey: resolvedIncidentKey,
        llmMode: config.llmMode ?? "direct",
        llmProvider: config.llmProvider ?? "upstage",
      },
    });
  }

  try {
    const formatted = formatDiscordIncidentMessage({
      alert,
      incidentKey: resolvedIncidentKey,
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
        incidentKey: resolvedIncidentKey,
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
      incidentKey: resolvedIncidentKey,
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
      incident_key: resolvedIncidentKey,
      correlation_id: context.correlationId,
    } satisfies AnalyzerResult,
  };
}

async function analyzeAlertSafely(params: {
  alert: GrafanaAlertPayload;
  context: AnalyzerContext;
  incidentKey: string;
}) {
  try {
    return await analyzeAlert({
      ...params,
      skipPolicyCheck: true,
    });
  } catch (error) {
    await logAnalyzerFailure({
      ...params,
      error,
    });

    return buildSkippedResult({
      reason: "analysis_failed",
      context: params.context,
      incidentKey: params.incidentKey,
    });
  }
}

async function analyzeAlertBatch(params: {
  alerts: GrafanaAlertPayload[];
  context: AnalyzerContext;
}) {
  const incidentTasks = new Map<string, Promise<AnalyzerResponse>>();

  return Promise.all(
    params.alerts.map(async (alert) => {
      if (!shouldAnalyzeAlert(alert)) {
        return buildSkippedResult({
          reason: "filtered",
          context: params.context,
        });
      }

      const incidentKey = buildIncidentKey(alert);
      const existingTask = incidentTasks.get(incidentKey);
      if (existingTask) {
        const existingResult = await existingTask;
        if (
          isSkippedResult(existingResult.body) &&
          existingResult.body.reason === "analysis_failed"
        ) {
          return existingResult;
        }

        return buildSkippedResult({
          reason: "duplicate_in_batch",
          context: params.context,
          incidentKey,
        });
      }

      const task = analyzeAlertSafely({
        alert,
        context: params.context,
        incidentKey,
      });
      incidentTasks.set(incidentKey, task);
      return task;
    }),
  );
}

export async function POST(request: Request) {
  return observeRoute(request, "observability/analyzer", async (context) => {
    const alerts = parseGrafanaAlertPayloads(await request.json()) as GrafanaAlertPayload[];

    if (alerts.length === 1) {
      const [alert] = alerts;
      const result = alert ? await analyzeAlert({ alert, context }) : undefined;
      return NextResponse.json(result?.body, { status: result?.status });
    }

    const results = await analyzeAlertBatch({ alerts, context });
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
