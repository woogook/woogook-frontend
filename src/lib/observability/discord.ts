import type { IncidentSummary, GrafanaAlertPayload } from "@/lib/observability/analyzer";
import { fetchWithTimeout } from "@/lib/observability/http";

type FormatDiscordIncidentMessageParams = {
  alert: GrafanaAlertPayload;
  incidentKey: string;
  recentEventCount: number;
  summary: IncidentSummary;
};

export function formatDiscordIncidentMessage({
  alert,
  incidentKey,
  recentEventCount,
  summary,
}: FormatDiscordIncidentMessageParams) {
  return [
    `## ${summary.headline}`,
    "",
    `- alert: ${alert.title}`,
    `- route: ${alert.labels.route ?? "unknown"}`,
    `- component: ${alert.labels.component ?? "unknown"}`,
    `- confidence: ${summary.confidence}`,
    `- recent events: ${recentEventCount}`,
    `- incident key: ${incidentKey}`,
    "",
    `### 영향 요약`,
    summary.impactSummary,
    "",
    "### 원인 후보",
    ...summary.rootCauseCandidates.map((item) => `- ${item}`),
    "",
    "### 다음 액션",
    ...summary.nextActions.map((item) => `- ${item}`),
  ].join("\n");
}

export async function sendDiscordMessage(params: {
  url: string | undefined;
  content: string;
  timeoutMs: number;
}) {
  if (!params.url) {
    return;
  }

  const response = await fetchWithTimeout(
    params.url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: params.content }),
      cache: "no-store",
    },
    params.timeoutMs,
  );

  if (!response.ok) {
    throw new Error(`Discord webhook failed with status ${response.status}`);
  }
}
