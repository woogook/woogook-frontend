# Local Council Public Source Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `local-council` 상세에서 backend가 안전한 공개 출처 링크를 제공하고, frontend는 generic `원문 이동` 대신 의미 있는 출처 CTA만 노출하게 만든다.

**Architecture:** backend는 `source_kind`별 공개 링크 resolver를 `source_ref` 정규화 경로에 붙여 `source_url/source_links`를 채운다. frontend는 기존 source payload를 그대로 읽되, 상세 카드에서 generic primary action을 제거하고 `출처 · ...`, `관련 출처`, `원문 다운로드` 같은 구체 라벨 CTA만 유지한다.

**Tech Stack:** FastAPI, Pydantic, Python `node:test`, Next.js 16, React 19, TypeScript, Playwright smoke.

---

## File Map

- Modify: `woogook-backend/app/domains/local_council/source_contract.py`
  - 공개 링크 resolver와 `source_url/source_links` 정규화 확장
- Modify: `woogook-backend/tests/test_local_council_api.py`
  - API payload의 공개 링크 계약 고정
- Modify: `woogook-frontend/src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
  - generic `원문 이동` 제거, 구체 라벨 CTA 중심 렌더
- Modify: `woogook-frontend/tests/local_council_detail.test.ts`
  - CTA 렌더 기대값 갱신
- Modify: `woogook-frontend/e2e/local-council/local-sample.spec.ts`
  - representative CTA 경로 검증 갱신

---

### Task 1: backend 공개 링크 계약을 failing test로 고정한다

**Files:**
- Modify: `woogook-backend/tests/test_local_council_api.py`

- [ ] **Step 1: 구청장 `elected_basis` source에 공개 링크 기대를 추가한다**

```python
elected_basis_ref = next(
    item for item in body["source_refs"] if item["role"] == "elected_basis"
)
assert elected_basis_ref["source_url"] == "https://www.data.go.kr/data/15000864/openapi.do"
```

- [ ] **Step 2: 기존 invalid placeholder 제거 테스트와 충돌하지 않는 기대를 남긴다**

```python
assert "source_url" not in finance_ref or finance_ref["source_url"] != "https://example.invalid/..."
```

- [ ] **Step 3: backend test를 실행해 RED를 확인한다**

Run:

```bash
zsh -lc 'cd /Users/eric/dev/upstage/woogook/woogook-backend && python3 -m pytest tests/test_local_council_api.py -k "elected_basis or source_links"'
```

Expected: FAIL because `elected_basis` source에는 아직 공개 `source_url`이 채워지지 않는다.

---

### Task 2: backend source_kind별 공개 링크 resolver를 구현한다

**Files:**
- Modify: `woogook-backend/app/domains/local_council/source_contract.py`

- [ ] **Step 1: 공개 landing/deep link 상수를 추가한다**

```python
_PUBLIC_SOURCE_URLS = {
    "nec_current_holder": "https://www.data.go.kr/data/15000864/openapi.do",
    "nec_council_elected_basis": "https://www.data.go.kr/data/15000864/openapi.do",
}
```

- [ ] **Step 2: source_kind와 기존 payload를 기반으로 public URL을 보정하는 helper를 추가한다**

```python
def _resolve_public_source_url(payload: dict[str, Any]) -> str | None:
    explicit_url = _clean_source_url(payload.get("source_url"))
    if explicit_url is not None:
        return explicit_url
    source_kind = _clean_optional_text(payload.get("source_kind"))
    if source_kind in _PUBLIC_SOURCE_URLS:
        return _PUBLIC_SOURCE_URLS[source_kind]
    return None
```

- [ ] **Step 3: `normalize_source_ref()`에서 `source_url` 정규화에 helper를 사용한다**

```python
cleaned_source_url = _resolve_public_source_url(normalized)
if cleaned_source_url is None:
    normalized.pop("source_url", None)
else:
    normalized["source_url"] = cleaned_source_url
```

- [ ] **Step 4: backend test를 다시 실행해 GREEN을 확인한다**

Run:

```bash
zsh -lc 'cd /Users/eric/dev/upstage/woogook/woogook-backend && python3 -m pytest tests/test_local_council_api.py -k "elected_basis or source_links"'
```

Expected: PASS

---

### Task 3: frontend CTA 단순화 요구를 failing test로 고정한다

**Files:**
- Modify: `woogook-frontend/tests/local_council_detail.test.ts`
- Modify: `woogook-frontend/e2e/local-council/local-sample.spec.ts`

- [ ] **Step 1: render test에서 generic `원문 이동` 제거 기대를 추가한다**

```ts
assert.doesNotMatch(html, />원문 이동<\/a>/);
assert.match(html, /출처 · 지방재정365/);
assert.match(html, /출처 · 중앙선거관리위원회/);
```

- [ ] **Step 2: e2e에서도 `당선 근거`/대표 카드 CTA를 구체 라벨 기준으로 바꾼다**

```ts
await expect(
  electedBasisSection.getByRole("link", { name: "출처 · 중앙선거관리위원회" }),
).toBeVisible();
```

- [ ] **Step 3: frontend targeted test를 실행해 RED를 확인한다**

Run:

```bash
zsh -lc 'cd /Users/eric/dev/upstage/woogook/woogook-frontend && source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run test:node -- --test-name-pattern "primary link buttons|opens external record links|concrete election basis facts"'
```

Expected: FAIL because current UI still renders `원문 이동`.

---

### Task 4: frontend에서 generic CTA를 제거하고 출처 CTA만 남긴다

**Files:**
- Modify: `woogook-frontend/src/features/local-council/components/LocalCouncilPersonDetailView.tsx`

- [ ] **Step 1: 카드 헤더의 generic primary action 렌더를 제거한다**

```tsx
const primaryAction = null;
```

또는 equivalent하게 header 우측 `원문 이동` anchor block 전체를 삭제한다.

- [ ] **Step 2: expanded content 내부의 출처 CTA를 primary action으로 유지한다**

```tsx
{item.sourceUrl ? (
  <a href={item.sourceUrl}>출처 · {item.sourceLabel}</a>
) : null}
```

- [ ] **Step 3: `item.actions.viewUrl !== primaryUrl` 조건을 제거하거나 재정의해 CTA 중복을 없앤다**

```tsx
{hasViewAction ? (
  <a href={item.actions.viewUrl ?? undefined}>{item.actions.viewLabel}</a>
) : null}
```

단, `출처`와 같은 URL을 중복으로 한 번 더 내보내지 않도록 유지한다.

- [ ] **Step 4: render test를 다시 실행해 GREEN을 확인한다**

Run:

```bash
zsh -lc 'cd /Users/eric/dev/upstage/woogook/woogook-frontend && source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run test:node -- --test-name-pattern "primary link buttons|opens external record links|concrete election basis facts"'
```

Expected: PASS

---

### Task 5: representative e2e와 lint로 회귀를 막는다

**Files:**
- Modify: `woogook-frontend/e2e/local-council/local-sample.spec.ts`

- [ ] **Step 1: representative CTA 흐름을 구체 라벨 기준으로 검증한다**

예시:

```ts
await expectExternalLink(
  financeSection.getByRole("link", { name: "출처 · 지방재정365" }),
  "https://www.localfinance.go.kr/finance/gangdong/budget-execution",
);
```

- [ ] **Step 2: smoke를 실행한다**

Run:

```bash
zsh -lc 'cd /Users/eric/dev/upstage/woogook/woogook-frontend && source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run e2e:smoke'
```

Expected: all pass

- [ ] **Step 3: lint를 실행한다**

Run:

```bash
zsh -lc 'cd /Users/eric/dev/upstage/woogook/woogook-frontend && source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run lint'
```

Expected: exit code 0
