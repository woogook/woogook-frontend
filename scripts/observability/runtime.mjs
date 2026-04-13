const DEFAULT_FRONTEND_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_GRAFANA_BASE_URL = "http://127.0.0.1:3001";
const DEFAULT_PROMETHEUS_BASE_URL = "http://127.0.0.1:9090";
const DEFAULT_LOKI_BASE_URL = "http://127.0.0.1:3100";
const DEFAULT_HEALTHCHECK_RETRY_ATTEMPTS = 12;
const DEFAULT_HEALTHCHECK_RETRY_DELAY_MS = 2500;
const DEFAULT_SYNTHETIC_EMIT_ATTEMPTS = 2;
const DEFAULT_SYNTHETIC_EMIT_DELAY_MS = 7000;

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function resolveBaseUrl(value, fallback) {
  return value ? trimTrailingSlash(value.trim()) : fallback;
}

function parsePositiveInt(value, fallback) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getFrontendBaseUrl(env = process.env) {
  return resolveBaseUrl(
    env.WOOGOOK_OBSERVABILITY_FRONTEND_BASE_URL ?? env.FRONTEND_BASE_URL,
    DEFAULT_FRONTEND_BASE_URL,
  );
}

export function getGrafanaBaseUrl(env = process.env) {
  return resolveBaseUrl(env.GRAFANA_BASE_URL, DEFAULT_GRAFANA_BASE_URL);
}

export function getPrometheusBaseUrl(env = process.env) {
  return resolveBaseUrl(env.PROMETHEUS_BASE_URL, DEFAULT_PROMETHEUS_BASE_URL);
}

export function getLokiBaseUrl(env = process.env) {
  return resolveBaseUrl(env.LOKI_BASE_URL, DEFAULT_LOKI_BASE_URL);
}

export function getHealthcheckRetryAttempts(env = process.env) {
  return parsePositiveInt(
    env.OBSERVABILITY_HEALTHCHECK_RETRY_ATTEMPTS,
    DEFAULT_HEALTHCHECK_RETRY_ATTEMPTS,
  );
}

export function getHealthcheckRetryDelayMs(env = process.env) {
  return parsePositiveInt(
    env.OBSERVABILITY_HEALTHCHECK_RETRY_DELAY_MS,
    DEFAULT_HEALTHCHECK_RETRY_DELAY_MS,
  );
}

export function getSyntheticEmitAttempts(env = process.env) {
  return parsePositiveInt(
    env.OBSERVABILITY_SYNTHETIC_EMIT_ATTEMPTS,
    DEFAULT_SYNTHETIC_EMIT_ATTEMPTS,
  );
}

export function getSyntheticEmitDelayMs(env = process.env) {
  return parsePositiveInt(
    env.OBSERVABILITY_SYNTHETIC_EMIT_DELAY_MS,
    DEFAULT_SYNTHETIC_EMIT_DELAY_MS,
  );
}

export function buildSyntheticFailUrl(baseUrl, status = 503, extraParams = {}) {
  const url = new URL("/api/observability/dev/fail", trimTrailingSlash(baseUrl));
  url.searchParams.set("status", String(status));

  for (const [key, value] of Object.entries(extraParams)) {
    if (value == null) {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export function buildBrowserErrorBatch({
  route = "/synthetic/browser-error",
  sessionId = "synthetic-browser-session",
  errorName = "SyntheticBrowserError",
  errorMessage = "Synthetic browser error for alert verification",
  userAction = "synthetic-browser-error",
  correlationId = "synthetic-browser-correlation",
} = {}) {
  return {
    sessionId,
    events: [
      {
        timestamp: new Date().toISOString(),
        level: "error",
        signalType: "browser_error",
        route,
        userAction,
        errorName,
        errorMessage,
        correlationId,
        context: {
          source: "observability-script",
        },
      },
    ],
  };
}

export async function requestJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

export async function postJson(url, payload, init = {}) {
  return requestJson(url, {
    ...init,
    method: init.method ?? "POST",
    body: JSON.stringify(payload),
  });
}

export function assertOk(response, label) {
  if (!response.ok) {
    throw new Error(`${label} failed with status ${response.status}`);
  }
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForOk(
  url,
  label,
  {
    attempts = DEFAULT_HEALTHCHECK_RETRY_ATTEMPTS,
    delayMs = DEFAULT_HEALTHCHECK_RETRY_DELAY_MS,
  } = {},
) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        return response;
      }

      const body = await response.text().catch(() => "");
      lastError = new Error(
        `${label} failed with status ${response.status}${body ? `: ${body}` : ""}`,
      );
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) {
      await sleep(delayMs);
    }
  }

  throw lastError ?? new Error(`${label} failed`);
}
