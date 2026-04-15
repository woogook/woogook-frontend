import { describe, expect, it, vi } from "vitest";

import {
  buildIncidentKey,
  findRecentIncidentCooldown,
  shouldAnalyzeAlert,
} from "@/lib/observability/incident-policy";
import type { ObservabilityEvent } from "@/lib/observability/types";

describe("shouldAnalyzeAlert", () => {
  it("accepts firing frontend error alerts by default", () => {
    expect(
      shouldAnalyzeAlert({
        title: "FrontendApi5xxDetected",
        status: "firing",
        labels: {
          team: "frontend-observability",
          severity: "error",
          component: "next-api",
        },
      }),
    ).toBe(true);
  });

  it("rejects resolved, disabled, and analyzer self alerts", () => {
    expect(
      shouldAnalyzeAlert({
        title: "resolved",
        status: "resolved",
        labels: {
          team: "frontend-observability",
          severity: "error",
        },
      }),
    ).toBe(false);
    expect(
      shouldAnalyzeAlert({
        title: "disabled",
        status: "firing",
        labels: {
          team: "frontend-observability",
          severity: "error",
          llm_analysis: "disabled",
        },
      }),
    ).toBe(false);
    expect(
      shouldAnalyzeAlert({
        title: "self",
        status: "firing",
        labels: {
          team: "frontend-observability",
          severity: "error",
          component: "llm-analyzer",
        },
      }),
    ).toBe(false);
  });
});

describe("buildIncidentKey", () => {
  it("uses alertname, route, component, and environment to form a stable key", () => {
    expect(
      buildIncidentKey({
        title: "FrontendApi5xxDetected",
        status: "firing",
        labels: {
          alertname: "FrontendApi5xxDetected",
          route: "/api/assembly/v1/members",
          component: "next-api",
          environment: "local",
        },
      }),
    ).toBe(
      "FrontendApi5xxDetected|/api/assembly/v1/members|next-api|local",
    );
  });
});

describe("findRecentIncidentCooldown", () => {
  it("detects a recent analysis_result event for the same incident", async () => {
    const now = new Date("2026-04-15T06:00:00.000Z");
    const incidentKey =
      "FrontendApi5xxDetected|/api/assembly/v1/members|next-api|local";
    const recentEvents = [
      {
        timestamp: "2026-04-15T05:55:30.000Z",
        level: "info",
        signalType: "analysis_result",
        service: "woogook-frontend",
        component: "llm-analyzer",
        environment: "local",
        release: "release-1",
        context: {
          incidentKey,
        },
      } satisfies ObservabilityEvent,
    ];

    const result = await findRecentIncidentCooldown({
      incidentKey,
      recentEvents,
      cooldownSeconds: 600,
      now,
    });

    expect(result.skip).toBe(true);
    expect(result.lastAnalyzedAt).toBe("2026-04-15T05:55:30.000Z");
  });

  it("falls back to Loki analysis_result events when local files are disabled or empty", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              result: [
                {
                  values: [
                    [
                      "1",
                      JSON.stringify({
                        timestamp: "2026-04-15T05:55:30.000Z",
                        level: "info",
                        signalType: "analysis_result",
                        service: "woogook-frontend",
                        component: "llm-analyzer",
                        environment: "production",
                        release: "release-1",
                        context: {
                          incidentKey:
                            "FrontendApi5xxDetected|/api/assembly/v1/members|next-api|production",
                        },
                      } satisfies ObservabilityEvent),
                    ],
                  ],
                },
              ],
            },
          }),
          { status: 200 },
        ),
      );

    const result = await findRecentIncidentCooldown({
      config: {
        environment: "production",
        release: "release-1",
        localRootDir: "/tmp/non-existent-observability-dir",
        writeLocalFiles: false,
        rotateBytes: 1024,
        retentionDays: 14,
        mirrorToCloudInLocal: false,
        lokiQueryUrl: "https://logs-prod.grafana.net/loki/api/v1/query_range",
        outboundTimeoutMs: 5_000,
        analyzerLookbackMinutes: 10,
        llmCooldownSeconds: 600,
      },
      incidentKey:
        "FrontendApi5xxDetected|/api/assembly/v1/members|next-api|production",
      now: new Date("2026-04-15T06:00:00.000Z"),
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result.skip).toBe(true);
    expect(result.lastAnalyzedAt).toBe("2026-04-15T05:55:30.000Z");

    fetchSpy.mockRestore();
  });

  it("queries Loki across the full cooldown window when cooldown exceeds analyzer lookback", async () => {
    const now = new Date("2026-04-15T06:00:00.000Z");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              result: [],
            },
          }),
          { status: 200 },
        ),
      );

    await findRecentIncidentCooldown({
      config: {
        environment: "production",
        release: "release-1",
        localRootDir: "/tmp/non-existent-observability-dir",
        writeLocalFiles: false,
        rotateBytes: 1024,
        retentionDays: 14,
        mirrorToCloudInLocal: false,
        lokiQueryUrl: "https://logs-prod.grafana.net/loki/api/v1/query_range",
        outboundTimeoutMs: 5_000,
        analyzerLookbackMinutes: 10,
        llmCooldownSeconds: 900,
      },
      incidentKey:
        "FrontendApi5xxDetected|/api/assembly/v1/members|next-api|production",
      now,
    });

    const requestUrl = fetchSpy.mock.calls[0]?.[0];
    expect(requestUrl).toBeInstanceOf(URL);
    expect((requestUrl as URL).searchParams.get("start")).toBe(
      `${new Date("2026-04-15T05:45:00.000Z").getTime() * 1_000_000}`,
    );

    fetchSpy.mockRestore();
  });

  it("filters Loki cooldown lookup by incident key before applying the query limit", async () => {
    const incidentKey =
      "FrontendApi5xxDetected|/api/assembly/v1/members|next-api|production";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              result: [],
            },
          }),
          { status: 200 },
        ),
      );

    await findRecentIncidentCooldown({
      config: {
        environment: "production",
        release: "release-1",
        localRootDir: "/tmp/non-existent-observability-dir",
        writeLocalFiles: false,
        rotateBytes: 1024,
        retentionDays: 14,
        mirrorToCloudInLocal: false,
        lokiQueryUrl: "https://logs-prod.grafana.net/loki/api/v1/query_range",
        outboundTimeoutMs: 5_000,
        analyzerLookbackMinutes: 10,
        llmCooldownSeconds: 900,
      },
      incidentKey,
      now: new Date("2026-04-15T06:00:00.000Z"),
    });

    const requestUrl = fetchSpy.mock.calls[0]?.[0];
    expect(requestUrl).toBeInstanceOf(URL);
    expect((requestUrl as URL).searchParams.get("query")).toContain(
      `| context_incidentKey=${JSON.stringify(incidentKey)}`,
    );

    fetchSpy.mockRestore();
  });
});
