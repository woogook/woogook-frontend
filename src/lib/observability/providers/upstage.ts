import type { IncidentSummary } from "@/lib/observability/analyzer";
import { fetchWithTimeout } from "@/lib/observability/http";

type InvokeUpstageIncidentSummaryParams = {
  apiKey: string;
  apiUrl: string;
  model: string;
  timeoutMs: number;
  prompt: string;
};

type UpstageChatCompletionsPayload = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function extractJsonBlock(content: string) {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectStart = content.indexOf("{");
  const objectEnd = content.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return content.slice(objectStart, objectEnd + 1);
  }

  return content.trim();
}

function parseIncidentSummaryCandidate(content: string): Partial<IncidentSummary> {
  const candidate = JSON.parse(extractJsonBlock(content)) as Partial<IncidentSummary>;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Upstage response did not contain a valid JSON object");
  }
  return candidate;
}

export async function invokeUpstageIncidentSummary({
  apiKey,
  apiUrl,
  model,
  timeoutMs,
  prompt,
}: InvokeUpstageIncidentSummaryParams): Promise<Partial<IncidentSummary>> {
  const response = await fetchWithTimeout(
    apiUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You are an incident analysis assistant. Return JSON only with headline, impactSummary, rootCauseCandidates, nextActions, confidence.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      cache: "no-store",
    },
    timeoutMs,
  );

  if (!response.ok) {
    throw new Error(`Upstage direct call failed with status ${response.status}`);
  }

  const payload = (await response.json()) as UpstageChatCompletionsPayload;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Upstage response did not include message content");
  }

  return parseIncidentSummaryCandidate(content);
}
