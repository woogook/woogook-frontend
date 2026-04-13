import { describe, expect, it, vi } from "vitest";

import type { ObservabilityEvent } from "@/lib/observability/types";
import {
  buildIncidentSummary,
  buildLokiIncidentQuery,
  extractEventsFromLokiResponse,
  fetchRecentIncidentEvents,
} from "@/lib/observability/analyzer";

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

  it("builds a Loki query that scopes to the incident route", () => {
    const query = buildLokiIncidentQuery({
      title: "production next-api error spike",
      status: "firing",
      labels: {
        environment: "production",
        component: "next-api",
        route: "/api/ballots",
      },
    });

    expect(query).toContain('service="woogook-frontend"');
    expect(query).toContain('environment="production"');
    expect(query).toContain('route="/api/ballots"');
  });

  it("keeps same-route browser events when the alert component is next-api", async () => {
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
                      "2",
                      JSON.stringify({
                        timestamp: "2026-04-12T12:00:01.000Z",
                        level: "error",
                        signalType: "browser_error",
                        service: "woogook-frontend",
                        component: "browser",
                        environment: "production",
                        release: "release-1",
                        route: "/api/ballots",
                      } satisfies ObservabilityEvent),
                    ],
                    [
                      "1",
                      JSON.stringify({
                        timestamp: "2026-04-12T12:00:00.000Z",
                        level: "error",
                        signalType: "server_error",
                        service: "woogook-frontend",
                        component: "next-api",
                        environment: "production",
                        release: "release-1",
                        route: "/api/ballots",
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

    const events = await fetchRecentIncidentEvents({
      alert: {
        title: "production next-api error spike",
        status: "firing",
        labels: {
          environment: "production",
          component: "next-api",
          route: "/api/ballots",
        },
      },
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
      },
      maxEvents: 5,
      now: new Date("2026-04-12T12:05:00.000Z"),
    });

    expect(events).toHaveLength(2);
    expect(events[0]?.component).toBe("browser");
    expect(events[1]?.component).toBe("next-api");

    fetchSpy.mockRestore();
  });

  it("parses Loki query results into observability events", () => {
    const events = extractEventsFromLokiResponse({
      data: {
        result: [
          {
            values: [
              [
                "1",
                JSON.stringify({
                  timestamp: "2026-04-12T12:00:00.000Z",
                  level: "error",
                  signalType: "server_error",
                  service: "woogook-frontend",
                  component: "next-api",
                  environment: "production",
                  release: "release-1",
                  route: "/api/ballots",
                } satisfies ObservabilityEvent),
              ],
            ],
          },
        ],
      },
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.route).toBe("/api/ballots");
  });

  it("falls back to Loki when local files are unavailable", async () => {
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
                        timestamp: "2026-04-12T12:00:00.000Z",
                        level: "error",
                        signalType: "server_error",
                        service: "woogook-frontend",
                        component: "next-api",
                        environment: "production",
                        release: "release-1",
                        route: "/api/ballots",
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

    const events = await fetchRecentIncidentEvents({
      alert: {
        title: "production next-api error spike",
        status: "firing",
        labels: {
          environment: "production",
          component: "next-api",
          route: "/api/ballots",
        },
      },
      config: {
        environment: "production",
        release: "release-1",
        localRootDir: "/tmp/non-existent-observability-dir",
        writeLocalFiles: false,
        rotateBytes: 1024,
        retentionDays: 14,
        mirrorToCloudInLocal: false,
        lokiQueryUrl: "https://logs-prod.grafana.net/loki/api/v1/query_range",
        lokiUsername: "user",
        lokiPassword: "pass",
        outboundTimeoutMs: 5_000,
        analyzerLookbackMinutes: 10,
      },
      maxEvents: 5,
      now: new Date("2026-04-12T12:05:00.000Z"),
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(events).toHaveLength(1);
    expect(events[0]?.route).toBe("/api/ballots");

    fetchSpy.mockRestore();
  });
});
