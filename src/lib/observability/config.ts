import path from "node:path";

import type { ObservabilityEnvironment } from "@/lib/observability/types";

const DEFAULT_ROTATE_BYTES = 50 * 1024 * 1024;
const DEFAULT_RETENTION_DAYS = 14;

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
  lokiUsername?: string;
  lokiPassword?: string;
  discordWebhookUrl?: string;
  llmWebhookUrl?: string;
};

export function parseObservabilityConfig(
  env: NodeJS.ProcessEnv = process.env,
): ObservabilityConfig {
  const environment = parseEnvironment(
    trimToUndefined(env.WOOGOOK_OBSERVABILITY_ENV) ??
      trimToUndefined(env.VERCEL_ENV) ??
      trimToUndefined(env.NODE_ENV),
  );

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
    lokiPushUrl: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL),
    lokiUsername: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LOKI_USERNAME),
    lokiPassword: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LOKI_PASSWORD),
    discordWebhookUrl: trimToUndefined(
      env.WOOGOOK_OBSERVABILITY_DISCORD_WEBHOOK_URL,
    ),
    llmWebhookUrl: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LLM_WEBHOOK_URL),
  };
}
