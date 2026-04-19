# Local Council Bill Card Evidence Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `local-council` 구의원 상세의 `의안` 카드에 해당 의안이 왜 의원과 연결됐는지와 그 근거가 무엇인지 설명하는 사용자 문구를 추가한다.

**Architecture:** `detail.ts`의 bill card view model 단계에서 backend payload의 `participation_type`, `basis_kind`, `matched_by`, `source_ref`를 읽어 사용자 문구를 만든다. 테스트는 먼저 red로 만들고, 이후 렌더 수준까지 회귀를 확인한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, `node:test`, local frontend/backend dev servers

---

## File Map

- Modify: `woogook-frontend/src/features/local-council/detail.ts`
  - 의안 카드 설명 문구 helper와 `detailRows` 조립
- Modify: `woogook-frontend/tests/local_council_detail.test.ts`
  - bill card view model 및 렌더 검증 추가
- Verify: `woogook-frontend/src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
  - 렌더 결과만 확인, 필요 시 코드 변경 없이 유지
- Verify: `docs/runbook/local-council-manual-e2e-runbook.md`
  - 수동 확인 경로 준수

### Task 1: 의안 카드 설명 요구를 failing test로 고정한다

**Files:**
- Modify: `woogook-frontend/tests/local_council_detail.test.ts`

- [ ] **Step 1: 공식 의안검색 기반 card expectation을 추가한다**

```ts
assert.deepEqual(card.detailRows, [
  {
    label: "상태",
    value: "의안 단계 가결 · 조례 상태 가결 후 공포 전 · 의결 결과 원안가결",
  },
  {
    label: "연관 사유",
    value: "대표발의 의안으로 확인됨",
  },
  {
    label: "근거",
    value: "강동구의회 의안검색 기준",
  },
  {
    label: "제안일",
    value: "2026-04-07",
  },
]);
```

- [ ] **Step 2: 지방의정포털 목록 매칭 expectation을 추가한다**

```ts
assert.deepEqual(card.detailRows, [
  {
    label: "연관 사유",
    value: "제안자 명단에 의원명이 포함되어 연결됨",
  },
  {
    label: "근거",
    value: "지방의정포털 의안 목록 기준",
  },
  {
    label: "제안일",
    value: "2026-04-07",
  },
]);
```

- [ ] **Step 3: 렌더 테스트 expectation을 추가한다**

```ts
assert.match(html, /연관 사유/);
assert.match(html, /대표발의 의안으로 확인됨/);
assert.match(html, /근거/);
assert.match(html, /강동구의회 의안검색 기준/);
```

- [ ] **Step 4: targeted node test를 실행해 RED를 확인한다**

Run:

```bash
zsh -lc 'cd /Users/eric/dev/upstage/woogook/woogook-frontend && source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run test:node -- --test-name-pattern "buildBillActivityCardViewModel|LocalCouncilPersonDetailView hides title-only bill summaries"'
```

Expected: FAIL because `연관 사유`/`근거` 행이 아직 없다.

### Task 2: bill card 문구 helper를 구현한다

**Files:**
- Modify: `woogook-frontend/src/features/local-council/detail.ts`

- [ ] **Step 1: bill 연결 설명 helper를 추가한다**

```ts
function resolveBillAssociationReason(item: Record<string, unknown>) {
  const participationType = asText(item.participation_type);
  const matchedBy = asText(item.matched_by);
  if (participationType === "primary_sponsor") {
    return "대표발의 의안으로 확인됨";
  }
  if (participationType === "listed_activity" && matchedBy === "PROPSR contains member name") {
    return "제안자 명단에 의원명이 포함되어 연결됨";
  }
  return null;
}
```

- [ ] **Step 2: bill 근거 설명 helper를 추가한다**

```ts
function resolveBillAssociationEvidence(item: Record<string, unknown>) {
  const basisKind = asText(item.basis_kind);
  if (basisKind === "official_council_bill_search") {
    return "강동구의회 의안검색 기준";
  }
  if (basisKind === "portal_member_bill_index") {
    return "지방의정포털 의안 목록 기준";
  }
  return null;
}
```

- [ ] **Step 3: `buildBillActivityCardViewModel()`의 `detailRows`에 helper 결과를 추가한다**

```ts
if (associationReason) {
  detailRows.push({ label: "연관 사유", value: associationReason });
}
if (associationEvidence) {
  detailRows.push({ label: "근거", value: associationEvidence });
}
```

- [ ] **Step 4: targeted node test를 다시 실행해 GREEN을 확인한다**

Run:

```bash
zsh -lc 'cd /Users/eric/dev/upstage/woogook/woogook-frontend && source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run test:node -- --test-name-pattern "buildBillActivityCardViewModel|LocalCouncilPersonDetailView hides title-only bill summaries"'
```

Expected: PASS

### Task 3: broader verification과 pre-push review를 수행한다

**Files:**
- Modify: `woogook-frontend/tests/local_council_detail.test.ts`
- Modify: `woogook-frontend/src/features/local-council/detail.ts`

- [ ] **Step 1: local-council node test 전체를 실행한다**

Run:

```bash
zsh -lc 'cd /Users/eric/dev/upstage/woogook/woogook-frontend && source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run test:node'
```

Expected: PASS

- [ ] **Step 2: lint를 실행한다**

Run:

```bash
zsh -lc 'cd /Users/eric/dev/upstage/woogook/woogook-frontend && source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run lint'
```

Expected: exit code 0

- [ ] **Step 3: local-council integration e2e를 실행한다**

Run:

```bash
zsh -lc 'cd /Users/eric/dev/upstage/woogook/woogook-frontend && source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run e2e:integration'
```

Expected: PASS

- [ ] **Step 4: localhost manual spot-check를 수행한다**

Run:

```bash
curl -sS 'http://127.0.0.1:3000/api/local-council/v1/persons/seoul-gangdong%3Acouncil-member%3A100149042' | jq '.bills[0] | {participation_type, basis_kind, matched_by}'
```

Expected: `participation_type`, `basis_kind`, `matched_by`가 내려오고, 브라우저 카드에는 이를 번역한 사용자 문구가 보인다.

- [ ] **Step 5: pre-push review를 수행하고 남은 이슈를 수정한다**

Review checklist:

```text
1. raw internal codes가 UI에 노출되지 않는가
2. 링크 CTA와 뒤로가기 흐름을 깨지 않았는가
3. 기존 title-only summary 숨김 정책을 유지하는가
4. 날짜 표시 형식 회귀가 없는가
```

- [ ] **Step 6: commit 후 branch를 push한다**

Run:

```bash
git add docs/superpowers/specs/2026-04-18-local-council-bill-card-evidence-copy-design.md \
        docs/superpowers/plans/2026-04-18-local-council-bill-card-evidence-copy-implementation-plan.md \
        src/features/local-council/detail.ts \
        tests/local_council_detail.test.ts
git commit -m "feat: explain local council bill associations"
git push -u origin codex/local-council-bill-card-evidence-copy
```
