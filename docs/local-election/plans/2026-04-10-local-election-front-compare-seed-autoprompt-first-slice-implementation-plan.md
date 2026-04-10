# Local Election Front Compare Seed And Autoprompt First Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `woogook-frontend`의 compare flow에서 empty issue profile draft와 runtime snapshot을 분리하고, active issue가 있을 때만 issue-first auto prompt를 보내도록 만든다.

**Architecture:** `LocalElectionPage`는 issue editing용 non-null draft profile과 compare runtime용 nullable active snapshot을 분리한다. `CompareView`는 이미 계산 중인 `showIssueContext`를 auto prompt gate와 session storage signature에 재사용해 no-issue compare를 generic entry로 유지한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod, ESLint

---

## File Structure

- `docs/local-election/specs/2026-04-10-local-election-front-compare-seed-autoprompt-first-slice-design.md`
  - 이번 slice의 승인된 프론트 설계를 저장한다.
- `src/app/data.ts`
  - active issue가 실제로 있는 profile만 runtime snapshot으로 승격하는 helper를 둔다.
- `src/features/local-election/LocalElectionPage.tsx`
  - issue editor용 draft profile과 compare runtime용 nullable snapshot을 계산하고 각 뷰에 올바른 값을 전달한다.
- `src/app/components/CompareView.tsx`
  - no-issue 상태에서는 issue-first auto prompt를 막고, compare chat cache signature에 snapshot 존재 여부를 반영한다.

### Task 1: Compare Runtime Issue Profile Boundary

**Files:**
- Modify: `src/app/data.ts`
- Modify: `src/features/local-election/LocalElectionPage.tsx`

- [ ] **Step 1: active runtime snapshot helper를 `src/app/data.ts`에 추가한다**

```ts
export function getActiveIssueProfile(
  profile: UserIssueProfile | null | undefined,
): UserIssueProfile | null {
  return hasActiveIssues(profile) ? profile : null;
}
```

- [ ] **Step 2: `LocalElectionPage.tsx` import를 helper 기준으로 정리한다**

```tsx
import {
  BallotItem,
  BallotResponse,
  CandidateRecord,
  UserIssueProfile,
  formatKoreanDate,
  formatKoreanDateTime,
  getActiveIssueProfile,
  getDataPhaseLabel,
  makeEmptyIssueProfile,
} from "@/features/local-election/data";
```

- [ ] **Step 3: issue editor draft와 runtime snapshot을 분리한다**

```tsx
const issueDraftProfile = selectedBallot
  ? issueProfiles[selectedBallot.contest_id] ||
    makeEmptyIssueProfile(
      selectedBallot.candidates[0]?.election_id ||
        ballotData?.meta?.election_id ||
        "0020260603",
      selectedBallot.contest_id,
    )
  : null;

const activeIssueProfile = getActiveIssueProfile(issueDraftProfile);
```

- [ ] **Step 4: 각 뷰에 전달하는 prop을 draft/snapshot 의미에 맞게 바꾼다**

```tsx
{view === "issues" && selectedBallot && issueDraftProfile && (
  <IssueStep
    ballot={selectedBallot}
    initialProfile={issueDraftProfile}
    onSubmit={handleIssueSubmit}
    onBack={handleIssueBack}
  />
)}

{view === "candidates" && selectedBallot && (
  <CandidateCards
    ballot={selectedBallot}
    issueProfile={activeIssueProfile}
    onSelectCandidate={handleSelectCandidate}
    onCompare={handleOpenCompareFlow}
    onBack={() => navigate("issues")}
    onEditIssues={() => handleOpenIssueStep("candidates")}
  />
)}

{view === "compare_scope" && selectedBallot && (
  <CompareScopeView
    ballot={selectedBallot}
    issueProfile={activeIssueProfile}
    onBack={() => navigate("candidates")}
    onEditIssues={() => handleOpenIssueStep("compare_scope")}
    onSelectCandidate={(candidate) => handleSelectCandidate(candidate, "compare_scope")}
    onStartCompare={handleStartScopedCompare}
  />
)}

{view === "compare" && compareBallot && compareBallot.candidates.length > 0 && (
  <CompareView
    ballot={compareBallot}
    totalCandidateCount={selectedBallot?.candidates.length || 0}
    issueProfile={activeIssueProfile}
    selectionBasis={compareSelectionBasis}
    selectionLabel={compareSelectionLabel}
    onSelectCandidate={(candidate) => handleSelectCandidate(candidate, "compare")}
    onBack={() => navigate(compareBackView)}
    onEditIssues={() => handleOpenIssueStep("compare")}
  />
)}

{view === "detail" && selectedCandidate && selectedBallot && (
  <DetailView
    candidate={selectedCandidate}
    ballot={selectedBallot}
    issueProfile={activeIssueProfile}
    onBack={() => navigate(detailReturnView)}
    onEditIssues={() => handleOpenIssueStep("detail")}
  />
)}
```

- [ ] **Step 5: lint로 nullable boundary 변경이 타입과 lint를 깨지 않는지 확인한다**

Run: `npm run lint`
Expected: exit code `0`, 기존 `src/app/components/CandidateCards.tsx`의 `@next/next/no-img-element` warning 1건만 남는다.

- [ ] **Step 6: 첫 번째 변경을 커밋한다**

```bash
git add src/app/data.ts src/features/local-election/LocalElectionPage.tsx
git commit -m "refactor: split local-election issue profile draft and snapshot"
```

### Task 2: Compare Assistant Autoprompt And Cache Gating

**Files:**
- Modify: `src/app/components/CompareView.tsx`

- [ ] **Step 1: compare chat context signature에 snapshot 존재 여부를 추가한다**

```tsx
function buildCompareChatContextSignature(
  ballot: BallotItem,
  issueProfile: UserIssueProfile | null,
  selectionBasis: ChatSelectionBasis,
  selectionLabel: string | null,
) {
  return JSON.stringify({
    contestId: ballot.contest_id,
    candidateIds: ballot.candidates.map((candidate) => candidate.candidate_id),
    hasIssueProfileSnapshot: issueProfile !== null,
    normalizedIssueKeys: issueProfile?.normalized_issue_keys || [],
    customKeywords: issueProfile?.custom_keywords || [],
    selectionBasis,
    selectionLabel,
  });
}
```

- [ ] **Step 2: issue-first auto prompt를 active issue가 있을 때만 보내도록 effect를 제한한다**

```tsx
useEffect(() => {
  if (
    !assistantOpen ||
    !showIssueContext ||
    hasAutoPrompted ||
    isSending ||
    chatMessages.length > 0
  ) {
    return;
  }

  setHasAutoPrompted(true);
  void sendQuestion(DEFAULT_INITIAL_CHAT_QUESTION);
}, [
  assistantOpen,
  chatMessages.length,
  hasAutoPrompted,
  isSending,
  sendQuestion,
  showIssueContext,
]);
```

- [ ] **Step 3: no-issue compare가 generic entry를 유지하는지 관련 계산을 정렬한다**

```tsx
const issueLabels = getIssueProfileLabelList(issueProfile);
const issueCriteria = getIssueCriterionEntries(issueProfile);
const showIssueContext = hasActiveIssues(issueProfile);

const assistantPromptOptions = useMemo(
  () => buildAssistantPromptOptions(issueCriteria),
  [issueCriteria],
);
```

Expected: active issue가 없을 때는 기존 generic prompt chip 배열이 유지되고, issue label chip은 렌더되지 않는다.

- [ ] **Step 4: lint를 다시 실행한다**

Run: `npm run lint`
Expected: exit code `0`, 기존 `src/app/components/CandidateCards.tsx` warning 1건만 유지된다.

- [ ] **Step 5: 수동 compare smoke로 three-scenario regression을 확인한다**

Run:

```bash
npm run dev
```

Expected:
- no-issue compare에서 assistant drawer를 열면 자동으로 `내 관심 이슈 기준으로 다시 요약해줘`가 전송되지 않는다.
- active issue compare에서 assistant drawer를 처음 열면 같은 질문이 정확히 1회만 전송된다.
- no-issue compare와 active-issue compare를 오갈 때 이전 대화가 같은 session storage key로 재사용되지 않는다.

- [ ] **Step 6: 두 번째 변경을 커밋한다**

```bash
git add src/app/components/CompareView.tsx
git commit -m "fix: gate compare issue autoprompt by active snapshot"
```
