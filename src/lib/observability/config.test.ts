import { describe, expect, it } from "vitest";

import {
  deriveLokiQueryUrl,
  parseObservabilityConfig,
} from "@/lib/observability/config";

describe("parseObservabilityConfig", () => {
  it("provides local logging defaults when env is empty", () => {
    const config = parseObservabilityConfig({});

    expect(config.localRootDir).toContain(".logs/frontend");
    expect(config.rotateBytes).toBe(50 * 1024 * 1024);
    expect(config.retentionDays).toBe(14);
    expect(config.writeLocalFiles).toBe(true);
  });

  it("disables local file writes outside local by default", () => {
    const config = parseObservabilityConfig({
      WOOGOOK_OBSERVABILITY_ENV: "production",
    });

    expect(config.writeLocalFiles).toBe(false);
  });

  it("derives the Loki query endpoint and analyzer defaults", () => {
    const config = parseObservabilityConfig({
      WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL:
        "https://logs-prod.grafana.net/loki/api/v1/push",
    });

    expect(config.lokiQueryUrl).toBe(
      "https://logs-prod.grafana.net/loki/api/v1/query_range",
    );
    expect(config.outboundTimeoutMs).toBe(5_000);
    expect(config.analyzerLookbackMinutes).toBe(10);
  });
});

describe("deriveLokiQueryUrl", () => {
  it("returns undefined for unsupported push URL shapes", () => {
    expect(deriveLokiQueryUrl("https://example.com/custom-ingest")).toBeUndefined();
  });
});
