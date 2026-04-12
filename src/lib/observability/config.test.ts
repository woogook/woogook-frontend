import { describe, expect, it } from "vitest";

import { parseObservabilityConfig } from "@/lib/observability/config";

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
});
