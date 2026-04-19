# Assembly Front Completion Threshold Implementation Plan

> Superseded: 이 프론트-only 계획은 백엔드가 `score >= 4.5` 기준 summary/list contract를 내려주는 Backend-first 계획으로 대체되었습니다. 최신 계획은 `woogook-backend/docs/superpowers/plans/2026-04-19-assembly-score-threshold-summary-contract.md`를 기준으로 사용하세요.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공약 이행률 프론트 화면에서 4.5점 이상 공약을 `완료단계`로 재분류해 요약 막대와 상세 배지가 같은 기준으로 보이게 한다.

**Architecture:** 백엔드 요약 응답의 `progress_breakdown`은 `progress_bucket` 기준이라 완료가 0건이 될 수 있으므로, 프론트에서 상세 공약 목록의 `score`를 가져와 화면 표시용 breakdown을 재계산한다. 기존 API contract는 유지하고, 화면 전용 helper에서만 `score >= 4.5`를 `완료단계`로 override한다.

**Tech Stack:** Next.js 16, React 19, TanStack Query, TypeScript, Zod, Vitest.

---

## File Structure

- Modify: `src/features/assembly/AssemblyPledgeRatePage.tsx`
  - `useQueries`로 8개 정책 카테고리의 공약 목록을 병렬 조회한다.
  - `score >= 4.5` 기준으로 화면용 `AssemblyPledgeProgressBreakdown`을 재계산한다.
  - API 목록 조회가 아직 끝나지 않았거나 실패하면 기존 `pledgeSummary.fulfillment.progress_breakdown`을 fallback으로 사용한다.
- Create: `src/features/assembly/assemblyPledgeDisplayProgress.ts`
  - 4.5점 완료단계 기준과 summary/detail 공통 표시 라벨 helper를 둔다.
- Create: `src/features/assembly/assemblyPledgeDisplayProgress.test.ts`
  - 점수 기반 라벨 override와 summary breakdown 재계산을 테스트한다.
- Modify: `src/features/assembly/components/PledgeHybridProgressBadge.tsx`
  - 상세 목록 배지가 `score >= 4.5`이면 `progress_label`이 `미착수`여도 `완료단계` 스타일과 라벨을 쓰게 한다.
- Modify: `src/features/assembly/AssemblyPledgeRatePage.test.ts`
  - 기존 세그먼트 테스트는 유지하고, 새 helper 테스트는 `assemblyPledgeDisplayProgress.test.ts`에 둔다.

## Important Constraint

`pledge-summary` 응답에는 개별 공약의 `score`가 없다. 따라서 프론트만으로 4.5 기준 완료단계를 적용하려면 `fetchAssemblyMemberPledges`를 카테고리별로 추가 호출해서 item `score`를 모아야 한다. 이 방식은 네트워크 호출이 늘지만 백엔드 변경 없이 화면 기준을 맞출 수 있는 가장 작은 변경이다.

---

### Task 1: Add Shared Display Progress Helper

**Files:**
- Create: `src/features/assembly/assemblyPledgeDisplayProgress.ts`
- Create: `src/features/assembly/assemblyPledgeDisplayProgress.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/assembly/assemblyPledgeDisplayProgress.test.ts`.

```ts
import type { AssemblyPledgeListItem, AssemblyPledgeProgressBreakdown } from "@/lib/schemas";
import {
  buildScoreAdjustedProgressBreakdown,
  resolveScoreAdjustedProgressLabel,
} from "@/features/assembly/assemblyPledgeDisplayProgress";

const baseBreakdown: AssemblyPledgeProgressBreakdown = {
  completed_count: 0,
  in_progress_count: 1,
  not_started_count: 2,
  unknown_count: 1,
};

function pledgeItem(
  progressLabel: AssemblyPledgeListItem["progress_label"],
  score: number | null,
): AssemblyPledgeListItem {
  return {
    rank: 1,
    promise_id: `promise-${progressLabel}-${score ?? "none"}`,
    promise_text: "공약",
    evaluation_status: progressLabel,
    progress_label: progressLabel,
    score,
    score_display: score === null ? null : `${score.toFixed(1)}/5`,
    progress_rate_percent: null,
    confidence: null,
    user_summary_line: null,
    evidence_items: [],
    updated_at: null,
  };
}

describe("buildScoreAdjustedProgressBreakdown", () => {
  it("treats pledges with score 4.5 or higher as completed for display", () => {
    const adjusted = buildScoreAdjustedProgressBreakdown(baseBreakdown, [
      pledgeItem("미착수", 4.5),
      pledgeItem("진행중", 4.49),
      pledgeItem("판단불가", null),
      pledgeItem("미착수", 0),
    ]);

    expect(adjusted).toEqual({
      completed_count: 1,
      in_progress_count: 1,
      not_started_count: 1,
      unknown_count: 1,
    });
  });

  it("falls back to the summary breakdown when no pledge items are available", () => {
    expect(buildScoreAdjustedProgressBreakdown(baseBreakdown, null)).toBe(baseBreakdown);
  });
});

describe("resolveScoreAdjustedProgressLabel", () => {
  it("keeps original labels below 4.5 and overrides labels at 4.5 or higher", () => {
    expect(resolveScoreAdjustedProgressLabel("미착수", 4.5)).toBe("완료단계");
    expect(resolveScoreAdjustedProgressLabel("진행중", 4.9)).toBe("완료단계");
    expect(resolveScoreAdjustedProgressLabel("진행중", 4.49)).toBe("진행중");
    expect(resolveScoreAdjustedProgressLabel("판단불가", null)).toBe("판단불가");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run src/features/assembly/assemblyPledgeDisplayProgress.test.ts
```

Expected: FAIL because `src/features/assembly/assemblyPledgeDisplayProgress.ts` does not exist.

- [ ] **Step 3: Implement the shared helper**

Create `src/features/assembly/assemblyPledgeDisplayProgress.ts`.

```ts
import type {
  AssemblyPledgeListItem,
  AssemblyPledgeProgressBreakdown,
  AssemblyPledgeProgressLabel,
} from "@/lib/schemas";

const COMPLETED_SCORE_THRESHOLD = 4.5;

export function resolveScoreAdjustedProgressLabel(
  progressLabel: AssemblyPledgeProgressLabel,
  score: number | null | undefined,
): AssemblyPledgeProgressLabel {
  if (typeof score === "number" && score >= COMPLETED_SCORE_THRESHOLD) {
    return "완료단계";
  }
  return progressLabel;
}

export function buildScoreAdjustedProgressBreakdown(
  fallbackBreakdown: AssemblyPledgeProgressBreakdown,
  items: AssemblyPledgeListItem[] | null,
): AssemblyPledgeProgressBreakdown {
  if (!items || items.length === 0) {
    return fallbackBreakdown;
  }

  const counts: AssemblyPledgeProgressBreakdown = {
    completed_count: 0,
    in_progress_count: 0,
    not_started_count: 0,
    unknown_count: 0,
  };

  for (const item of items) {
    const label = resolveScoreAdjustedProgressLabel(item.progress_label, item.score);
    if (label === "완료단계") counts.completed_count += 1;
    else if (label === "진행중") counts.in_progress_count += 1;
    else if (label === "미착수") counts.not_started_count += 1;
    else counts.unknown_count += 1;
  }

  return counts;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run src/features/assembly/assemblyPledgeDisplayProgress.test.ts
```

Expected: PASS.

---

### Task 2: Fetch Category Pledges for Summary Display Calculation

**Files:**
- Modify: `src/features/assembly/AssemblyPledgeRatePage.tsx`
- Test: `src/features/assembly/AssemblyPledgeRatePage.test.ts`

- [ ] **Step 1: Update imports**

In `src/features/assembly/AssemblyPledgeRatePage.tsx`, change the TanStack Query import and API import.

```ts
import { useQueries, useQuery } from "@tanstack/react-query";

import { buildScoreAdjustedProgressBreakdown } from "@/features/assembly/assemblyPledgeDisplayProgress";
import {
  assemblyMemberMetaCardQueryOptions,
  assemblyMemberPledgesQueryOptions,
  assemblyPledgeSummaryQueryOptions,
} from "@/lib/api-client";
```

- [ ] **Step 2: Add all-category pledge queries**

Inside `AssemblyPledgeRatePage`, after `pledgeSummary` query, add:

```ts
const categoryPledgeQueries = useQueries({
  queries: ASSEMBLY_PLEDGE_CATEGORY_LABELS.map((categoryLabel) =>
    assemblyMemberPledgesQueryOptions({
      monaCd: monaCdTrimmed,
      category: categoryLabel,
    }),
  ),
});

const scoreAdjustedPledgeItems = categoryPledgeQueries.every((query) => query.isSuccess)
  ? categoryPledgeQueries.flatMap((query) => query.data.items)
  : null;
```

This preserves existing `enabled` behavior because `assemblyMemberPledgesQueryOptions` already disables empty `monaCd` and category queries.

- [ ] **Step 3: Apply score-adjusted breakdown to the stacked bar**

Replace the current `progressBreakdown` assignment:

```ts
const rawProgressBreakdown =
  pledgeSummary?.fulfillment.progress_breakdown ?? EMPTY_PROGRESS_BREAKDOWN;
const progressBreakdown = buildScoreAdjustedProgressBreakdown(
  rawProgressBreakdown,
  scoreAdjustedPledgeItems,
);
const progressTotal = pledgeSummary?.fulfillment.total_promises ?? 0;
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
npx vitest run src/features/assembly/AssemblyPledgeRatePage.test.ts src/features/assembly/assemblyPledgeDisplayProgress.test.ts
```

Expected: PASS.

---

### Task 3: Apply the Same 4.5 Rule to Detail Badges

**Files:**
- Modify: `src/features/assembly/components/PledgeHybridProgressBadge.tsx`
- Test: `src/features/assembly/assemblyPledgeDisplayProgress.test.ts`

- [ ] **Step 1: Confirm the shared helper test already covers badge label resolution**

Run:

```bash
npx vitest run src/features/assembly/assemblyPledgeDisplayProgress.test.ts
```

Expected: PASS after Task 1. This test proves the exact label rule the badge will call.

- [ ] **Step 2: Import the shared helper**

In `src/features/assembly/components/PledgeHybridProgressBadge.tsx`, add:

```ts
import { resolveScoreAdjustedProgressLabel } from "@/features/assembly/assemblyPledgeDisplayProgress";
```

- [ ] **Step 3: Update the scored badge panel**

In `HybridWithScorePanel`, replace direct `progress` style/text usage:

```ts
const displayProgress = resolveScoreAdjustedProgressLabel(progress, score);
const style = getPledgeProgressBadgeStyle(displayProgress as PledgeExecutionProgress);
```

Then change the text span:

```tsx
<span>{displayProgress}</span>
```

- [ ] **Step 4: Update the no-score fallback**

In `PledgeHybridProgressBadge`, leave the no-score path unchanged because there is no numeric evidence to override:

```tsx
if (!hasScore) {
  return <PledgeProgressBadge progress={progress as PledgeExecutionProgress} />;
}
```

- [ ] **Step 5: Run the shared helper test**

Run:

```bash
npx vitest run src/features/assembly/assemblyPledgeDisplayProgress.test.ts
```

Expected: PASS.

---

### Task 4: Verify the Frontend Slice

**Files:**
- Verify: `src/features/assembly/AssemblyPledgeRatePage.tsx`
- Verify: `src/features/assembly/AssemblyPledgeRatePage.test.ts`
- Verify: `src/features/assembly/assemblyPledgeDisplayProgress.ts`
- Verify: `src/features/assembly/assemblyPledgeDisplayProgress.test.ts`
- Verify: `src/features/assembly/components/PledgeHybridProgressBadge.tsx`
- Verify: `src/lib/schemas.ts`
- Verify: `src/lib/schemas.test.ts`

- [ ] **Step 1: Run targeted Vitest tests**

Run:

```bash
npx vitest run src/features/assembly/AssemblyPledgeRatePage.test.ts src/features/assembly/assemblyPledgeDisplayProgress.test.ts src/lib/schemas.test.ts
```

Expected: PASS for all targeted tests.

- [ ] **Step 2: Run TypeScript check**

Run:

```bash
npx tsc --noEmit
```

Expected for the current branch: this may still fail on pre-existing test typing issues in `src/lib/local-election-backend.test.ts`, `src/lib/observability/*.test.ts`, and `tests/local_council_*.test.ts`. If the output is unchanged from the current baseline and does not mention the modified assembly files, record it as an existing unrelated typecheck failure.

- [ ] **Step 3: Check git diff scope**

Run:

```bash
git diff -- src/features/assembly/AssemblyPledgeRatePage.tsx src/features/assembly/AssemblyPledgeRatePage.test.ts src/features/assembly/assemblyPledgeDisplayProgress.ts src/features/assembly/assemblyPledgeDisplayProgress.test.ts src/features/assembly/components/PledgeHybridProgressBadge.tsx src/lib/schemas.ts src/lib/schemas.test.ts
git status --short --branch
```

Expected: only assembly pledge frontend files and tests are changed by this task. Existing unrelated `src/app/page.tsx` changes remain untouched.

---

## Self-Review

- Spec coverage: the plan covers the requested frontend-only 4.5 threshold behavior for both the summary 막대 그래프 and category/detail badge display.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: helpers use existing `AssemblyPledgeListItem`, `AssemblyPledgeProgressBreakdown`, and `AssemblyPledgeProgressLabel` types from `src/lib/schemas.ts`.
