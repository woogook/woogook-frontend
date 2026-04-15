import type { IncidentSummary, GrafanaAlertPayload } from "@/lib/observability/analyzer";
import { fetchWithTimeout } from "@/lib/observability/http";

type FormatDiscordIncidentMessageParams = {
  alert: GrafanaAlertPayload;
  incidentKey: string;
  recentEventCount: number;
  summary: IncidentSummary;
};

type CodeReference = {
  filePath: string;
  checks: string[];
};

const CONFIDENCE_LABELS: Record<IncidentSummary["confidence"], string> = {
  low: "낮음",
  medium: "중간",
  high: "높음",
};

const SHARED_IMPORTANT_TERMS = [
  "error log",
  "correlation id",
  "release tag",
  "fingerprint",
  "silence",
  "metric",
  "metrics",
  "latency",
  "external dependency",
  "upstream",
  "WOOGOOK_BACKEND_BASE_URL",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wrapImportantTerms(
  text: string,
  params: {
    alert: GrafanaAlertPayload;
    incidentKey: string;
  },
) {
  const tokens = [
    params.alert.labels.route,
    params.alert.labels.component,
    params.alert.labels.error_name,
    params.alert.title,
    params.incidentKey,
    ...SHARED_IMPORTANT_TERMS,
  ].filter((value): value is string => Boolean(value && value.trim()));

  let formatted = text;
  for (const token of [...new Set(tokens)].sort((left, right) => right.length - left.length)) {
    const pattern = new RegExp(`(?<!\`)${escapeRegExp(token)}(?!\`)`, "g");
    formatted = formatted.replace(pattern, `\`${token}\``);
  }

  return formatted;
}

function appendCodeReference(
  references: CodeReference[],
  filePath: string,
  checks: string[],
) {
  const existing = references.find((reference) => reference.filePath === filePath);
  if (existing) {
    for (const check of checks) {
      if (!existing.checks.includes(check)) {
        existing.checks.push(check);
      }
    }
    return;
  }

  references.push({ filePath, checks: [...checks] });
}

function addRouteCodeReferences(
  references: CodeReference[],
  route: string | undefined,
) {
  if (!route) {
    return;
  }

  if (route === "assembly/v1/members") {
    appendCodeReference(references, "src/app/api/assembly/v1/members/route.ts", [
      "`GET`에서 `pathWithQuery`와 query forwarding 확인",
      "`observableRoute`가 `assembly/v1/members`로 고정되는지 확인",
    ]);
    return;
  }

  if (route === "local-council/v1/resolve") {
    appendCodeReference(
      references,
      "src/app/api/local-council/v1/resolve/route.ts",
      [
        "`GET`의 `address` validation 분기 확인",
        "`proxyLocalCouncilToBackend`로 넘기는 query와 `observableRoute` 확인",
      ],
    );
    appendCodeReference(references, "src/app/api/local-council/v1/_shared.ts", [
      "`proxyLocalCouncilToBackend`의 에러 메시지와 wrapper 호출 확인",
    ]);
    return;
  }

  if (route === "observability/dev/fail") {
    appendCodeReference(
      references,
      "src/app/api/observability/dev/fail/route.ts",
      [
        "`parseStatus`와 `reason` 파라미터 처리 확인",
        "`logServerEvent`에 기록되는 `errorName`, `httpStatus` 확인",
      ],
    );
  }
}

function addComponentCodeReferences(
  references: CodeReference[],
  params: {
    component: string | undefined;
    route: string | undefined;
    errorName: string | undefined;
  },
) {
  const { component, route, errorName } = params;

  if (component === "proxy") {
    appendCodeReference(
      references,
      "src/app/api/_shared/backend-proxy.ts",
      [
        "`getBackendBaseUrl`에서 `WOOGOOK_BACKEND_BASE_URL` 로드 확인",
        "`proxyToBackendWithObservability`의 `fetchWithTimeout`, `MissingBackendBaseUrl`, `ProxyFetchError` 분기 확인",
      ],
    );
    appendCodeReference(references, ".env", [
      "`WOOGOOK_BACKEND_BASE_URL` 값과 trailing slash, inline comment 상태 확인",
    ]);
  }

  if (
    component === "browser" ||
    route === "/synthetic/browser-error" ||
    route === "observability/browser-events"
  ) {
    appendCodeReference(references, "src/lib/observability/client.ts", [
      "`reportBrowserError`, `reportClientApiFailure`, `sendBrowserEvents` 흐름 확인",
      "`route`, `errorMessage`, `correlationId`가 browser event payload에 실리는지 확인",
    ]);
    appendCodeReference(
      references,
      "src/app/api/observability/browser-events/route.ts",
      [
        "`POST`에서 payload parse와 `logServerEvent` 필드 매핑 확인",
        "`recordBrowserEventMetric` 호출과 batch loop 확인",
      ],
    );
  }

  if (errorName === "MissingBackendBaseUrl") {
    appendCodeReference(references, ".env", [
      "`WOOGOOK_BACKEND_BASE_URL` 값이 비어 있지 않은지 확인",
    ]);
  }
}

function buildCodeReferences(alert: GrafanaAlertPayload) {
  const references: CodeReference[] = [];
  const route = alert.labels.route;
  const component = alert.labels.component;
  const errorName = alert.labels.error_name;

  addRouteCodeReferences(references, route);
  addComponentCodeReferences(references, { component, route, errorName });

  return references;
}

export function formatDiscordIncidentMessage({
  alert,
  incidentKey,
  recentEventCount,
  summary,
}: FormatDiscordIncidentMessageParams) {
  const codeReferences = buildCodeReferences(alert);
  const formatNarrative = (text: string) =>
    wrapImportantTerms(text, { alert, incidentKey });

  return [
    `## ${formatNarrative(summary.headline)}`,
    "",
    "- 개요",
    `  - alert: \`${alert.title}\``,
    `  - route: \`${alert.labels.route ?? "unknown"}\``,
    `  - component: \`${alert.labels.component ?? "unknown"}\``,
    `  - 신뢰도: ${CONFIDENCE_LABELS[summary.confidence] ?? summary.confidence}`,
    `  - 최근 이벤트: ${recentEventCount}`,
    `  - incident key: \`${incidentKey}\``,
    "",
    "- 영향",
    `  - ${formatNarrative(summary.impactSummary)}`,
    "",
    "- 원인 후보",
    ...summary.rootCauseCandidates.map((item) => `  - ${formatNarrative(item)}`),
    "",
    ...(codeReferences.length > 0
      ? [
          "- 확인할 코드",
          ...codeReferences.flatMap((reference) => [
            `  - \`${reference.filePath}\``,
            ...reference.checks.map((check) => `    - ${check}`),
          ]),
          "",
        ]
      : []),
    "- 다음 액션",
    ...summary.nextActions.map((item) => `  - ${formatNarrative(item)}`),
  ].join("\n");
}

export async function sendDiscordMessage(params: {
  url: string | undefined;
  content: string;
  timeoutMs: number;
}) {
  if (!params.url) {
    return;
  }

  const response = await fetchWithTimeout(
    params.url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: params.content }),
      cache: "no-store",
    },
    params.timeoutMs,
  );

  if (!response.ok) {
    throw new Error(`Discord webhook failed with status ${response.status}`);
  }
}
