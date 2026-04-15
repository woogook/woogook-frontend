import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CWD = path.resolve(SCRIPT_DIR, "../..");

export const STACK_ENV_KEYS = [
  "GRAFANA_ADMIN_USER",
  "GRAFANA_ADMIN_PASSWORD",
  "GRAFANA_ALERTS_DISCORD_WEBHOOK_URL",
  "GRAFANA_ALERTS_ANALYZER_WEBHOOK_URL",
  "FRONTEND_METRICS_TARGET",
];

export const REQUIRED_STACK_ENV_KEYS = [
  "GRAFANA_ADMIN_USER",
  "GRAFANA_ADMIN_PASSWORD",
  "GRAFANA_ALERTS_ANALYZER_WEBHOOK_URL",
  "FRONTEND_METRICS_TARGET",
];

export function resolveSourceEnvPath({
  cwd = DEFAULT_CWD,
  existsSync = fs.existsSync,
} = {}) {
  const envPath = path.join(cwd, ".env");
  if (existsSync(envPath)) {
    return envPath;
  }

  const examplePath = path.join(cwd, ".env.example");
  if (existsSync(examplePath)) {
    return examplePath;
  }

  throw new Error("root .env or .env.example is required");
}

export function buildStackEnvContent(envMap) {
  return `${STACK_ENV_KEYS.map((key) => `${key}=${envMap[key] ?? ""}`).join("\n")}\n`;
}

export function validateStackEnvMap(envMap) {
  const missingKeys = REQUIRED_STACK_ENV_KEYS.filter((key) => {
    const value = envMap[key];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missingKeys.length > 0) {
    throw new Error(`missing required stack env keys: ${missingKeys.join(", ")}`);
  }
}

export async function syncStackEnv({
  cwd = DEFAULT_CWD,
  existsSync = fs.existsSync,
  readFile = fs.promises.readFile,
  mkdir = fs.promises.mkdir,
  writeFile = fs.promises.writeFile,
} = {}) {
  const sourcePath = resolveSourceEnvPath({ cwd, existsSync });
  const outputPath = path.join(cwd, "ops", "observability", ".env");
  const sourceContent = await readFile(sourcePath, "utf8");
  const envMap = parseEnv(sourceContent);
  validateStackEnvMap(envMap);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buildStackEnvContent(envMap), "utf8");

  return { sourcePath, outputPath };
}

export async function main() {
  const { sourcePath, outputPath } = await syncStackEnv();
  console.log(`synced stack env: ${outputPath} (source: ${sourcePath})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
