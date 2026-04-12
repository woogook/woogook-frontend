import type { ObservabilityEvent } from "@/lib/observability/types";

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

export function formatIncidentSummary(summary: IncidentSummary) {
  return [
    `## ${summary.headline}`,
    "",
    `- 영향 요약: ${summary.impactSummary}`,
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
  const errorMessage = latest?.errorMessage ?? alert.annotations?.summary ?? "세부 오류 메시지가 없습니다.";
  const latencyLine =
    latest?.latencyMs != null ? `최근 관측 latency는 ${latest.latencyMs}ms입니다.` : "최근 latency 정보는 없습니다.";

  return {
    headline: `[${environment}] ${component} incident on ${route}`,
    rootCauseCandidates: [
      `${errorName} 발생 여부를 먼저 확인합니다.`,
      `${component}의 최근 배포와 설정 변경 이력을 확인합니다.`,
      `${route}가 의존하는 외부 자원 또는 upstream 상태를 점검합니다.`,
    ],
    impactSummary: `${route} 경로에서 오류가 감지되었습니다. ${errorMessage} ${latencyLine}`,
    nextActions: [
      `${route} 최근 오류 로그와 correlation id를 확인합니다.`,
      `${component} 관련 메트릭과 release 태그를 함께 비교합니다.`,
      "동일 fingerprint 알림이 반복되는지 silence 전 상태를 점검합니다.",
    ],
    confidence: recentEvents.length >= 3 ? "high" : recentEvents.length >= 1 ? "medium" : "low",
  };
}
