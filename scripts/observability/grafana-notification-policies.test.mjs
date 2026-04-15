import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const notificationPoliciesPath = path.resolve(
  process.cwd(),
  "ops/observability/grafana/provisioning/alerting/notification-policies.yml",
);

function readPolicies() {
  return readFileSync(notificationPoliciesPath, "utf8").replaceAll("\r\n", "\n");
}

describe("grafana notification policies", () => {
  it("routes frontend error alerts through the analyzer child policy", () => {
    const policies = readPolicies();

    expect(policies).toContain(`    routes:
      - receiver: frontend-discord
        object_matchers:
          - ["team", "=", "frontend-observability"]
        routes:
          - receiver: frontend-analyzer
            object_matchers:
              - ["severity", "=", "error"]`);
  });
});
