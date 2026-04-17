import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertPortAvailable,
  getIntegrationPlaywrightEnv,
  getDatabaseConfig,
  getIntegrationPlaywrightCommandArgs,
  getSmokePlaywrightCommandArgs,
  getSmokePlaywrightEnv,
} from "./local-council-harness.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const playwrightConfigPath = path.resolve(repoRoot, "playwright.config.ts");

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
    const databaseConfig = getDatabaseConfig({
      WOOGOOK_DATABASE_URL:
        "postgresql+psycopg://ambient:ambient@remote-host:9999/other-db",
    });

    expect(databaseConfig.database).toBe("woogook_local_council_e2e");
    expect(databaseConfig.databaseUrl).toBe(
      "postgresql+psycopg://woogook:woogook@127.0.0.1:5433/woogook_local_council_e2e",
    );
  });

  it("ambient PG* fallback를 무시하고 dedicated integration target을 유지한다", () => {
    const databaseConfig = getDatabaseConfig({
      PGHOST: "remote-host",
      PGPORT: "9999",
      PGDATABASE: "real-db",
      PGUSER: "real-user",
      PGPASSWORD: "real-password",
    });

    expect(databaseConfig).toMatchObject({
      host: "127.0.0.1",
      port: 5433,
      database: "woogook_local_council_e2e",
      user: "woogook",
      password: "woogook",
    });
  });

  it("explicit PLAYWRIGHT_LOCAL_COUNCIL_PG* override는 그대로 사용한다", () => {
    const databaseConfig = getDatabaseConfig({
      PLAYWRIGHT_LOCAL_COUNCIL_PGHOST: "127.0.0.2",
      PLAYWRIGHT_LOCAL_COUNCIL_PGPORT: "5544",
      PLAYWRIGHT_LOCAL_COUNCIL_PGDATABASE: "custom-e2e-db",
      PLAYWRIGHT_LOCAL_COUNCIL_PGUSER: "custom-user",
      PLAYWRIGHT_LOCAL_COUNCIL_PGPASSWORD: "custom-password",
    });

    expect(databaseConfig).toMatchObject({
      host: "127.0.0.2",
      port: 5544,
      database: "custom-e2e-db",
      user: "custom-user",
      password: "custom-password",
      databaseUrl:
        "postgresql+psycopg://custom-user:custom-password@127.0.0.2:5544/custom-e2e-db",
    });
  });

  it("databaseUrl은 reserved character가 포함된 database 이름도 percent-encode한다", () => {
    const databaseConfig = getDatabaseConfig({
      PLAYWRIGHT_LOCAL_COUNCIL_PGDATABASE: "custom/e2e?db",
    });

    expect(databaseConfig.databaseUrl).toBe(
      "postgresql+psycopg://woogook:woogook@127.0.0.1:5433/custom%2Fe2e%3Fdb",
    );
  });

  it("databaseUrl은 reserved character가 포함된 credential을 percent-encode한다", () => {
    const databaseConfig = getDatabaseConfig({
      PLAYWRIGHT_LOCAL_COUNCIL_PGUSER: "user:name@example.com",
      PLAYWRIGHT_LOCAL_COUNCIL_PGPASSWORD: "pa:ss#word/with?chars",
    });

    expect(databaseConfig.databaseUrl).toBe(
      "postgresql+psycopg://user%3Aname%40example.com:pa%3Ass%23word%2Fwith%3Fchars@127.0.0.1:5433/woogook_local_council_e2e",
    );
  });

  it("dangerous live database names are rejected before destructive integration setup runs", () => {
    expect(() =>
      getDatabaseConfig({
        PLAYWRIGHT_LOCAL_COUNCIL_PGDATABASE: "woogook",
      }),
    ).toThrow(/격리 integration database 이름/);
  });

  it("substring으로만 test marker를 포함한 database 이름은 거부한다", () => {
    expect(() =>
      getDatabaseConfig({
        PLAYWRIGHT_LOCAL_COUNCIL_PGDATABASE: "contest_data",
      }),
    ).toThrow(/격리 integration database 이름/);
  });

  it("database name identical to the admin database is rejected", () => {
    expect(() =>
      getDatabaseConfig({
        PLAYWRIGHT_LOCAL_COUNCIL_PGDATABASE: "postgres",
      }),
    ).toThrow(/admin database/);
  });
});

describe("local-council harness backend port preflight", () => {
  it("이미 사용 중인 backend 포트는 시작 전에 실패한다", async () => {
    const server = createServer();
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("테스트 포트를 확보하지 못했습니다.");
    }

    await expect(
      assertPortAvailable({
        host: "127.0.0.1",
        port: address.port,
        label: "backend",
      }),
    ).rejects.toThrow(/backend 포트가 이미 사용 중입니다/);

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it("비어 있는 backend 포트는 preflight를 통과한다", async () => {
    const server = createServer();
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("테스트 포트를 확보하지 못했습니다.");
    }

    const port = address.port;

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    await expect(
      assertPortAvailable({
        host: "127.0.0.1",
        port,
        label: "backend",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("local-council integration Playwright env", () => {
  it("ambient PLAYWRIGHT_BASE_URL과 PORT를 무시하고 로컬 frontend target으로 고정한다", () => {
    const env = getIntegrationPlaywrightEnv(
      {
        PLAYWRIGHT_BASE_URL: "https://external.example.com",
        PORT: "4123",
        SOME_OTHER_ENV: "keep-me",
      },
      {
        backendConfig: {
          baseUrl: "http://127.0.0.1:18000",
        },
        databaseConfig: {
          host: "127.0.0.1",
          port: 5433,
          database: "woogook_local_council_e2e",
          user: "woogook",
          password: "woogook",
        },
      },
    );

    expect(env).toMatchObject({
      PLAYWRIGHT_LOCAL_COUNCIL_INTEGRATION: "1",
      PLAYWRIGHT_BASE_URL: "http://localhost:3000",
      PORT: "3000",
      WOOGOOK_BACKEND_BASE_URL: "http://127.0.0.1:18000",
      PGHOST: "127.0.0.1",
      PGPORT: "5433",
      PGDATABASE: "woogook_local_council_e2e",
      PGUSER: "woogook",
      PGPASSWORD: "woogook",
      SOME_OTHER_ENV: "keep-me",
    });
  });
});

describe("local-council smoke Playwright env", () => {
  it("ambient backend base URL을 비워 sample fallback 경로만 검증한다", () => {
    const env = getSmokePlaywrightEnv({
      WOOGOOK_BACKEND_BASE_URL: "https://api.woogook.kr",
      PLAYWRIGHT_BASE_URL: "https://external.example.com",
      PORT: "4123",
      SOME_OTHER_ENV: "keep-me",
    });

    expect(env).toMatchObject({
      PLAYWRIGHT_BASE_URL: "http://localhost:3000",
      PORT: "3000",
      WOOGOOK_BACKEND_BASE_URL: "",
      SOME_OTHER_ENV: "keep-me",
    });
  });
});

describe("local-council integration Playwright command args", () => {
  it("forwarded CLI arg가 없으면 raw integration spec만 실행한다", () => {
    expect(getIntegrationPlaywrightCommandArgs()).toEqual([
      "run",
      "e2e:integration:spec",
    ]);
  });

  it("forwarded CLI arg가 있으면 npm run 뒤에 -- 와 함께 그대로 전달한다", () => {
    expect(
      getIntegrationPlaywrightCommandArgs([
        "--headed",
        "--grep",
        "강동구",
      ]),
    ).toEqual([
      "run",
      "e2e:integration:spec",
      "--",
      "--headed",
      "--grep",
      "강동구",
    ]);
  });
});

describe("local-council smoke Playwright command args", () => {
  it("forwarded CLI arg가 없으면 raw smoke spec만 실행한다", () => {
    expect(getSmokePlaywrightCommandArgs()).toEqual([
      "run",
      "e2e:smoke:spec",
    ]);
  });

  it("forwarded CLI arg가 있으면 npm run 뒤에 -- 와 함께 그대로 전달한다", () => {
    expect(
      getSmokePlaywrightCommandArgs([
        "--headed",
        "--grep",
        "강동구",
      ]),
    ).toEqual([
      "run",
      "e2e:smoke:spec",
      "--",
      "--headed",
      "--grep",
      "강동구",
    ]);
  });
});
