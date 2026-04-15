import path from "node:path";

import type { ObservabilityEnvironment } from "@/lib/observability/types";

const DEFAULT_ROTATE_BYTES = 50 * 1024 * 1024;
const DEFAULT_RETENTION_DAYS = 14;
const DEFAULT_OUTBOUND_TIMEOUT_MS = 5_000;
const DEFAULT_ANALYZER_LOOKBACK_MINUTES = 10;
const DEFAULT_LLM_COOLDOWN_SECONDS = 15 * 60;

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback = false) {
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function trimToUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseLlmMode(value: string | undefined): "direct" | "relay" {
  const normalized = value?.trim().toLowerCase();
  return normalized === "relay" ? "relay" : "direct";
}

export function deriveLokiQueryUrl(pushUrl: string | undefined) {
  if (!pushUrl) {
    return undefined;
  }

  if (pushUrl.endsWith("/loki/api/v1/push")) {
    return `${pushUrl.slice(0, -4)}query_range`;
  }

  return undefined;
}

function parseEnvironment(value: string | undefined): ObservabilityEnvironment {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "production") return "production";
  if (normalized === "preview") return "preview";
  return "local";
}

export type ObservabilityConfig = {
  environment: ObservabilityEnvironment;
  release: string;
  localRootDir: string;
  writeLocalFiles: boolean;
  rotateBytes: number;
  retentionDays: number;
  mirrorToCloudInLocal: boolean;
  lokiPushUrl?: string;
  lokiQueryUrl?: string;
  lokiUsername?: string;
  lokiPassword?: string;
  discordWebhookUrl?: string;
  llmWebhookUrl?: string;
  llmMode?: "direct" | "relay";
  llmProvider?: string;
  llmApiUrl?: string;
  llmApiKey?: string;
  llmModel?: string;
  llmCooldownSeconds?: number;
  outboundTimeoutMs: number;
  analyzerLookbackMinutes: number;
};

export function parseObservabilityConfig(
  env: NodeJS.ProcessEnv = process.env,
): ObservabilityConfig {
  const environment = parseEnvironment(
    trimToUndefined(env.WOOGOOK_OBSERVABILITY_ENV) ??
      trimToUndefined(env.VERCEL_ENV) ??
      trimToUndefined(env.NODE_ENV),
  );
  const lokiPushUrl = trimToUndefined(env.WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL);

  return {
    environment,
    release:
      trimToUndefined(env.WOOGOOK_OBSERVABILITY_RELEASE) ??
      trimToUndefined(env.VERCEL_GIT_COMMIT_SHA) ??
      "local-dev",
    localRootDir:
      trimToUndefined(env.WOOGOOK_OBSERVABILITY_LOCAL_ROOT_DIR) ??
      path.join(process.cwd(), ".logs", "frontend"),
    writeLocalFiles:
      trimToUndefined(env.WOOGOOK_OBSERVABILITY_WRITE_LOCAL_FILES) != null
        ? parseBoolean(trimToUndefined(env.WOOGOOK_OBSERVABILITY_WRITE_LOCAL_FILES))
        : environment === "local",
    rotateBytes: parsePositiveInt(
      trimToUndefined(env.WOOGOOK_OBSERVABILITY_ROTATE_BYTES),
      DEFAULT_ROTATE_BYTES,
    ),
    retentionDays: parsePositiveInt(
      trimToUndefined(env.WOOGOOK_OBSERVABILITY_RETENTION_DAYS),
      DEFAULT_RETENTION_DAYS,
    ),
    mirrorToCloudInLocal: parseBoolean(
      trimToUndefined(env.WOOGOOK_OBSERVABILITY_LOCAL_MIRROR_TO_CLOUD),
    ),
    lokiPushUrl,
    lokiQueryUrl:
      trimToUndefined(env.WOOGOOK_OBSERVABILITY_LOKI_QUERY_URL) ??
      deriveLokiQueryUrl(lokiPushUrl),
    lokiUsername: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LOKI_USERNAME),
    lokiPassword: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LOKI_PASSWORD),
    discordWebhookUrl: trimToUndefined(
      env.WOOGOOK_OBSERVABILITY_DISCORD_WEBHOOK_URL,
    ),
    llmWebhookUrl: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LLM_WEBHOOK_URL),
    llmMode: parseLlmMode(trimToUndefined(env.WOOGOOK_OBSERVABILITY_LLM_MODE)),
    llmProvider:
      trimToUndefined(env.WOOGOOK_OBSERVABILITY_LLM_PROVIDER) ?? "upstage",
    llmApiUrl: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LLM_API_URL),
    llmApiKey: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LLM_API_KEY),
    llmModel: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LLM_MODEL),
    llmCooldownSeconds: parsePositiveInt(
      trimToUndefined(env.WOOGOOK_OBSERVABILITY_LLM_COOLDOWN_SECONDS),
      DEFAULT_LLM_COOLDOWN_SECONDS,
    ),
    outboundTimeoutMs: parsePositiveInt(
      trimToUndefined(env.WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS),
      DEFAULT_OUTBOUND_TIMEOUT_MS,
    ),
    analyzerLookbackMinutes: parsePositiveInt(
      trimToUndefined(env.WOOGOOK_OBSERVABILITY_ANALYZER_LOOKBACK_MINUTES),
      DEFAULT_ANALYZER_LOOKBACK_MINUTES,
    ),
  };
}
