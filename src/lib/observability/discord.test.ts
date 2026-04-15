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
});
