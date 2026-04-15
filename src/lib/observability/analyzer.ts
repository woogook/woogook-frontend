import {
  type ObservabilityConfig,
  parseObservabilityConfig,
} from "@/lib/observability/config";
import { applyBasicAuth, fetchWithTimeout } from "@/lib/observability/http";
import { readRecentObservabilityEvents } from "@/lib/observability/local-file";
import type { ObservabilityEvent } from "@/lib/observability/types";

export type LokiQueryResponse = {
  data?: {
    result?: Array<{
      values?: Array<[string, string]>;
    }>;
  };
};

type FetchRecentIncidentEventsParams = {
  alert: GrafanaAlertPayload;
  config?: ObservabilityConfig;
  maxEvents: number;
  now?: Date;
};

export type GrafanaAlertPayload = {
  title: string;
  status: "firing" | "resolved";
  labels: Record<string, string>;
  annotations?: Record<string, string>;
};

export type IncidentSummary = {
  headline: string;
  rootCauseCandidates: string[];
  impactSummary: string;
  nextActions: string[];
  confidence: "low" | "medium" | "high";
};

function matchesAlertContext(
  event: ObservabilityEvent,
  alert: GrafanaAlertPayload,
) {
  const routeLabel = alert.labels.route;
  const componentLabel = alert.labels.component;
  const routeMatches = routeLabel ? event.route === routeLabel : true;
  const componentMatches =
    routeLabel || !componentLabel ? true : event.component === componentLabel;
  return routeMatches && componentMatches;
}

export function buildLokiIncidentQuery(alert: GrafanaAlertPayload) {
  const streamFilters = ['service="woogook-frontend"'];
  const environment = alert.labels.environment;

  if (environment) {
    streamFilters.push(`environment=${JSON.stringify(environment)}`);
  }

  const pipelineFilters = ["| json"];
  const route = alert.labels.route;
  const component = alert.labels.component;
  const errorName = alert.labels.error_name;

  if (route) {
    pipelineFilters.push(`| route=${JSON.stringify(route)}`);
  } else if (component) {
    pipelineFilters.push(`| component=${JSON.stringify(component)}`);
  }

  if (errorName) {
    pipelineFilters.push(`| errorName=${JSON.stringify(errorName)}`);
  }

  return `{${streamFilters.join(",")}} ${pipelineFilters.join(" ")}`;
}

export function extractEventsFromLokiResponse(payload: LokiQueryResponse) {
  const collected: ObservabilityEvent[] = [];

  for (const stream of payload.data?.result ?? []) {
    for (const [, line] of stream.values ?? []) {
      try {
        collected.push(JSON.parse(line) as ObservabilityEvent);
      } catch {
        continue;
      }
    }
  }

  return collected.sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp),
  );
}

async function queryRecentIncidentEventsFromLoki({
  alert,
  config,
  maxEvents,
  now = new Date(),
}: Required<FetchRecentIncidentEventsParams>) {
  if (!config.lokiQueryUrl) {
    return [];
  }

  const url = new URL(config.lokiQueryUrl);
  const start = new Date(
    now.getTime() - config.analyzerLookbackMinutes * 60 * 1000,
  );
  url.searchParams.set("query", buildLokiIncidentQuery(alert));
  url.searchParams.set("limit", String(maxEvents));
  url.searchParams.set("direction", "backward");
  url.searchParams.set("start", `${start.getTime() * 1_000_000}`);
  url.searchParams.set("end", `${now.getTime() * 1_000_000}`);

  const headers = new Headers();
  applyBasicAuth(headers, config.lokiUsername, config.lokiPassword);

  const response = await fetchWithTimeout(
    url,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
    config.outboundTimeoutMs,
  );

  if (!response.ok) {
    throw new Error(`Loki query failed with status ${response.status}`);
  }

  const payload = (await response.json()) as LokiQueryResponse;
  return extractEventsFromLokiResponse(payload)
    .filter((event) => matchesAlertContext(event, alert))
    .slice(0, maxEvents);
}

export async function fetchRecentIncidentEvents({
  alert,
  config = parseObservabilityConfig(),
  maxEvents,
  now = new Date(),
}: FetchRecentIncidentEventsParams) {
  const localEvents = (
    await readRecentObservabilityEvents({
      rootDir: config.localRootDir,
      maxEvents: Math.max(maxEvents * 3, maxEvents),
    })
  )
    .filter((event) => matchesAlertContext(event, alert))
    .slice(0, maxEvents);

  if (localEvents.length > 0 || config.writeLocalFiles || !config.lokiQueryUrl) {
    return localEvents;
  }

  return queryRecentIncidentEventsFromLoki({
    alert,
    config,
    maxEvents,
    now,
  });
}

export function formatIncidentSummary(summary: IncidentSummary) {
  return [
    `## ${summary.headline}`,
    "",
    `- 영향: ${summary.impactSummary}`,
    `- 신뢰도: ${summary.confidence}`,
    "",
    "### 원인 후보",
    ...summary.rootCauseCandidates.map((item) => `- ${item}`),
    "",
    "### 다음 액션",
    ...summary.nextActions.map((item) => `- ${item}`),
  ].join("\n");
}

export function buildIncidentSummary(
  alert: GrafanaAlertPayload,
  recentEvents: ObservabilityEvent[],
): IncidentSummary {
  const latest = recentEvents[0];
  const route = alert.labels.route ?? latest?.route ?? "unknown route";
  const component = alert.labels.component ?? latest?.component ?? "unknown component";
  const environment = alert.labels.environment ?? latest?.environment ?? "unknown";
  const errorName = alert.labels.error_name ?? latest?.errorName ?? "UnknownError";
  const errorMessage =
    latest?.errorMessage ??
    alert.annotations?.summary ??
    "세부 error message 없음.";
  const latencyLine =
    latest?.latencyMs != null
      ? `최근 관측 latency ${latest.latencyMs}ms.`
      : "최근 latency 정보 없음.";

  return {
    headline: `[${environment}] ${component} incident on ${route}`,
    rootCauseCandidates: [
      `${errorName} 재발 가능성 있음`,
      `${component} 배포 또는 설정 변경 영향 가능성 있음`,
      `${route} upstream 또는 external dependency 이슈 가능성 있음`,
    ],
    impactSummary: `${route} 경로에서 오류 감지됨. ${errorMessage} ${latencyLine}`,
    nextActions: [
      `${route} 최근 error log와 correlation id 확인`,
      `${component} 관련 metric과 release tag 비교`,
      "fingerprint alert 반복 여부와 silence 상태 확인",
    ],
    confidence: recentEvents.length >= 3 ? "high" : recentEvents.length >= 1 ? "medium" : "low",
  };
}
