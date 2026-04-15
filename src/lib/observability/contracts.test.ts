import { describe, expect, it } from "vitest";

import { parseGrafanaAlertPayloads } from "@/lib/observability/contracts";

describe("parseGrafanaAlertPayloads", () => {
  it("keeps the legacy flat payload shape as a single alert", () => {
    expect(
      parseGrafanaAlertPayloads({
        title: "FrontendApi5xxDetected",
        status: "firing",
        labels: {
          team: "frontend-observability",
          severity: "error",
        },
        annotations: {
          summary: "Recent 5xx responses detected.",
        },
      }),
    ).toEqual([
      {
        title: "FrontendApi5xxDetected",
        status: "firing",
        labels: {
          team: "frontend-observability",
          severity: "error",
        },
        annotations: {
          summary: "Recent 5xx responses detected.",
        },
      },
    ]);
  });

  it("normalizes the default Grafana webhook payload into per-alert envelopes", () => {
    expect(
      parseGrafanaAlertPayloads({
        title: "[FIRING:1] frontend-observability",
        status: "firing",
        commonLabels: {
          team: "frontend-observability",
          severity: "error",
          environment: "local",
        },
        commonAnnotations: {
          summary: "Recent 5xx responses detected.",
        },
        alerts: [
          {
            status: "firing",
            labels: {
              alertname: "FrontendApi5xxDetected",
              route: "observability/dev/fail",
              component: "next-api",
            },
            annotations: {
              description: "Synthetic API failure",
            },
          },
        ],
      }),
    ).toEqual([
      {
        title: "FrontendApi5xxDetected",
        status: "firing",
        labels: {
          team: "frontend-observability",
          severity: "error",
          environment: "local",
          route: "observability/dev/fail",
          component: "next-api",
          alertname: "FrontendApi5xxDetected",
        },
        annotations: {
          summary: "Recent 5xx responses detected.",
          description: "Synthetic API failure",
        },
      },
    ]);
  });
});
