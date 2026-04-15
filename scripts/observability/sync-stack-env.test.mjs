import { describe, expect, it } from "vitest";

import {
  REQUIRED_STACK_ENV_KEYS,
  STACK_ENV_KEYS,
  buildStackEnvContent,
  resolveSourceEnvPath,
  validateStackEnvMap,
} from "./sync-stack-env.mjs";

describe("sync stack env", () => {
  it("rejects /.env.local to keep root /.env as the only source of truth", () => {
    expect(() =>
      resolveSourceEnvPath({
        cwd: "/tmp/project",
        existsSync: (target) => target === "/tmp/project/.env.local",
      }),
    ).toThrow(
      "root .env.local is no longer supported. Move its values into root .env and remove .env.local.",
    );
  });

  it("prefers /.env over /.env.example", () => {
    expect(
      resolveSourceEnvPath({
        cwd: "/tmp/project",
        existsSync: (target) => target === "/tmp/project/.env",
      }),
    ).toBe("/tmp/project/.env");
  });

  it("falls back to /.env.example when /.env is missing", () => {
    expect(
      resolveSourceEnvPath({
        cwd: "/tmp/project",
        existsSync: (target) => target === "/tmp/project/.env.example",
      }),
    ).toBe("/tmp/project/.env.example");
  });

  it("writes only stack keys in a stable order", () => {
    expect(STACK_ENV_KEYS).toEqual([
      "GRAFANA_ADMIN_USER",
      "GRAFANA_ADMIN_PASSWORD",
      "GRAFANA_ALERTS_DISCORD_WEBHOOK_URL",
      "GRAFANA_ALERTS_ANALYZER_WEBHOOK_URL",
      "FRONTEND_METRICS_TARGET",
    ]);

    expect(
      buildStackEnvContent({
        GRAFANA_ADMIN_USER: "admin",
        GRAFANA_ADMIN_PASSWORD: "admin",
        GRAFANA_ALERTS_DISCORD_WEBHOOK_URL: "https://discord.example/webhook",
        GRAFANA_ALERTS_ANALYZER_WEBHOOK_URL:
          "http://host.docker.internal:3000/api/observability/analyzer",
        FRONTEND_METRICS_TARGET: "host.docker.internal:3000",
        WOOGOOK_OBSERVABILITY_ENV: "local",
      }),
    ).toBe(`GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
GRAFANA_ALERTS_DISCORD_WEBHOOK_URL=https://discord.example/webhook
GRAFANA_ALERTS_ANALYZER_WEBHOOK_URL=http://host.docker.internal:3000/api/observability/analyzer
FRONTEND_METRICS_TARGET=host.docker.internal:3000
`);
  });

  it("keeps empty stack values instead of dropping the key", () => {
    expect(
      buildStackEnvContent({
        GRAFANA_ADMIN_USER: "admin",
        GRAFANA_ADMIN_PASSWORD: "admin",
        GRAFANA_ALERTS_DISCORD_WEBHOOK_URL: "",
        GRAFANA_ALERTS_ANALYZER_WEBHOOK_URL:
          "http://host.docker.internal:3000/api/observability/analyzer",
        FRONTEND_METRICS_TARGET: "host.docker.internal:3000",
      }),
    ).toContain("GRAFANA_ALERTS_DISCORD_WEBHOOK_URL=\n");
  });

  it("rejects missing required stack keys while allowing empty webhook", () => {
    expect(REQUIRED_STACK_ENV_KEYS).toEqual([
      "GRAFANA_ADMIN_USER",
      "GRAFANA_ADMIN_PASSWORD",
      "GRAFANA_ALERTS_ANALYZER_WEBHOOK_URL",
      "FRONTEND_METRICS_TARGET",
    ]);

    expect(() =>
      validateStackEnvMap({
        GRAFANA_ADMIN_USER: "admin",
        GRAFANA_ADMIN_PASSWORD: "",
        GRAFANA_ALERTS_DISCORD_WEBHOOK_URL: "",
        GRAFANA_ALERTS_ANALYZER_WEBHOOK_URL: "",
        FRONTEND_METRICS_TARGET: "",
      }),
    ).toThrow(
      "missing required stack env keys: GRAFANA_ADMIN_PASSWORD, GRAFANA_ALERTS_ANALYZER_WEBHOOK_URL, FRONTEND_METRICS_TARGET",
    );
  });
});
