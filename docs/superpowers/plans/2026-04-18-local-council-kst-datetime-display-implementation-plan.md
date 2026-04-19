# 현직 지방의원 화면 KST 시간 표기 통일 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `local-council` 도메인의 모든 화면에서 날짜/시간 필드를 KST 기준 `YYYY-MM-DD HH:mm:ss` 형식으로 통일한다.

**Architecture:** `src/features/local-council/time.ts`에 전용 formatter를 추가하고, `data.ts`, `detail.ts`, `LocalCouncilPersonDetailView.tsx`에서 날짜 필드로 확인된 지점만 명시적으로 이 formatter를 호출한다. 설명 문장과 타 도메인은 그대로 두고, `tests/local_council_time.test.ts`와 `tests/local_council_detail.test.ts`로 formatter와 렌더 회귀를 잠근다.

**Tech Stack:** Next.js 16, React 19, TypeScript, node:test via `tsx`, local-council sample fixtures.

---

## File Map

- Create: `src/features/local-council/time.ts`
  - `local-council` 전용 KST datetime formatter
- Modify: `src/features/local-council/data.ts`
  - freshness/overlay 시각 포맷 적용
- Modify: `src/features/local-council/detail.ts`
  - 의안/회의/당선/재정 활동 날짜 필드 포맷 적용
- Modify: `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
  - 신선도 계보 timestamp 포맷 적용
- Create: `tests/local_council_time.test.ts`
  - formatter unit tests
- Modify: `tests/local_council_detail.test.ts`
  - UI/helper 회귀 tests

---

### Task 1: formatter 요구사항을 failing test로 잠근다

**Files:**
- Create: `tests/local_council_time.test.ts`
- Modify: `tests/local_council_detail.test.ts`

- [ ] **Step 1: formatter unit test를 먼저 쓴다**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  formatLocalCouncilDateTime,
  formatLocalCouncilDateTimeOrOriginal,
} from "../src/features/local-council/time";

test("formatLocalCouncilDateTime formats date-only strings as KST midnight", () => {
  assert.equal(formatLocalCouncilDateTime("2026-04-07"), "2026-04-07 00:00:00");
});

test("formatLocalCouncilDateTime converts UTC timestamps into KST", () => {
  assert.equal(
    formatLocalCouncilDateTime("2026-04-08T01:05:00Z"),
    "2026-04-08 10:05:00",
  );
});

test("formatLocalCouncilDateTime preserves local datetime strings without timezone", () => {
  assert.equal(
    formatLocalCouncilDateTime("2026-04-08 10:06:00"),
    "2026-04-08 10:06:00",
  );
});

test("formatLocalCouncilDateTimeOrOriginal keeps invalid strings untouched", () => {
  assert.equal(
    formatLocalCouncilDateTimeOrOriginal("2026-03-25(수)"),
    "2026-03-25(수)",
  );
});
```

- [ ] **Step 2: existing local-council detail 회귀에 새 기대값을 추가한다**

`tests/local_council_detail.test.ts`의 helper/render assertions를 아래 값으로 바꾼다.

```ts
assert.deepEqual(
  getLocalCouncilFreshnessDetailRows({
    basis_kind: "snapshot_batch_finished_at",
    basis_timestamp: "2026-04-08T10:10:00+09:00",
    generated_at: "2026-04-08T10:11:00+09:00",
    source_mode: "stored_projection_only",
    is_snapshot_based: true,
    note: "강동구 구청장 상세 미리보기",
  }),
  [
    { label: "기준 종류", value: "스냅샷 배치 완료 시각" },
    { label: "기준 시각", value: "2026-04-08 10:10:00" },
    { label: "생성 시각", value: "2026-04-08 10:11:00" },
    { label: "수집 모드", value: "저장된 projection만 사용" },
    { label: "스냅샷 기반", value: "예" },
    { label: "메모", value: "강동구 구청장 상세 미리보기" },
  ],
);

assert.match(html, /기준 2026-04-08 10:10:00/);
assert.match(html, /기준 2026-04-08 10:05:00/);
assert.match(html, /2026-04-08 10:06:00/);
```

- [ ] **Step 3: test를 실행해 실패를 확인한다**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_time.test.ts tests/local_council_detail.test.ts'
```

Expected: FAIL because formatter file does not exist yet and detail expectations still reflect raw timestamp output.

---

### Task 2: `local-council` 전용 formatter를 구현한다

**Files:**
- Create: `src/features/local-council/time.ts`
- Modify: `src/features/local-council/data.ts`

- [ ] **Step 1: formatter 구현을 추가한다**

`src/features/local-council/time.ts`

```ts
const DATE_ONLY_PATTERN = /^(\\d{4})-(\\d{2})-(\\d{2})$/;
const LOCAL_DATETIME_PATTERN =
  /^(\\d{4})-(\\d{2})-(\\d{2})[ T](\\d{2}):(\\d{2})(?::(\\d{2}))?$/;
const KST_TIME_ZONE = "Asia/Seoul";

function formatDateInKst(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

export function formatLocalCouncilDateTime(
  input: string | Date | null | undefined,
): string | null {
  if (!input) {
    return null;
  }

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : formatDateInKst(input);
  }

  const raw = input.trim();
  if (!raw) {
    return null;
  }

  const dateOnly = raw.match(DATE_ONLY_PATTERN);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return `${year}-${month}-${day} 00:00:00`;
  }

  const localDateTime = raw.match(LOCAL_DATETIME_PATTERN);
  if (localDateTime) {
    const [, year, month, day, hour, minute, second = "00"] = localDateTime;
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatDateInKst(parsed);
}

export function formatLocalCouncilDateTimeOrOriginal(
  input: string | Date | null | undefined,
) {
  const formatted = formatLocalCouncilDateTime(input);
  if (formatted) {
    return formatted;
  }
  if (typeof input === "string") {
    return input.trim() || null;
  }
  return null;
}
```

- [ ] **Step 2: freshness와 overlay helper에 formatter를 연결한다**

`src/features/local-council/data.ts`

```ts
import { formatLocalCouncilDateTimeOrOriginal } from "./time";

export function getLocalCouncilFreshnessLabel(freshness: Record<string, unknown>) {
  const timestamp = formatLocalCouncilDateTimeOrOriginal(
    typeof freshness.basis_timestamp === "string" ? freshness.basis_timestamp : null,
  );
  if (!timestamp) {
    return "기준 시각 확인 필요";
  }
  return `기준 ${timestamp}`;
}

if (basisTimestamp) {
  rows.push({
    label: "기준 시각",
    value: formatLocalCouncilDateTimeOrOriginal(basisTimestamp) ?? basisTimestamp,
  });
}
if (generatedAt) {
  rows.push({
    label: "생성 시각",
    value: formatLocalCouncilDateTimeOrOriginal(generatedAt) ?? generatedAt,
  });
}

publishedAt: formatLocalCouncilDateTimeOrOriginal(getStringValue(itemRecord.published_at)),
generatedAt: formatLocalCouncilDateTimeOrOriginal(getStringValue(record?.generated_at)),
```

- [ ] **Step 3: formatter/unit helper test를 다시 실행한다**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_time.test.ts tests/local_council_detail.test.ts --test-name-pattern "formatLocalCouncilDateTime|local council helpers normalize evidence digest, freshness, diagnostics, and terminology copy"'
```

Expected: PASS for formatter and freshness helper assertions.

---

### Task 3: detail 화면의 날짜 필드를 명시적으로 formatter에 연결한다

**Files:**
- Modify: `src/features/local-council/detail.ts`
- Modify: `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
- Modify: `tests/local_council_detail.test.ts`

- [ ] **Step 1: 의안/회의/당선/재정 활동 날짜 필드를 formatter로 감싼다**

`src/features/local-council/detail.ts`

```ts
import { formatLocalCouncilDateTimeOrOriginal } from "./time";

const proposedAt =
  formatLocalCouncilDateTimeOrOriginal(
    asText(args.item.proposed_at) ?? asText(args.item.bill_date),
  ) ??
  asText(args.item.proposed_at) ??
  asText(args.item.bill_date);

const meetingDate =
  formatLocalCouncilDateTimeOrOriginal(firstValue(args.item, ["meeting_date", "date"])) ??
  firstValue(args.item, ["meeting_date", "date"]);

const electedAt = formatLocalCouncilDateTimeOrOriginal(
  getPayloadText(record, ["elected_at"]),
);

const formattedFinanceItem = {
  ...item,
  date_display: formatLocalCouncilDateTimeOrOriginal(asText(item.date)),
  activity_date_display: formatLocalCouncilDateTimeOrOriginal(asText(item.activity_date)),
};
```

- [ ] **Step 2: 신선도 계보 timestamp 렌더링을 formatter로 바꾼다**

`src/features/local-council/components/LocalCouncilPersonDetailView.tsx`

```ts
import { formatLocalCouncilDateTimeOrOriginal } from "@/features/local-council/time";

const timestamp = formatLocalCouncilDateTimeOrOriginal(getTextValue(record.timestamp));
```

- [ ] **Step 3: 렌더 회귀 기대값을 갱신하고 test를 실행한다**

추가/수정할 assertion 예시:

```ts
assert.match(html, /기준 2026-04-08 10:10:00/);
assert.match(html, /기준 2026-04-08 10:05:00/);
assert.match(html, /2026-04-08 10:06:00/);
assert.match(html, /2026-04-07 00:00:00/);
```

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_time.test.ts tests/local_council_detail.test.ts'
```

Expected: PASS with all local-council time display assertions green.

---

### Task 4: harness 검증과 review 관점 점검을 마무리한다

**Files:**
- Modify: `docs/local-council/runbooks/local-frontend-backend-check-guide.md`
- Modify: `docs/local-council/notes/current/local-council-member-current-status-brief.md`

- [ ] **Step 1: 수동 검증 문서에 새 시간 표기 기준을 반영한다**

`docs/local-council/runbooks/local-frontend-backend-check-guide.md`

```md
- roster와 detail에서 표시되는 시각 값은 `YYYY-MM-DD HH:mm:ss` 형식으로 보인다.
- timezone 표시는 붙이지 않지만, local-council 화면에서는 KST 기준으로 해석한다.
```

- [ ] **Step 2: 현재 상태 brief에 local-council 시간 표기 규칙을 기록한다**

`docs/local-council/notes/current/local-council-member-current-status-brief.md`

```md
- `local-council` 화면에서 표시하는 datetime 필드는 KST 기준 `YYYY-MM-DD HH:mm:ss` 형식을 사용한다.
- 설명 문장 안의 자유 텍스트 시각은 별도 치환하지 않는다.
```

- [ ] **Step 3: harness 기준 전체 검증을 실행한다**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_time.test.ts tests/local_council_detail.test.ts tests/local_council_api_client.test.ts tests/local_council_proxy.test.ts'
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run lint'
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && PORT=3000 WOOGOOK_BACKEND_BASE_URL=http://127.0.0.1:8000 PATH=/Users/eric/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:/usr/sbin:/sbin /Users/eric/.nvm/versions/node/v24.14.1/bin/node node_modules/next/dist/bin/next build --webpack'
```

Expected:

```text
ℹ tests 0 failed
ℹ fail 0
▲ Next.js 16.2.3
✓ Compiled successfully
```

- [ ] **Step 4: review 관점으로 diff를 다시 읽고 문제를 조치한다**

Run:

```bash
git diff -- docs/superpowers/specs/2026-04-18-local-council-kst-datetime-display-design.md \
  docs/superpowers/plans/2026-04-18-local-council-kst-datetime-display-implementation-plan.md \
  src/features/local-council/time.ts \
  src/features/local-council/data.ts \
  src/features/local-council/detail.ts \
  src/features/local-council/components/LocalCouncilPersonDetailView.tsx \
  tests/local_council_time.test.ts \
  tests/local_council_detail.test.ts \
  docs/local-council/runbooks/local-frontend-backend-check-guide.md \
  docs/local-council/notes/current/local-council-member-current-status-brief.md
```

Check:

```text
- local-council 밖 import/사용이 없는지
- free-text explanation 문장을 날짜 치환하지 않았는지
- date-only가 KST midnight로 표기되는지
- invalid 문자열이 깨지지 않는지
```
