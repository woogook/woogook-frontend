# 현직 지방의원 카드 펼침 UI 단순화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `local-council` 상세 카드와 보강 정보 섹션에서 텍스트 `열기/닫기` 버튼을 제거하고, 본문 클릭 disclosure와 `원문 이동` CTA 분리 패턴으로 통일한다.

**Architecture:** `LocalCouncilPersonDetailView.tsx`의 expandable card header와 overlay header를 disclosure button 기반 레이아웃으로 바꾸고, 우측 CTA는 이동 링크만 유지한다. render test와 Playwright spec을 먼저 깨서 새 상호작용 계약을 고정한 뒤 최소 구현으로 다시 녹색을 만든다.

**Tech Stack:** Next.js 16, React 19, TypeScript, lucide-react, node:test via `tsx`, Playwright.

---

## File Map

- Modify: `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
  - 카드/overlay disclosure UI 단순화
- Modify: `tests/local_council_detail.test.ts`
  - 텍스트 토글 제거와 접근성 속성 유지 기대값 반영
- Modify: `e2e/local-council/local-sample.spec.ts`
  - 샘플 detail 화면의 새 disclosure 상호작용 검증
- Modify: `e2e/local-council/integration.spec.ts`
  - integration fixture에서도 같은 상호작용 검증

## Task 1: 새 disclosure 계약을 failing test로 고정한다

**Files:**
- Modify: `tests/local_council_detail.test.ts`
- Modify: `e2e/local-council/local-sample.spec.ts`
- Modify: `e2e/local-council/integration.spec.ts`

- [ ] **Step 1: render test에서 텍스트 토글 제거 기대값을 추가한다**

```ts
assert.doesNotMatch(html, />닫기</);
assert.doesNotMatch(html, />열기</);
assert.match(html, /aria-label="강동구 예산 집행 내역 세부 닫기"/);
assert.match(html, /aria-expanded="true"/);
```

- [ ] **Step 2: 보강 정보도 텍스트 토글이 사라지는지 고정한다**

```ts
assert.match(html, /보강 정보/);
assert.doesNotMatch(html, />닫기</);
assert.doesNotMatch(html, />열기</);
assert.match(html, /aria-controls="local-council-overlay-content"/);
```

- [ ] **Step 3: e2e helper 기대를 텍스트 버튼 의존에서 제목 클릭 의존으로 바꾼다**

예시:

```ts
await expandSectionCard(officialProfileSection, /힘찬 변화, 자랑스러운 강동/);
await expect(overlaySection.getByRole("button", { name: /보강 정보/ })).toBeVisible();
```

- [ ] **Step 4: render test를 실행해 실패를 확인한다**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_detail.test.ts'
```

Expected: FAIL because the current view still renders `닫기` text buttons.

## Task 2: 카드 본문 disclosure와 CTA 분리를 구현한다

**Files:**
- Modify: `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`

- [ ] **Step 1: disclosure 상태 표시용 chevron을 추가한다**

```tsx
import { ChevronDown } from "lucide-react";
```

```tsx
<ChevronDown
  className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
  aria-hidden="true"
/>
```

- [ ] **Step 2: 확장 가능한 카드 본문 전체를 button으로 감싼다**

```tsx
<button
  type="button"
  onClick={() => setExpandedKey(expanded ? null : recordKey)}
  aria-label={toggleLabel}
  aria-expanded={expanded}
  aria-controls={contentId}
  className="flex min-w-0 flex-1 items-start gap-3 text-left"
>
  {headerContent}
  <span className="flex h-9 w-9 items-center justify-center rounded-full border">
    <ChevronDown ... />
  </span>
</button>
```

- [ ] **Step 3: 외부 이동 CTA는 독립 link로만 유지한다**

```tsx
<div className="flex items-start gap-3 p-3">
  <button ...>{headerContent} ...</button>
  {primaryAction}
</div>
```

- [ ] **Step 4: 보강 정보 헤더도 같은 disclosure header로 바꾼다**

```tsx
<button
  type="button"
  onClick={() => setExpandedKey(expanded ? null : "overlay")}
  aria-expanded={expanded}
  aria-controls="local-council-overlay-content"
  className="flex w-full items-start justify-between gap-3 text-left"
>
  <h2>보강 정보</h2>
  <span className="flex h-9 w-9 items-center justify-center rounded-full border">
    <ChevronDown ... />
  </span>
</button>
```

- [ ] **Step 5: render test를 다시 실행해 녹색을 확인한다**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_detail.test.ts'
```

Expected: PASS

## Task 3: e2e 회귀 검증과 라이브 확인을 마친다

**Files:**
- Modify: `e2e/local-council/local-sample.spec.ts`
- Modify: `e2e/local-council/integration.spec.ts`

- [ ] **Step 1: 샘플/통합 spec이 새 disclosure button을 따라가도록 정리한다**

```ts
await expandSectionCard(officialProfileSection, /힘찬 변화, 자랑스러운 강동/);
await expect(officialProfileSection.getByRole("link", { name: "원문 이동" }).first()).toBeVisible();
```

- [ ] **Step 2: lint를 실행한다**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run lint'
```

Expected: exit code 0

- [ ] **Step 3: smoke를 실행한다**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run e2e:smoke'
```

Expected: `5 passed`

- [ ] **Step 4: 라이브 dev 서버를 다시 올리고 `/local-council`을 확인한다**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && PORT=3000 WOOGOOK_BACKEND_BASE_URL=http://127.0.0.1:8000 npm run dev'
curl -I -s http://localhost:3000/local-council
```

Expected: `HTTP/1.1 200 OK`
