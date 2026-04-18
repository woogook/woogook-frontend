# 현직 지방의원 상세 사용자 화면 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `local-council` 상세 화면에서 운영·디버깅 정보를 제거하고 실제 의원 정보와 출처 중심의 사용자용 화면으로 정리한다.

**Architecture:** `LocalCouncilPersonDetailView.tsx`에서 진단/spot-check/freshness/샘플 배너 렌더 경로를 제거하고, overlay 섹션은 실제 콘텐츠만 보이도록 축소한다. `tests/local_council_detail.test.ts`와 `e2e/local-council/local-sample.spec.ts`를 먼저 깨고, minimal UI 변경으로 다시 녹색을 만든다.

**Tech Stack:** Next.js 16, React 19, TypeScript, node:test via `tsx`, Playwright smoke spec.

---

## File Map

- Modify: `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
  - 사용자용 상세 화면에서 운영·디버깅 정보 제거
- Modify: `tests/local_council_detail.test.ts`
  - 제거/유지 문자열 기준 재정의
- Modify: `e2e/local-council/local-sample.spec.ts`
  - 사용자 관점 smoke 기대값으로 정리

---

### Task 1: 사용자용 화면 기준을 failing test로 고정한다

**Files:**
- Modify: `tests/local_council_detail.test.ts`
- Modify: `e2e/local-council/local-sample.spec.ts`

- [ ] **Step 1: unit/render test에 제거 기대값을 추가한다**

```ts
assert.doesNotMatch(html, /발행·진단/);
assert.doesNotMatch(html, /설명 가능한 진단/);
assert.doesNotMatch(html, /spot-check/);
assert.doesNotMatch(html, /publishable_degraded/);
assert.doesNotMatch(html, /기준 2026-04-08 10:10:00/);
assert.doesNotMatch(html, /기준 2026-04-08 10:05:00/);
```

- [ ] **Step 2: 유지해야 할 의원 정보는 그대로 보이는지 남긴다**

```ts
assert.match(html, /근거 요약/);
assert.match(html, /강동구청장실 공식 프로필/);
assert.match(html, /제8회 전국동시지방선거 당선 기록/);
assert.match(html, /서울특별시 강동구 청년 지원 조례안/);
assert.match(html, /원문 보기/);
```

- [ ] **Step 3: Playwright smoke에서 진단 섹션 기대를 제거한다**

예시:

```ts
await expect(page.getByText("발행·진단")).toHaveCount(0);
await expect(page.getByText("설명 가능한 진단")).toHaveCount(0);
await expect(page.getByText(/spot-check/)).toHaveCount(0);
```

- [ ] **Step 4: test를 실행해 실패를 확인한다**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_detail.test.ts'
```

Expected: FAIL because the current detail view still renders diagnostics and spot-check sections.

---

### Task 2: 상세 화면에서 운영·디버깅 정보를 제거한다

**Files:**
- Modify: `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`

- [ ] **Step 1: hero 하단의 운영성 문구를 제거한다**

다음 렌더를 없앤다.

```tsx
<p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
  {getLocalCouncilFreshnessLabel(person.freshness)}
</p>
```

```tsx
{dataSource === "local_sample" && (
  <p className="mt-5 rounded-lg border px-4 py-3 text-sm">...</p>
)}
```

- [ ] **Step 2: 진단/설명/spot-check 섹션 전체를 제거한다**

다음 렌더 블록을 삭제한다.

```tsx
<section>
  <h2>발행·진단</h2>
  ...
</section>
```

```tsx
{hasExplainabilitySection ? (
  <section>
    <h2>설명 가능한 진단</h2>
    ...
  </section>
) : null}
```

```tsx
{diagnostics.spotCheckRows.length > 0 ? (
  <section>
    <h2>{diagnostics.spotCheckTitle || "spot-check"}</h2>
    ...
  </section>
) : null}
```

- [ ] **Step 3: overlay를 사용자용 콘텐츠만 남기도록 축소한다**

운영 메타 영역을 제거하고 콘텐츠 리스트와 링크만 남긴다.

```tsx
// 제거 대상 예시
// status badge
// 허용 소스
// 생성 시각
// 대상 member id
// "supplemental surface" 설명 문구
```

- [ ] **Step 4: 근거 요약의 개발자 용어 설명 문장을 정리한다**

현재 문구:

```tsx
summary.evidence_digest와 summary.summary_basis.source_kinds를 그대로 풀어 보여줍니다.
```

이를 사용자용 문장으로 바꾼다.

```tsx
확인된 공식 근거를 바탕으로 핵심 활동과 출처를 정리했습니다.
```

- [ ] **Step 5: render test를 다시 실행해 녹색을 확인한다**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_detail.test.ts'
```

Expected: PASS

---

### Task 3: smoke와 하네스 검증으로 회귀를 막는다

**Files:**
- Modify: `e2e/local-council/local-sample.spec.ts`

- [ ] **Step 1: 샘플 상세 smoke를 사용자용 기대값으로 맞춘다**

남길 확인:

```ts
await expect(getSectionByHeading(page, "근거 요약")).toBeVisible();
await expect(getSectionByHeading(page, "당선 근거")).toBeVisible();
await expect(getSectionByHeading(page, "보강 정보")).toBeVisible();
await expect(page.getByRole("link", { name: "원문 보기" })).toBeVisible();
```

제거 확인:

```ts
await expect(page.getByText("발행·진단")).toHaveCount(0);
await expect(page.getByText("설명 가능한 진단")).toHaveCount(0);
await expect(page.getByText(/spot-check/)).toHaveCount(0);
```

- [ ] **Step 2: smoke를 실행한다**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run e2e:smoke'
```

Expected: `5 passed`

- [ ] **Step 3: lint와 build를 실행한다**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run lint'
```

Expected: exit code 0

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && PATH=/Users/eric/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:/usr/sbin:/sbin npm run build'
```

Expected: build success
