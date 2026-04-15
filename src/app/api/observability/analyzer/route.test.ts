import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  observeRouteMock,
  logServerEventMock,
  fetchRecentIncidentEventsMock,
  buildIncidentSummaryMock,
  enhanceIncidentSummaryMock,
  sendDiscordMessageMock,
  shouldAnalyzeAlertMock,
  buildIncidentKeyMock,
  findRecentIncidentCooldownMock,
  formatDiscordIncidentMessageMock,
  filterIncidentEventsMock,
} = vi.hoisted(() => ({
  observeRouteMock: vi.fn(),
  logServerEventMock: vi.fn(),
  fetchRecentIncidentEventsMock: vi.fn(),
  buildIncidentSummaryMock: vi.fn(),
  enhanceIncidentSummaryMock: vi.fn(),
  sendDiscordMessageMock: vi.fn(),
  shouldAnalyzeAlertMock: vi.fn(),
  buildIncidentKeyMock: vi.fn(),
  findRecentIncidentCooldownMock: vi.fn(),
  formatDiscordIncidentMessageMock: vi.fn(),
  filterIncidentEventsMock: vi.fn(),
}));

vi.mock("@/lib/observability/server", () => ({
  observeRoute: observeRouteMock,
  logServerEvent: logServerEventMock,
}));

vi.mock("@/lib/observability/analyzer", () => ({
  fetchRecentIncidentEvents: fetchRecentIncidentEventsMock,
  buildIncidentSummary: buildIncidentSummaryMock,
}));

vi.mock("@/lib/observability/providers", () => ({
  enhanceIncidentSummary: enhanceIncidentSummaryMock,
}));

vi.mock("@/lib/observability/discord", () => ({
  sendDiscordMessage: sendDiscordMessageMock,
  formatDiscordIncidentMessage: formatDiscordIncidentMessageMock,
}));

vi.mock("@/lib/observability/incident-policy", () => ({
  shouldAnalyzeAlert: shouldAnalyzeAlertMock,
  buildIncidentKey: buildIncidentKeyMock,
  findRecentIncidentCooldown: findRecentIncidentCooldownMock,
  filterIncidentEvents: filterIncidentEventsMock,
}));

import { POST } from "@/app/api/observability/analyzer/route";

describe("POST /api/observability/analyzer", () => {
  beforeEach(() => {
    observeRouteMock.mockReset();
    logServerEventMock.mockReset();
    fetchRecentIncidentEventsMock.mockReset();
    buildIncidentSummaryMock.mockReset();
    enhanceIncidentSummaryMock.mockReset();
    sendDiscordMessageMock.mockReset();
    shouldAnalyzeAlertMock.mockReset();
    buildIncidentKeyMock.mockReset();
    findRecentIncidentCooldownMock.mockReset();
    formatDiscordIncidentMessageMock.mockReset();
    filterIncidentEventsMock.mockReset();

    observeRouteMock.mockImplementation(async (_request, _routeName, handler) =>
      handler({
        config: {
          environment: "local",
          release: "test-release",
          localRootDir: ".logs/frontend",
          writeLocalFiles: true,
          rotateBytes: 1024,
          retentionDays: 14,
          mirrorToCloudInLocal: false,
          outboundTimeoutMs: 1_000,
          analyzerLookbackMinutes: 10,
          llmMode: "direct",
          llmProvider: "upstage",
          llmCooldownSeconds: 900,
          llmModel: "solar-pro-2",
          llmApiUrl: "https://api.upstage.ai/v1/chat/completions",
          llmApiKey: "up_test",
          discordWebhookUrl: "https://discord.test/webhook",
        },
        requestId: "request-1",
        correlationId: "correlation-1",
        routeName: "observability/analyzer",
      }),
    );

    shouldAnalyzeAlertMock.mockReturnValue(true);
    buildIncidentKeyMock.mockReturnValue("incident-key");
    findRecentIncidentCooldownMock.mockResolvedValue({
      skip: false,
      lastAnalyzedAt: undefined,
    });
    fetchRecentIncidentEventsMock.mockResolvedValue([
      {
        timestamp: "2026-04-15T06:00:00.000Z",
        level: "error",
        signalType: "server_error",
        component: "next-api",
        route: "observability/dev/fail",
      },
    ]);
    filterIncidentEventsMock.mockImplementation((events) => events);
    buildIncidentSummaryMock.mockReturnValue({
      headline: "baseline headline",
      impactSummary: "baseline impact",
      rootCauseCandidates: ["candidate"],
      nextActions: ["action"],
      confidence: "medium",
    });
    enhanceIncidentSummaryMock.mockResolvedValue({
      headline: "enhanced headline",
      impactSummary: "enhanced impact",
      rootCauseCandidates: ["candidate"],
      nextActions: ["action"],
      confidence: "high",
    });
    formatDiscordIncidentMessageMock.mockReturnValue("discord payload");
  });

  it("skips alerts that do not match the analyzer policy", async () => {
    shouldAnalyzeAlertMock.mockReturnValue(false);

    const request = {
      json: vi.fn().mockResolvedValue({
        title: "ignored",
        status: "resolved",
        labels: {},
      }),
    } as unknown as Request;

    const response = await POST(request);

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      skipped: true,
      reason: "filtered",
    });
    expect(fetchRecentIncidentEventsMock).not.toHaveBeenCalled();
    expect(sendDiscordMessageMock).not.toHaveBeenCalled();
  });

  it("skips duplicate incidents during cooldown and returns the incident key", async () => {
    shouldAnalyzeAlertMock.mockReturnValue(true);
    buildIncidentKeyMock.mockReturnValue("incident-key");
    findRecentIncidentCooldownMock.mockResolvedValue({
      skip: true,
      lastAnalyzedAt: "2026-04-15T05:55:30.000Z",
    });

    const request = {
      json: vi.fn().mockResolvedValue({
        title: "FrontendApi5xxDetected",
        status: "firing",
        labels: {
          team: "frontend-observability",
          severity: "error",
        },
      }),
    } as unknown as Request;

    const response = await POST(request);

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      skipped: true,
      reason: "cooldown",
      incident_key: "incident-key",
    });
    expect(fetchRecentIncidentEventsMock).not.toHaveBeenCalled();
  });

  it("normalizes Grafana grouped webhook payloads and sends the summary to Discord", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({
        title: "[FIRING:1] FrontendApi5xxDetected",
        status: "firing",
        commonLabels: {
          team: "frontend-observability",
          severity: "error",
          route: "observability/dev/fail",
          environment: "local",
        },
        commonAnnotations: {
          summary: "Recent 5xx responses detected in woogook-frontend local stack.",
        },
        alerts: [
          {
            status: "firing",
            labels: {
              alertname: "FrontendApi5xxDetected",
              component: "next-api",
            },
            annotations: {
              description: "Synthetic API failure",
            },
          },
        ],
      }),
    } as unknown as Request;

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      incident_key: "incident-key",
      recent_event_count: 1,
    });
    expect(shouldAnalyzeAlertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "FrontendApi5xxDetected",
        labels: expect.objectContaining({
          team: "frontend-observability",
          severity: "error",
          route: "observability/dev/fail",
          component: "next-api",
        }),
        annotations: expect.objectContaining({
          summary: "Recent 5xx responses detected in woogook-frontend local stack.",
          description: "Synthetic API failure",
        }),
      }),
    );
    expect(sendDiscordMessageMock).toHaveBeenCalledOnce();
    expect(logServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        signalType: "analysis_result",
        route: "observability/dev/fail",
      }),
    );
  });

  it("returns aggregated results when Grafana batches multiple alerts", async () => {
    shouldAnalyzeAlertMock.mockImplementation(
      (alert) => alert.title === "FrontendApi5xxDetected",
    );
    buildIncidentKeyMock.mockReturnValue("incident-key");

    const request = {
      json: vi.fn().mockResolvedValue({
        title: "[FIRING:2] frontend-observability",
        status: "firing",
        commonLabels: {
          team: "frontend-observability",
          severity: "error",
          environment: "local",
        },
        alerts: [
          {
            status: "firing",
            labels: {
              alertname: "FrontendApi5xxDetected",
              route: "observability/dev/fail",
              component: "next-api",
            },
          },
          {
            status: "firing",
            labels: {
              alertname: "AnalyzerSelfAlert",
              route: "observability/analyzer",
              component: "llm-analyzer",
            },
          },
        ],
      }),
    } as unknown as Request;

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      results: [
        expect.objectContaining({
          incident_key: "incident-key",
        }),
        expect.objectContaining({
          skipped: true,
          reason: "filtered",
        }),
      ],
    });
    expect(sendDiscordMessageMock).toHaveBeenCalledOnce();
  });
});
