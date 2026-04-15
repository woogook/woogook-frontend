# Assembly / Local-Council Observability Direct LLM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `assembly`와 `local-council` 도메인에 공통 observability를 확장하고, analyzer가 `Upstage Solar Pro 2`를 직접 호출해 `Discord`로 incident summary를 보내게 한다.

**Architecture:** 기존 observability 수집 계층은 유지하고, 공통 backend proxy helper와 analyzer policy/provider adapter를 추가한다. `Grafana -> analyzer -> Discord` 경로를 기본으로 두되, direct provider 호출은 adapter와 mode env로 감싸 이후 relay 이관이 가능하게 설계한다.

**Tech Stack:** `Next.js 16`, `React 19`, `TypeScript`, `Vitest`, `Zod`, `prom-client`, `Grafana`, `Loki`, `Prometheus`

---

### Task 1: 공통 backend proxy와 도메인 route observability 정리

**Files:**
- Create: `src/app/api/_shared/backend-proxy.ts`
- Modify: `src/app/api/assembly/v1/members/[mona_cd]/card/route.ts`
- Modify: `src/app/api/assembly/v1/members/[mona_cd]/pledges/route.ts`
- Modify: `src/app/api/assembly/v1/members/[mona_cd]/pledge-summary/route.ts`
- Modify: `src/app/api/local-council/v1/_shared.ts`
- Modify: `src/app/api/local-council/v1/resolve/route.ts`
- Modify: `src/app/api/local-council/v1/districts/[guCode]/roster/route.ts`
- Modify: `src/app/api/local-council/v1/persons/[personKey]/route.ts`
- Test: `src/app/api/local-council/v1/_shared.test.ts`

- [ ] **Step 1: failing test로 local-council proxy observability 계약을 고정**

```ts
it("logs missing backend base url and propagates correlation id", async () => {
  const response = await proxyLocalCouncilToBackend(request, "/api/local-council/v1/resolve");
  expect(logServerEventMock).toHaveBeenCalledWith(
    expect.objectContaining({
      component: "proxy",
      httpStatus: 503,
      errorName: "MissingBackendBaseUrl",
    }),
  );
  expect(response.status).toBe(503);
});
```

- [ ] **Step 2: test 실패 확인**

Run: `zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx vitest run src/app/api/local-council/v1/_shared.test.ts'`
Expected: FAIL because test file/helper contract does not exist yet

- [ ] **Step 3: 공통 backend proxy와 local-council thin wrapper 구현**

```ts
export async function proxyToBackendWithObservability(params: {
  request: Request;
  path: string;
  init?: RequestInit;
  missingBackendMessage: string;
  unavailableMessage: string;
}) {
  // backend url 확인, correlation id propagation, structured logging, response relay
}
```

- [ ] **Step 4: assembly/local-council route를 observeRoute + 공통 proxy로 정리**

```ts
export async function GET(request: Request, context: { params: Promise<{ mona_cd: string }> }) {
  return observeRoute(request, "assembly/v1/members/[mona_cd]/card", async () => {
    const { mona_cd } = await context.params;
    return proxyToBackendWithObservability({
      request,
      path: `/api/assembly/v1/members/${encodeURIComponent(mona_cd)}/card`,
      missingBackendMessage: "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
      unavailableMessage: "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    });
  });
}
```

- [ ] **Step 5: 테스트 재실행**

Run: `zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx vitest run src/app/api/local-council/v1/_shared.test.ts'`
Expected: PASS

### Task 2: analyzer policy와 direct provider adapter 추가

**Files:**
- Create: `src/lib/observability/incident-policy.ts`
- Create: `src/lib/observability/providers/types.ts`
- Create: `src/lib/observability/providers/upstage.ts`
- Create: `src/lib/observability/providers/index.ts`
- Create: `src/lib/observability/discord.ts`
- Modify: `src/lib/observability/config.ts`
- Modify: `src/lib/observability/analyzer.ts`
- Modify: `src/app/api/observability/analyzer/route.ts`
- Test: `src/lib/observability/config.test.ts`
- Test: `src/lib/observability/analyzer.test.ts`
- Test: `src/app/api/observability/analyzer/route.test.ts`

- [ ] **Step 1: failing test로 alert filtering, cooldown, direct provider 계약을 고정**

```ts
it("analyzes only firing severity=error alerts owned by frontend-observability", () => {
  expect(shouldAnalyzeAlert(payload)).toBe(true);
});

it("calls Upstage direct provider and falls back to baseline on provider failure", async () => {
  const result = await summarizeIncident(...);
  expect(result.summary.headline).toContain("incident");
});
```

- [ ] **Step 2: test 실패 확인**

Run: `zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx vitest run src/lib/observability/analyzer.test.ts src/app/api/observability/analyzer/route.test.ts src/lib/observability/config.test.ts'`
Expected: FAIL because policy/provider/route behavior is not implemented yet

- [ ] **Step 3: config에 direct/relay, provider, cooldown env 추가**

```ts
llmMode: parseLlmMode(env.WOOGOOK_OBSERVABILITY_LLM_MODE),
llmProvider: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LLM_PROVIDER) ?? "upstage",
llmApiUrl: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LLM_API_URL),
llmApiKey: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LLM_API_KEY),
llmModel: trimToUndefined(env.WOOGOOK_OBSERVABILITY_LLM_MODEL),
llmCooldownSeconds: parsePositiveInt(env.WOOGOOK_OBSERVABILITY_LLM_COOLDOWN_SECONDS, 900),
```

- [ ] **Step 4: analyzer policy / provider adapter / Discord formatter 구현**

```ts
export function shouldAnalyzeAlert(alert: GrafanaAlertPayload) {
  return alert.status === "firing"
    && alert.labels.team === "frontend-observability"
    && alert.labels.severity === "error"
    && alert.labels.llm_analysis !== "disabled";
}

export async function invokeDirectProvider(params: DirectProviderParams): Promise<IncidentSummary> {
  // Upstage chat completions 호출 및 응답 파싱
}
```

- [ ] **Step 5: analyzer route를 policy + direct provider + fallback + cooldown 구조로 교체**

```ts
if (!shouldAnalyzeAlert(payload)) {
  return NextResponse.json({ skipped: true, reason: "alert filtered" });
}

const cooldown = await shouldSkipIncidentByCooldown(...);
if (cooldown.skip) {
  return NextResponse.json({ skipped: true, reason: "cooldown" });
}
```

- [ ] **Step 6: 테스트 재실행**

Run: `zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx vitest run src/lib/observability/analyzer.test.ts src/app/api/observability/analyzer/route.test.ts src/lib/observability/config.test.ts'`
Expected: PASS

### Task 3: Grafana alert routing과 local 검증 자산 업데이트

**Files:**
- Modify: `ops/observability/grafana/provisioning/alerting/contact-points.yml`
- Modify: `ops/observability/grafana/provisioning/alerting/notification-policies.yml`
- Modify: `ops/observability/grafana/provisioning/alerting/rules.yml`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/common/runbooks/frontend-observability-local-runbook.md`
- Create: `tmp/adr/260415/260415-<time>-assembly-local-council-observability-direct-llm.md`

- [ ] **Step 1: failing assertion으로 Grafana policy와 env 문서 계약을 고정**

```bash
rg -n "severity: error|analyzer webhook|WOOGOOK_OBSERVABILITY_LLM_API_KEY" \
  ops/observability/grafana/provisioning/alerting/rules.yml \
  ops/observability/grafana/provisioning/alerting/contact-points.yml \
  .env.example README.md docs/common/runbooks/frontend-observability-local-runbook.md
```

Expected: initial gaps identified manually before edits

- [ ] **Step 2: analyzer webhook receiver와 routing rule 반영**

```yaml
- uid: frontend_analyzer
  type: webhook
  settings:
    url: http://host.docker.internal:3000/api/observability/analyzer
```

- [ ] **Step 3: alert rule label과 env 문서 업데이트**

```yaml
labels:
  team: frontend-observability
  severity: error
```

- [ ] **Step 4: ADR와 runbook에 후속 계획 및 local-election 제외 범위를 기록**

```md
- 이번 세션 구현 범위는 `assembly`, `local-council`
- `local-election` observability 확장은 후속 작업으로 분리
- analyzer는 direct `Upstage Solar Pro 2` 호출, 장기적으로 relay 이관 예정
```

- [ ] **Step 5: 정적 확인**

Run: `zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run observability:stack:config'`
Expected: `docker compose ... config` 성공

### Task 4: 전체 검증, pre-push review, PR 준비

**Files:**
- Modify: touched files only as review feedback requires

- [ ] **Step 1: 전체 테스트와 lint 실행**

Run: `zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm test && npm run lint'`
Expected: PASS

- [ ] **Step 2: observability 관련 focused 검증 실행**

Run: `zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run observability:stack:config'`
Expected: PASS

- [ ] **Step 3: pre-push review 반복**

Run:
```bash
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
```

Expected: review findings를 문서화하고, 중요한 문제를 모두 수정한 뒤 findings가 없어질 때까지 반복

- [ ] **Step 4: commit / push / PR**

Run:
```bash
git add <touched-files>
git commit -m "feat(observability): 국회의원·지방의원 direct LLM incident analysis 추가"
git push -u origin codex/observability-assembly-local-council
```

Expected: branch pushed and PR ready
