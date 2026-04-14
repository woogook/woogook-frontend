import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const integrationHarnessPath = path.resolve(
  repoRoot,
  "scripts/e2e/local-council-integration.mjs",
);
const playwrightConfigPath = path.resolve(repoRoot, "playwright.config.ts");

function loadGetDatabaseConfig() {
  const source = readFileSync(integrationHarnessPath, "utf8");
  const match = source.match(
    /const DEFAULT_POSTGRES_HOST[\s\S]+?function getDatabaseConfig\(\) \{[\s\S]+?\n\}/,
  );

  if (!match) {
    throw new Error("getDatabaseConfig 함수를 찾지 못했습니다.");
  }

  const factory = new Function(
    "process",
    `${match[0]}\nreturn getDatabaseConfig;`,
  );

  return factory;
}

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("local-council Playwright config", () => {
  it("integration harness 실행 중에는 기존 dev server를 재사용하지 않는다", async () => {
    process.env = {
      ...originalEnv,
      PLAYWRIGHT_LOCAL_COUNCIL_INTEGRATION: "1",
    };

    const configModule = await import(
      `${pathToFileURL(playwrightConfigPath).href}?t=${Date.now()}`
    );

    expect(configModule.default.webServer?.reuseExistingServer).toBe(false);
  });
});

describe("local-council integration harness database config", () => {
  it("ambient WOOGOOK_DATABASE_URL 대신 격리 DB target으로 canonical URL을 만든다", () => {
    const getDatabaseConfigFactory = loadGetDatabaseConfig();
    const fakeProcess = {
      env: {
        WOOGOOK_DATABASE_URL:
          "postgresql+psycopg://ambient:ambient@remote-host:9999/other-db",
      },
    };

    const getDatabaseConfig = getDatabaseConfigFactory(fakeProcess);
    const databaseConfig = getDatabaseConfig();

    expect(databaseConfig.database).toBe("woogook_local_council_e2e");
    expect(databaseConfig.databaseUrl).toBe(
      "postgresql+psycopg://woogook:woogook@127.0.0.1:5433/woogook_local_council_e2e",
    );
  });
});
