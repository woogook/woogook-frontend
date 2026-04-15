import { describe, expect, it } from "vitest";

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
});
