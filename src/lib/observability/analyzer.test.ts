import { describe, expect, it } from "vitest";

import type { ObservabilityEvent } from "@/lib/observability/types";
import { buildIncidentSummary } from "@/lib/observability/analyzer";

describe("buildIncidentSummary", () => {
  it("builds a readable summary from alert labels and recent events", () => {
    const summary = buildIncidentSummary(
      {
        title: "production next-api error spike",
        status: "firing",
        labels: {
          environment: "production",
          component: "next-api",
          route: "/api/ballots",
          error_name: "DatabaseUnavailableError",
        },
      },
      [
        {
          timestamp: "2026-04-12T12:00:00.000Z",
          level: "error",
          signalType: "server_error",
          service: "woogook-frontend",
          component: "next-api",
          environment: "production",
          release: "release-1",
          route: "/api/ballots",
          errorName: "DatabaseUnavailableError",
          errorMessage: "Failed to load ballots",
          latencyMs: 812,
        } satisfies ObservabilityEvent,
      ],
    );

    expect(summary.headline).toContain("production");
    expect(summary.rootCauseCandidates[0]).toContain("DatabaseUnavailableError");
    expect(summary.nextActions).toHaveLength(3);
  });
});
