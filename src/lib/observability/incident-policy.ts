import { readRecentObservabilityEvents } from "@/lib/observability/local-file";
import type { GrafanaAlertPayload, IncidentSummary } from "@/lib/observability/analyzer";
import type { ObservabilityConfig } from "@/lib/observability/config";
import type { ObservabilityEvent } from "@/lib/observability/types";

type FindRecentIncidentCooldownParams = {
  config?: ObservabilityConfig;
  incidentKey: string;
  recentEvents?: ObservabilityEvent[];
  cooldownSeconds?: number;
  now?: Date;
};

export function shouldAnalyzeAlert(alert: GrafanaAlertPayload) {
  const team = alert.labels.team?.trim().toLowerCase();
  const severity = alert.labels.severity?.trim().toLowerCase();
  const component = alert.labels.component?.trim().toLowerCase();
  const signalType = alert.labels.signal_type?.trim().toLowerCase();
  const llmAnalysis = alert.labels.llm_analysis?.trim().toLowerCase();

  return (
    alert.status === "firing" &&
    team === "frontend-observability" &&
    severity === "error" &&
    llmAnalysis !== "disabled" &&
    component !== "llm-analyzer" &&
    signalType !== "pipeline_event" &&
    signalType !== "analysis_result"
  );
}

export function buildIncidentKey(alert: GrafanaAlertPayload) {
  const alertName = alert.labels.alertname ?? alert.title;
  const route = alert.labels.route ?? "unknown-route";
  const component = alert.labels.component ?? "unknown-component";
  const environment = alert.labels.environment ?? "unknown-environment";
  return [alertName, route, component, environment].join("|");
}

function findRecentIncidentCooldownFromEvents(params: {
  incidentKey: string;
  recentEvents: ObservabilityEvent[];
  cooldownSeconds: number;
  now: Date;
}) {
  const thresholdMs = params.now.getTime() - params.cooldownSeconds * 1_000;
  const latest = params.recentEvents
    .filter(
      (event) =>
        event.signalType === "analysis_result" &&
        event.component === "llm-analyzer" &&
        event.context?.incidentKey === params.incidentKey,
    )
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))[0];

  if (!latest) {
    return { skip: false as const, lastAnalyzedAt: undefined };
  }

  if (Date.parse(latest.timestamp) >= thresholdMs) {
    return { skip: true as const, lastAnalyzedAt: latest.timestamp };
  }

  return { skip: false as const, lastAnalyzedAt: latest.timestamp };
}

export async function findRecentIncidentCooldown({
  config,
  incidentKey,
  recentEvents,
  cooldownSeconds,
  now = new Date(),
}: FindRecentIncidentCooldownParams) {
  const effectiveCooldownSeconds = cooldownSeconds ?? config?.llmCooldownSeconds ?? 0;
  if (effectiveCooldownSeconds <= 0) {
    return { skip: false as const, lastAnalyzedAt: undefined };
  }

  const events =
    recentEvents ??
    (config
      ? await readRecentObservabilityEvents({
          rootDir: config.localRootDir,
          maxEvents: 200,
        })
      : []);

  return findRecentIncidentCooldownFromEvents({
    incidentKey,
    recentEvents: events,
    cooldownSeconds: effectiveCooldownSeconds,
    now,
  });
}

export function filterIncidentEvents(events: ObservabilityEvent[]) {
  return events.filter(
    (event) =>
      event.component !== "llm-analyzer" &&
      event.signalType !== "analysis_result" &&
      event.signalType !== "pipeline_event",
  );
}

export function mergeIncidentSummary(
  baselineSummary: IncidentSummary,
  candidate: Partial<IncidentSummary> | null | undefined,
): IncidentSummary {
  if (!candidate) {
    return baselineSummary;
  }

  return {
    headline: candidate.headline ?? baselineSummary.headline,
    impactSummary: candidate.impactSummary ?? baselineSummary.impactSummary,
    rootCauseCandidates:
      candidate.rootCauseCandidates?.length
        ? candidate.rootCauseCandidates
        : baselineSummary.rootCauseCandidates,
    nextActions:
      candidate.nextActions?.length
        ? candidate.nextActions
        : baselineSummary.nextActions,
    confidence: candidate.confidence ?? baselineSummary.confidence,
  };
}
