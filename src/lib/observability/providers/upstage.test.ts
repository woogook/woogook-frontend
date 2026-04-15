import { describe, expect, it, vi } from "vitest";

import { invokeUpstageIncidentSummary } from "@/lib/observability/providers/upstage";

describe("invokeUpstageIncidentSummary", () => {
  it("parses an OpenAI-compatible Upstage chat completion response", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  headline: "[local] next-api incident",
                  impactSummary: "API 5xx가 감지되었습니다.",
                  rootCauseCandidates: ["backend unavailable"],
                  nextActions: ["check backend logs"],
                  confidence: "high",
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const summary = await invokeUpstageIncidentSummary({
      apiKey: "up_test",
      apiUrl: "https://api.upstage.ai/v1/chat/completions",
      model: "solar-pro-2",
      timeoutMs: 5_000,
      prompt: "Summarize this incident.",
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const requestBody = JSON.parse(
      String(fetchSpy.mock.calls[0]?.[1]?.body ?? "{}"),
    ) as {
      messages?: Array<{ role?: string; content?: string }>;
      response_format?: { type?: string };
    };
    expect(requestBody.response_format).toEqual({ type: "json_object" });
    expect(requestBody.messages?.[0]?.content).toContain("Prefer Korean");
    expect(requestBody.messages?.[0]?.content).toContain("Do not force parenthetical bilingual pairs");
    expect(requestBody.messages?.[0]?.content).toContain("Avoid repetitive polite endings");
    expect(requestBody.messages?.[0]?.content).toContain("Wrap important technical terms in backticks");
    expect(summary.headline).toContain("incident");
    expect(summary.confidence).toBe("high");

    fetchSpy.mockRestore();
  });
});
