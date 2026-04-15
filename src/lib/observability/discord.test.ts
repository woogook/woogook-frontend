import { describe, expect, it } from "vitest";

import { formatDiscordIncidentMessage } from "@/lib/observability/discord";

describe("formatDiscordIncidentMessage", () => {
  it("formats Discord messages with concise nested bullet lists and code hints", () => {
    const message = formatDiscordIncidentMessage({
      alert: {
        title: "AssemblyBackendUnavailable",
        status: "firing",
        labels: {
          route: "assembly/v1/members",
          component: "proxy",
          error_name: "MissingBackendBaseUrl",
        },
      },
      incidentKey: "AssemblyBackendUnavailable|assembly/v1/members|proxy|local",
      recentEventCount: 2,
      summary: {
        headline: "[local] proxy incident on assembly/v1/members",
        impactSummary: "assembly/v1/members 경로에서 오류 감지됨.",
        rootCauseCandidates: ["MissingBackendBaseUrl 재발 가능성 있음"],
        nextActions: ["assembly/v1/members 최근 error log와 correlation id 확인"],
        confidence: "medium",
      },
    });

    expect(message).toContain("- 개요");
    expect(message).toContain("## [local] `proxy` incident on `assembly/v1/members`");
    expect(message).toContain("  - alert: `AssemblyBackendUnavailable`");
    expect(message).toContain("  - route: `assembly/v1/members`");
    expect(message).toContain("  - component: `proxy`");
    expect(message).toContain("- 영향");
    expect(message).toContain("  - `assembly/v1/members` 경로에서 오류 감지됨.");
    expect(message).toContain("  - `MissingBackendBaseUrl` 재발 가능성 있음");
    expect(message).toContain("- 확인할 코드");
    expect(message).toContain("  - `src/app/api/assembly/v1/members/route.ts`");
    expect(message).toContain("    - `GET`에서 `pathWithQuery`");
    expect(message).toContain("  - `src/app/api/_shared/backend-proxy.ts`");
    expect(message).toContain("  - `.env`");
    expect(message).toContain("    - `WOOGOOK_BACKEND_BASE_URL` 값");
    expect(message).toContain("- 다음 액션");
    expect(message).toContain("  - `assembly/v1/members` 최근 `error log`와 `correlation id` 확인");
  });

  it("does not double-wrap tokens already inside backticks or match partial words", () => {
    const message = formatDiscordIncidentMessage({
      alert: {
        title: "ApiAlert",
        status: "firing",
        labels: {
          route: "observability/dev/fail",
          component: "api",
          error_name: "ProxyError",
        },
      },
      incidentKey: "ApiAlert|observability/dev/fail|api|local",
      recentEventCount: 1,
      summary: {
        headline: "[local] api incident on observability/dev/fail",
        impactSummary:
          "이미 `ApiAlert|observability/dev/fail|api|local` 로 표시된 incident key와 rapid fallback을 함께 본다.",
        rootCauseCandidates: ["api upstream 또는 external dependency 이슈 가능성 있음"],
        nextActions: ["rapid fallback 중 api metric과 error log를 함께 확인"],
        confidence: "low",
      },
    });

    expect(message).toContain("이미 `ApiAlert|observability/dev/fail|api|local` 로 표시된");
    expect(message).not.toContain("``ApiAlert|observability/dev/fail|api|local``");
    expect(message).toContain("rapid fallback");
    expect(message).not.toContain("r`api`d");
    expect(message).toContain("`api` `metric`과 `error log`");
  });
});
