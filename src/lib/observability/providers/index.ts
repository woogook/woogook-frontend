import type { IncidentSummary } from "@/lib/observability/analyzer";
import { fetchWithTimeout } from "@/lib/observability/http";
import { mergeIncidentSummary } from "@/lib/observability/incident-policy";
import type { LlmEnhancementParams } from "@/lib/observability/providers/types";
import { invokeUpstageIncidentSummary } from "@/lib/observability/providers/upstage";

function buildIncidentPrompt({
  alert,
  baselineSummary,
  recentEvents,
}: Pick<LlmEnhancementParams, "alert" | "baselineSummary" | "recentEvents">) {
  return [
    "Alert payload:",
    JSON.stringify(alert, null, 2),
    "",
    "Baseline summary:",
    JSON.stringify(baselineSummary, null, 2),
    "",
    "Recent events:",
    JSON.stringify(recentEvents.slice(0, 10), null, 2),
  ].join("\n");
}

async function invokeRelayWebhook(params: LlmEnhancementParams) {
  const { config, alert, baselineSummary, recentEvents } = params;
  if (!config.llmWebhookUrl) {
    return baselineSummary;
  }

  const response = await fetchWithTimeout(
    config.llmWebhookUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        alert,
        summary: baselineSummary,
        recentEvents,
      }),
      cache: "no-store",
    },
    config.outboundTimeoutMs,
  );

  if (!response.ok) {
    throw new Error(`LLM relay webhook failed with status ${response.status}`);
  }

  const candidate = (await response.json().catch(() => null)) as
    | Partial<IncidentSummary>
    | null;
  return mergeIncidentSummary(baselineSummary, candidate);
}

export async function enhanceIncidentSummary(
  params: LlmEnhancementParams,
): Promise<IncidentSummary> {
  const { config, baselineSummary } = params;
  if ((config.llmMode ?? "direct") === "relay") {
    return invokeRelayWebhook(params);
  }

  if ((config.llmProvider ?? "upstage") !== "upstage") {
    return baselineSummary;
  }

  if (!config.llmApiKey || !config.llmApiUrl || !config.llmModel) {
    return baselineSummary;
  }

  const candidate = await invokeUpstageIncidentSummary({
    apiKey: config.llmApiKey,
    apiUrl: config.llmApiUrl,
    model: config.llmModel,
    timeoutMs: config.outboundTimeoutMs,
    prompt: buildIncidentPrompt(params),
  });

  return mergeIncidentSummary(baselineSummary, candidate);
}
