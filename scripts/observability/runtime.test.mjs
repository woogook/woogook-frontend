import { describe, expect, it } from "vitest";

import {
  buildBrowserErrorBatch,
  buildSyntheticFailUrl,
  getFrontendBaseUrl,
  getGrafanaBaseUrl,
} from "./runtime.mjs";

describe("observability runtime helpers", () => {
  it("uses localhost defaults for frontend and grafana base URLs", () => {
    expect(getFrontendBaseUrl({})).toBe("http://127.0.0.1:3000");
    expect(getGrafanaBaseUrl({})).toBe("http://127.0.0.1:3001");
  });

  it("builds a deterministic synthetic fail URL with status params", () => {
    const target = buildSyntheticFailUrl("http://127.0.0.1:3000", 503, {
      reason: "alert-test",
    });

    expect(target).toBe(
      "http://127.0.0.1:3000/api/observability/dev/fail?status=503&reason=alert-test",
    );
  });

  it("builds a browser error batch in the ingest format", () => {
    const payload = buildBrowserErrorBatch({
      route: "/synthetic/browser-error",
      sessionId: "session-1",
      errorMessage: "Synthetic browser error",
    });

    expect(payload.sessionId).toBe("session-1");
    expect(payload.events).toHaveLength(1);
    expect(payload.events[0]).toMatchObject({
      level: "error",
      signalType: "browser_error",
      route: "/synthetic/browser-error",
      errorMessage: "Synthetic browser error",
    });
  });
});
