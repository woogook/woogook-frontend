import { createServer } from "node:net";

const DEFAULT_BACKEND_HOST = "127.0.0.1";
const DEFAULT_BACKEND_PORT = 18000;
const DEFAULT_POSTGRES_HOST = "127.0.0.1";
const DEFAULT_POSTGRES_PORT = 5433;
const DEFAULT_POSTGRES_DATABASE = "woogook_local_council_e2e";
const DEFAULT_POSTGRES_ADMIN_DATABASE = "postgres";
const DEFAULT_POSTGRES_USER = "woogook";
const DEFAULT_POSTGRES_PASSWORD = "woogook";
const DEFAULT_HEALTH_ATTEMPTS = 60;
const DEFAULT_HEALTH_DELAY_MS = 1000;
const DEFAULT_FRONTEND_PORT = 3000;
const SAFE_DATABASE_NAME_MARKERS = ["e2e", "integration", "test"];
const RESERVED_DATABASE_NAMES = new Set(["postgres", "template0", "template1", "woogook"]);

function encodeUrlComponent(value) {
  return encodeURIComponent(value);
}

function normalizeDatabaseName(value) {
  return value.trim().toLowerCase();
}

function hasSafeDatabaseMarker(normalizedDatabase) {
  const tokens = normalizedDatabase.split(/[^a-z0-9]+/).filter(Boolean);

  if (tokens.some((token) => SAFE_DATABASE_NAME_MARKERS.includes(token))) {
    return true;
  }

  return /(^|[^a-z0-9])(e2e|integration|test)$/.test(normalizedDatabase);
}

function assertSafeIsolatedDatabaseName(database, adminDatabase) {
  const normalizedDatabase = normalizeDatabaseName(database);
  const normalizedAdminDatabase = normalizeDatabaseName(adminDatabase);

  if (!normalizedDatabase) {
    throw new Error("격리 integration database 이름이 비어 있습니다.");
  }

  if (normalizedDatabase === normalizedAdminDatabase) {
    throw new Error(
      `integration target database must not match admin database: ${database}`,
    );
  }

  if (
    RESERVED_DATABASE_NAMES.has(normalizedDatabase) ||
    !hasSafeDatabaseMarker(normalizedDatabase)
  ) {
    throw new Error(
      [
        `격리 integration database 이름이어야 합니다: ${database}`,
        "예: *_e2e, *_integration, *_test",
      ].join(" "),
    );
  }
}

export function getDatabaseConfig(env = process.env) {
  const host = env.PLAYWRIGHT_LOCAL_COUNCIL_PGHOST || DEFAULT_POSTGRES_HOST;
  const port = Number(
    env.PLAYWRIGHT_LOCAL_COUNCIL_PGPORT || String(DEFAULT_POSTGRES_PORT),
  );
  const database =
    env.PLAYWRIGHT_LOCAL_COUNCIL_PGDATABASE || DEFAULT_POSTGRES_DATABASE;
  const adminDatabase =
    env.PLAYWRIGHT_LOCAL_COUNCIL_ADMIN_DATABASE ||
    DEFAULT_POSTGRES_ADMIN_DATABASE;
  const user = env.PLAYWRIGHT_LOCAL_COUNCIL_PGUSER || DEFAULT_POSTGRES_USER;
  const password =
    env.PLAYWRIGHT_LOCAL_COUNCIL_PGPASSWORD || DEFAULT_POSTGRES_PASSWORD;
  const preserveDatabase =
    env.PLAYWRIGHT_LOCAL_COUNCIL_PRESERVE_DATABASE === "1";

  assertSafeIsolatedDatabaseName(database, adminDatabase);

  const encodedUser = encodeUrlComponent(user);
  const encodedPassword = encodeUrlComponent(password);
  const encodedDatabase = encodeUrlComponent(database);
  const databaseUrl = `postgresql+psycopg://${encodedUser}:${encodedPassword}@${host}:${port}/${encodedDatabase}`;

  return {
    host,
    port,
    database,
    adminDatabase,
    user,
    password,
    preserveDatabase,
    databaseUrl,
  };
}

export function getBackendConfig(env = process.env) {
  const host = env.PLAYWRIGHT_LOCAL_COUNCIL_BACKEND_HOST || DEFAULT_BACKEND_HOST;
  const port = Number(
    env.PLAYWRIGHT_LOCAL_COUNCIL_BACKEND_PORT || String(DEFAULT_BACKEND_PORT),
  );

  return {
    host,
    port,
    baseUrl: `http://${host}:${port}`,
  };
}

export function getHealthRetryConfig(env = process.env) {
  return {
    attempts: Number(
      env.PLAYWRIGHT_LOCAL_COUNCIL_HEALTH_ATTEMPTS ||
        String(DEFAULT_HEALTH_ATTEMPTS),
    ),
    delayMs: Number(
      env.PLAYWRIGHT_LOCAL_COUNCIL_HEALTH_DELAY_MS ||
        String(DEFAULT_HEALTH_DELAY_MS),
    ),
  };
}

export function getIntegrationPlaywrightEnv(
  env = process.env,
  { backendConfig, databaseConfig },
) {
  const frontendPort = String(DEFAULT_FRONTEND_PORT);

  return {
    ...env,
    PLAYWRIGHT_LOCAL_COUNCIL_INTEGRATION: "1",
    PLAYWRIGHT_BASE_URL: `http://localhost:${frontendPort}`,
    PORT: frontendPort,
    WOOGOOK_BACKEND_BASE_URL: backendConfig.baseUrl,
    PGHOST: databaseConfig.host,
    PGPORT: String(databaseConfig.port),
    PGDATABASE: databaseConfig.database,
    PGUSER: databaseConfig.user,
    PGPASSWORD: databaseConfig.password,
  };
}

export function getSmokePlaywrightEnv(env = process.env) {
  const frontendPort = String(DEFAULT_FRONTEND_PORT);

  return {
    ...env,
    PLAYWRIGHT_LOCAL_COUNCIL_INTEGRATION: "",
    PLAYWRIGHT_BASE_URL: `http://localhost:${frontendPort}`,
    PORT: frontendPort,
    WOOGOOK_BACKEND_BASE_URL: "",
  };
}

export function getIntegrationPlaywrightCommandArgs(forwardedArgs = []) {
  const npmArgs = ["run", "e2e:integration:spec"];

  if (forwardedArgs.length > 0) {
    npmArgs.push("--", ...forwardedArgs);
  }

  return npmArgs;
}

export function getSmokePlaywrightCommandArgs(forwardedArgs = []) {
  const npmArgs = ["run", "e2e:smoke:spec"];

  if (forwardedArgs.length > 0) {
    npmArgs.push("--", ...forwardedArgs);
  }

  return npmArgs;
}

export async function assertPortAvailable({ host, port, label }) {
  await new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", (error) => {
      reject(
        new Error(
          error.code === "EADDRINUSE"
            ? `${label} 포트가 이미 사용 중입니다: ${host}:${port}`
            : `${label} 포트 점검에 실패했습니다: ${host}:${port} (${error.message})`,
          { cause: error },
        ),
      );
    });

    server.listen({ host, port, exclusive: true }, () => {
      server.close((error) => {
        if (error) {
          reject(
            new Error(
              `${label} 포트 점검 서버 종료에 실패했습니다: ${host}:${port} (${error.message})`,
              { cause: error },
            ),
          );
          return;
        }

        resolve();
      });
    });
  });
}
