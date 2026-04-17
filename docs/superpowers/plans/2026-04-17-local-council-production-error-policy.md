# Local-Council Production Error Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영 환경에서는 `local-council` projection 누락 오류를 sample fallback으로 숨기지 않고 명시적 오류로 노출하고, local/dev/smoke 환경에서는 기존 sample fallback 기반 검증 흐름을 유지한다.

**Architecture:** `src/lib/api-client.ts`에서 local-council sample fallback 허용 여부를 환경 기준으로 결정하고, production에서는 지원 구역 projection 누락 404와 backend 불가용 오류를 사용자용 메시지로 surface한다. smoke harness는 기존처럼 backend base URL을 비워 sample 경로만 검증하도록 유지하고, 관련 테스트를 운영/개발 정책 기준으로 분리한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Playwright, Vitest, tsx/node test

---

### Task 1: fallback 정책 테스트 고정

**Files:**
- Modify: `tests/local_council_api_client.test.ts`
- Modify: `scripts/e2e/local-council-config.test.mjs`

- [ ] **Step 1: 운영 환경에서 projection 누락 404를 fallback하지 않는 테스트를 추가한다**

```ts
test("fetchLocalCouncilResolve surfaces a production-safe error when backend returns a Gangdong roster-missing 404 in production", async () => {
  process.env.NODE_ENV = "production";
  // fetch returns 404 detail: local council roster not found: 11740
  // expect ApiError with production-safe message
});
```

- [ ] **Step 2: 테스트가 기대대로 실패하는지 확인한다**

Run: `npx --yes tsx --test tests/local_council_api_client.test.ts`
Expected: 새 production 테스트가 실패하고, 기존 fallback 테스트와 충돌하는 위치가 드러난다.

- [ ] **Step 3: dev/smoke에서 sample fallback을 유지하는 테스트를 추가한다**

```js
it("smoke env clears ambient backend base URL and keeps sample-only execution", () => {
  const env = getSmokePlaywrightEnv({ WOOGOOK_BACKEND_BASE_URL: "https://api.woogook.kr" });
  expect(env.WOOGOOK_BACKEND_BASE_URL).toBe("");
});
```

- [ ] **Step 4: config 테스트가 통과하도록 필요한 smoke command/env expectations를 정리한다**

Run: `npx vitest run scripts/e2e/local-council-config.test.mjs`
Expected: smoke harness 관련 테스트가 통과하거나, 구현 전 필요한 expectation mismatch만 남는다.

### Task 2: 운영/개발 정책 분기 구현

**Files:**
- Modify: `src/lib/api-client.ts`
- Modify: `src/features/local-council/LocalCouncilPage.tsx`
- Modify: `src/features/local-council/components/LocalCouncilRosterView.tsx`

- [ ] **Step 1: fallback 허용 여부 helper를 추가한다**

```ts
function canUseLocalCouncilSampleFallback() {
  return process.env.NODE_ENV !== "production";
}
```

- [ ] **Step 2: resolve/roster/person fetch에서 production fallback을 막고 사용자용 오류 메시지로 치환한다**

```ts
if (canUseLocalCouncilSampleFallback() && isGangdongSelection(selection) && isBackendUnavailableError(error)) {
  return sampleResult;
}

if (isGangdongSelection(selection) && isGangdongRosterMissingError(error)) {
  throw new ApiError(
    503,
    "현직 지방의원 공식 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
  );
}
```

- [ ] **Step 3: 주소 단계 경고 문구를 운영 오류 의미에 맞게 조정한다**

```tsx
<LocalCouncilAddressStep
  error={error}
  errorTitle="서비스 운영 오류"
/>
```

- [ ] **Step 4: sample 안내 문구를 개발 전용 의미로 유지한다**

```tsx
{dataSource === "local_sample" && (
  <p>공식 데이터를 연결하지 않은 개발/검증 환경이라 강동구 샘플 데이터로 미리보기합니다.</p>
)}
```

- [ ] **Step 5: local-council API client 테스트를 다시 실행한다**

Run: `npx --yes tsx --test tests/local_council_api_client.test.ts`
Expected: production/dev 정책 테스트를 포함해 모두 PASS

### Task 3: smoke 회귀와 review 검증

**Files:**
- Modify: `package.json`
- Modify: `scripts/e2e/local-council-harness.mjs`
- Modify: `scripts/e2e/local-council-smoke.mjs`
- Modify: `e2e/local-council/local-sample.spec.ts`

- [ ] **Step 1: smoke harness를 backend URL 비움 정책에 맞게 유지한다**

```bash
npm run e2e:smoke
```

Expected: `.env`의 `WOOGOOK_BACKEND_BASE_URL`이 있어도 smoke는 sample 경로만 본다.

- [ ] **Step 2: sample fixture와 locator 기대값을 현재 렌더링 기준과 맞춘다**

```ts
await expect(billsSection.getByText("서울특별시 강동구 청년 지원 조례안").first()).toBeVisible();
await expect(meetingsSection.getByText("제322회 임시회 · 구정질문")).toBeVisible();
```

- [ ] **Step 3: 전체 검증을 실행한다**

Run: `npx --yes tsx --test tests/local_council_api_client.test.ts`
Expected: PASS

Run: `npx vitest run scripts/e2e/local-council-config.test.mjs`
Expected: PASS

Run: `npm run e2e:smoke`
Expected: `4 passed`

Run: `npm run lint`
Expected: exit code 0

Run: `npm run build`
Expected: exit code 0

- [ ] **Step 4: pre-push review를 수행한다**

검토 항목:
- production에서 fallback이 조용히 발생하지 않는지
- local/dev/smoke에서만 sample 배지가 보이는지
- 오류 메시지가 raw backend detail을 그대로 노출하지 않는지
- smoke harness가 `.env` 오염을 막는지

- [ ] **Step 5: 커밋한다**

```bash
git add src/lib/api-client.ts src/features/local-council/LocalCouncilPage.tsx src/features/local-council/components/LocalCouncilRosterView.tsx tests/local_council_api_client.test.ts scripts/e2e/local-council-config.test.mjs scripts/e2e/local-council-harness.mjs scripts/e2e/local-council-smoke.mjs e2e/local-council/local-sample.spec.ts package.json docs/superpowers/plans/2026-04-17-local-council-production-error-policy.md
git commit -m "fix(local-council): 운영 오류와 개발 fallback 정책 분리"
```
