# 현직 지방의원 활동 근거 상세 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `local-council` 상세 화면에서 `의안`과 `회의` 카드를 activity grounding contract에 맞게 재구성하고, locator replay와 보수적 grounding 상태를 사용자에게 정확히 보여준다.

**Architecture:** 페이지 전체 골격은 유지하고, `src/features/local-council/detail.ts`와 `LocalCouncilPersonDetailView.tsx`를 중심으로 `의안`/`회의` 전용 card adapter를 추가한다. item-level `official_record_locator`를 기존 generic source fallback보다 우선하고, `meeting_activity`는 `content_grounding.status == "supported"`일 때만 활동 요약을 본문처럼 노출한다. 구청장 `district_head_official_minutes` demotion 정책은 sample fixture와 diagnostics copy에서 함께 반영한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, node:test via `tsx`, Tailwind CSS utility classes, JSON sample fixtures.

---

## File Map

- `src/data/samples/sample_local_council_gangdong_person_dossiers.json`
  - 강동구 local-council sample dossier 정본 fixture. 새 `bill_summary`, `content_grounding`, `official_record_locator`, `data_gap_flags` 사례를 대표한다.
- `src/features/local-council/data.ts`
  - activity grounding raw enum과 `data_gap_flags`를 사용자 문구로 바꾸는 label helper를 둔다.
- `src/features/local-council/detail.ts`
  - 기존 generic section card builder를 유지하면서 `의안`/`회의` 전용 adapter와 locator-aware action resolution을 추가한다.
- `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
  - 권장안 정보 위계대로 `의안`/`회의` 카드를 렌더링하고, diagnostics flag를 사용자 문구로 표시한다.
- `tests/local_council_detail.test.ts`
  - sample fixture contract, label helper, card adapter, rendered DOM 회귀를 잠그는 핵심 테스트 파일.
- `docs/local-council/runbooks/local-frontend-backend-check-guide.md`
  - 수동 점검 기준 문서. 새 버튼 라벨과 구청장 meeting demotion 정책을 기록한다.
- `docs/local-council/notes/current/local-council-member-current-status-brief.md`
  - 현재 상태 brief. `의안`/`회의` 카드 semantics와 demotion 정책을 반영한다.

## Preflight

- [ ] **Step 1: worktree와 baseline을 다시 확인한다**

Run:

```bash
git branch --show-current
pwd
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run lint'
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_api_client.test.ts tests/local_council_proxy.test.ts tests/local_council_detail.test.ts'
```

Expected:

```text
codex/local-council-activity-grounding-ui
/Users/eric/dev/upstage/woogook/woogook-frontend/.worktrees/local-council-activity-grounding-ui
> woogook_fe_test@0.1.0 lint
> node scripts/lint-tracked-files.mjs
ℹ pass 53
ℹ fail 0
```

If this baseline is not clean, stop and resolve it before editing code.

---

### Task 1: Lock the sample fixture to the new activity grounding contract

**Files:**
- Modify: `src/data/samples/sample_local_council_gangdong_person_dossiers.json`
- Modify: `tests/local_council_detail.test.ts`

- [ ] **Step 1: Add a failing sample contract test**

Append these tests to `tests/local_council_detail.test.ts`.

```ts
test("sample council member dossier includes activity grounding fields for bills and meetings", () => {
  const person =
    dossiers[
      "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640"
    ];

  assert.equal(person.bills[0]?.participation_type, "primary_sponsor");
  assert.equal(person.bills[0]?.bill_stage, "approved");
  assert.equal(person.bills[0]?.ordinance_status, "approved_not_confirmed");
  assert.equal(person.bills[0]?.bill_summary?.status, "title_only");
  assert.equal(
    person.bills[0]?.bill_summary?.summary_line,
    "강동구 청년 지원에 관한 조례를 정하는 의안이다.",
  );
  assert.equal(person.bills[0]?.official_record_locator?.kind, "bill_detail");

  assert.equal(person.meeting_activity[0]?.activity_type, "district_question");
  assert.equal(person.meeting_activity[0]?.activity_label, "구정질문");
  assert.equal(person.meeting_activity[0]?.record_grounding_level, "record_located");
  assert.equal(person.meeting_activity[0]?.content_grounding?.status, "unavailable");
});

test("sample district head dossier reflects demoted meeting linkage policy", () => {
  const person = dossiers["seoul-gangdong:district-head"];

  assert.deepEqual(person.meeting_activity, []);
  assert.equal(
    person.diagnostics?.data_gap_flags?.includes(
      "uncollected:district_head_minutes_person_linkage",
    ),
    true,
  );
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern "sample council member dossier includes activity grounding fields for bills and meetings|sample district head dossier reflects demoted meeting linkage policy"'
```

Expected: FAIL because the fixture does not yet contain `participation_type`, `bill_summary`, `record_grounding_level`, or the district-head demotion flag.

- [ ] **Step 3: Update the sample fixture with additive bill/meeting fields**

Patch the relevant sample records in `src/data/samples/sample_local_council_gangdong_person_dossiers.json`.

Use the district-head fragment below.

```json
"meeting_activity": [],
"diagnostics": {
  "publish_status": "publishable",
  "final_publish_status": "publishable",
  "agentic_review_status": "pass",
  "agentic_enrichment_status": "success",
  "data_gap_flags": [
    "uncollected:district_head_minutes_person_linkage"
  ],
  "needs_human_review": [],
  "spot_check": {
    "kind": "district_head",
    "person_key": "seoul-gangdong:district-head",
    "source_kind": "gangdong_district_head_official_profile"
  },
  "explanation_lines": [
    "구청장 개인 회의 활동은 아직 회의록 inventory를 개인 활동으로 귀속하지 않습니다."
  ]
}
```

Update the council-member sample bill and meeting items like this.

```json
"bills": [
  {
    "bill_id": "0463",
    "bill_title": "서울특별시 강동구 청년 지원 조례안",
    "proposed_at": "2026-04-07",
    "result_label": "원안가결",
    "participation_type": "primary_sponsor",
    "participation_label": "대표발의",
    "bill_stage": "approved",
    "ordinance_status": "approved_not_confirmed",
    "bill_summary": {
      "status": "title_only",
      "summary_basis": "bill_title",
      "summary_line": "강동구 청년 지원에 관한 조례를 정하는 의안이다."
    },
    "official_record_locator": {
      "kind": "bill_detail",
      "bill_id": "0463",
      "source_url": "https://council.gangdong.go.kr/meeting/bill/bill.do",
      "display_hint": "의안 상세 보기"
    },
    "source_ref": {
      "role": "official_activity"
    }
  }
],
"meeting_activity": [
  {
    "session_label": "제322회 임시회",
    "meeting_date": "2026-03-25(수)",
    "meeting_name": "제322회 임시회 구정질문",
    "activity_type": "district_question",
    "activity_label": "구정질문",
    "record_grounding_level": "record_located",
    "activity_summary_line": null,
    "content_grounding": {
      "status": "unavailable",
      "claim_type": "question"
    },
    "official_record_locator": {
      "kind": "council_minutes_popup",
      "source_url": "https://council.gangdong.go.kr/meeting/confer/recent.do",
      "display_hint": "회의록 팝업 다시 열기"
    },
    "source_ref": {
      "role": "official_activity"
    }
  }
],
"diagnostics": {
  "data_gap_flags": [
    "uncollected:meeting_content_grounding"
  ]
}
```

- [ ] **Step 4: Re-run the targeted tests**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern "sample council member dossier includes activity grounding fields for bills and meetings|sample district head dossier reflects demoted meeting linkage policy"'
```

Expected:

```text
✔ sample council member dossier includes activity grounding fields for bills and meetings
✔ sample district head dossier reflects demoted meeting linkage policy
ℹ fail 0
```

- [ ] **Step 5: Commit**

```bash
git add src/data/samples/sample_local_council_gangdong_person_dossiers.json tests/local_council_detail.test.ts
git commit -m "test(local-council): lock activity grounding sample fixtures"
```

---

### Task 2: Add label helpers for activity grounding semantics

**Files:**
- Modify: `src/features/local-council/data.ts`
- Modify: `tests/local_council_detail.test.ts`

- [ ] **Step 1: Add failing helper tests**

Extend the import list in `tests/local_council_detail.test.ts` and add this test.

```ts
import {
  buildLocalCouncilSourceContractSummaryViewModel,
  buildLocalCouncilOverlayViewModel,
  buildLocalCouncilDiagnosticsViewModel,
  getLocalCouncilFreshnessDetailRows,
  getLocalCouncilOfficeExplanation,
  getLocalCouncilSummaryBasisLabels,
  getLocalCouncilSummaryEvidenceDigest,
  getLocalCouncilParticipationTypeLabel,
  getLocalCouncilRecordGroundingLevelLabel,
  getLocalCouncilContentGroundingStatusLabel,
  getLocalCouncilActivityTypeLabel,
  getLocalCouncilDataGapFlagLabel,
} from "../src/features/local-council/data";

test("local council activity grounding helpers translate labels conservatively", () => {
  assert.equal(getLocalCouncilParticipationTypeLabel("primary_sponsor"), "대표발의");
  assert.equal(getLocalCouncilParticipationTypeLabel("listed_activity"), "의안 참여 기록");
  assert.equal(getLocalCouncilRecordGroundingLevelLabel("record_located"), "공식 기록 위치 확인");
  assert.equal(getLocalCouncilContentGroundingStatusLabel("unavailable"), "내용 검토 전");
  assert.equal(getLocalCouncilActivityTypeLabel("district_question"), "구정질문");
  assert.equal(
    getLocalCouncilDataGapFlagLabel("uncollected:district_head_minutes_person_linkage"),
    "구청장 개인 회의 활동 linkage는 아직 수집/검토 전입니다.",
  );
});
```

- [ ] **Step 2: Run the helper test and confirm it fails**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern "local council activity grounding helpers translate labels conservatively"'
```

Expected: FAIL because the helper exports do not exist yet.

- [ ] **Step 3: Implement the label helpers in `src/features/local-council/data.ts`**

Add the following helpers near the other terminology functions.

```ts
export function getLocalCouncilParticipationTypeLabel(participationType: string) {
  const labels: Record<string, string> = {
    primary_sponsor: "대표발의",
    co_sponsor: "공동발의",
    submitted_by_district_head: "구청장 제출",
    listed_activity: "의안 참여 기록",
  };
  return labels[participationType] || participationType;
}

export function getLocalCouncilRecordGroundingLevelLabel(level: string) {
  const labels: Record<string, string> = {
    record_listed: "공식 기록 목록 확인",
    record_located: "공식 기록 위치 확인",
  };
  return labels[level] || level;
}

export function getLocalCouncilContentGroundingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    not_eligible: "내용 검토 대상 아님",
    queued: "내용 검토 대기",
    supported: "내용 검토 완료",
    mention_only: "직접 활동 확인 전",
    unclear: "판단 유보",
    human_review_required: "사람 검토 필요",
    unavailable: "내용 검토 전",
  };
  return labels[status] || status;
}

export function getLocalCouncilActivityTypeLabel(activityType: string) {
  const labels: Record<string, string> = {
    plenary: "본회의",
    standing_committee: "상임위 회의",
    special_committee: "특위 회의",
    district_question: "구정질문",
    five_minute_speech: "5분자유발언",
    administrative_audit: "행정사무감사",
    budget_review: "예산심사",
    general_meeting: "회의 활동",
  };
  return labels[activityType] || activityType;
}

export function getLocalCouncilDataGapFlagLabel(flag: string) {
  const labels: Record<string, string> = {
    "uncollected:district_head_minutes_person_linkage":
      "구청장 개인 회의 활동 linkage는 아직 수집/검토 전입니다.",
    "uncollected:meeting_content_grounding":
      "회의 내용 grounding은 아직 수행되지 않았습니다.",
    "uncollected:bill_detail_summary":
      "의안 상세 원문 기반 요약은 아직 준비되지 않았습니다.",
  };
  return labels[flag] || flag;
}
```

- [ ] **Step 4: Re-run the helper test**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern "local council activity grounding helpers translate labels conservatively"'
```

Expected:

```text
✔ local council activity grounding helpers translate labels conservatively
ℹ fail 0
```

- [ ] **Step 5: Commit**

```bash
git add src/features/local-council/data.ts tests/local_council_detail.test.ts
git commit -m "feat(local-council): add activity grounding labels"
```

---

### Task 3: Add bill/meeting card adapters and locator-aware actions

**Files:**
- Modify: `src/features/local-council/detail.ts`
- Modify: `tests/local_council_detail.test.ts`

- [ ] **Step 1: Add failing adapter tests**

Add these tests to `tests/local_council_detail.test.ts`.

```ts
import {
  buildPersonHeroMeta,
  resolveSectionActionLink,
  buildSectionDetailRows,
  buildSectionCardViewModel,
  buildExpandableSectionContentId,
  buildBillActivityCardViewModel,
  buildMeetingActivityCardViewModel,
} from "../src/features/local-council/detail";

test("buildBillActivityCardViewModel prefers official record locators over generic source refs", () => {
  const card = buildBillActivityCardViewModel({
    item: {
      bill_title: "서울특별시 강동구 청년 지원 조례안",
      participation_type: "primary_sponsor",
      bill_stage: "approved",
      ordinance_status: "approved_not_confirmed",
      result_label: "원안가결",
      bill_summary: {
        status: "title_only",
        summary_line: "강동구 청년 지원에 관한 조례를 정하는 의안이다.",
      },
      official_record_locator: {
        kind: "bill_detail",
        source_url: "https://example.com/bills/0463",
      },
      source_ref: {
        role: "official_activity",
      },
    },
    sectionSourceRefs: [
      {
        source_kind: "gangdong_council_official_activity",
        role: "official_activity",
        source_url: "https://example.com/fallback-bills",
      },
    ],
  });

  assert.deepEqual(card.badges?.map((badge) => badge.label), [
    "대표발의",
    "원안가결",
  ]);
  assert.equal(card.summaryLine, "강동구 청년 지원에 관한 조례를 정하는 의안이다.");
  assert.equal(card.actions.viewLabel, "의안 상세 열기");
  assert.equal(card.actions.viewUrl, "https://example.com/bills/0463");
});

test("buildMeetingActivityCardViewModel keeps unsupported meetings conservative", () => {
  const card = buildMeetingActivityCardViewModel({
    item: {
      session_label: "제322회 임시회",
      activity_label: "구정질문",
      record_grounding_level: "record_located",
      content_grounding: {
        status: "unavailable",
      },
      official_record_locator: {
        kind: "council_minutes_popup",
        source_url: "https://example.com/minutes",
      },
      source_ref: {
        role: "official_activity",
      },
    },
    sectionSourceRefs: [
      {
        source_kind: "gangdong_council_official_activity",
        role: "official_activity",
        source_url: "https://example.com/fallback-minutes",
      },
    ],
  });

  assert.equal(card.headline, "제322회 임시회 · 구정질문");
  assert.deepEqual(card.badges?.map((badge) => badge.label), [
    "공식 기록 위치 확인",
    "내용 검토 전",
  ]);
  assert.equal(
    card.summaryLine,
    "공식 기록 위치는 확보됐지만 발언 요약은 아직 승격하지 않음",
  );
  assert.equal(card.actions.viewLabel, "회의록 위치 확인");
  assert.equal(card.actions.viewUrl, "https://example.com/minutes");
});
```

- [ ] **Step 2: Run the adapter tests and confirm they fail**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern "buildBillActivityCardViewModel prefers official record locators over generic source refs|buildMeetingActivityCardViewModel keeps unsupported meetings conservative"'
```

Expected: FAIL because the adapter functions and `actions.viewLabel` field do not exist yet.

- [ ] **Step 3: Extend the card model and add bill/meeting adapters in `detail.ts`**

Add the new view-model types and helpers.

```ts
export interface SectionCardBadge {
  label: string;
  tone: "accent" | "subtle";
}

export interface SectionCardActions {
  viewUrl: string | null;
  viewLabel: string | null;
  downloadUrl: string | null;
  downloadLabel: string | null;
}

export interface SectionCardViewModel {
  headline: string;
  meta: string | null;
  detailRows: SectionCardDetailRow[];
  actions: SectionCardActions;
  sourceLabel: string | null;
  sourceUrl: string | null;
  sourceLinks: SectionCardSourceLink[];
  badges?: SectionCardBadge[];
  summaryLine?: string | null;
}
```

Add locator-aware action helpers.

```ts
function getLocatorAction(record: Record<string, unknown> | null) {
  if (!record) {
    return { viewUrl: null, viewLabel: null };
  }

  const kind = asText(record.kind);
  const viewUrl = sanitizeExternalUrl(record.source_url);

  if (!viewUrl) {
    return { viewUrl: null, viewLabel: null };
  }

  const labels: Record<string, string> = {
    bill_detail: "의안 상세 열기",
    ordinance_registry: "자치법규 원문 보기",
    video_url: "영상 회의록 보기",
    council_minutes_popup: "회의록 위치 확인",
  };

  return {
    viewUrl,
    viewLabel: kind ? labels[kind] || "원문 보기" : "원문 보기",
  };
}
```

Add the two adapters.

```ts
export function buildBillActivityCardViewModel(args: {
  item: Record<string, unknown>;
  sectionSourceRefs: Record<string, unknown>[];
}): SectionCardViewModel {
  const locator = asRecord(args.item.official_record_locator);
  const locatorAction = getLocatorAction(locator);
  const fallbackActions = resolveSectionActionLink({
    item: args.item,
    sectionSourceRefs: args.sectionSourceRefs,
    preferredSourceKinds: [],
    preferredSourceRoles: ["official_activity"],
  });

  return {
    headline:
      firstValue(args.item, ["bill_title", "bill_name", "title"]) ?? "의안 제목 확인 필요",
    meta:
      [
        asText(args.item.proposed_at),
        asText(args.item.result_label),
      ].filter((value): value is string => Boolean(value)).join(" · ") || null,
    badges: [
      asText(args.item.participation_type) === "primary_sponsor"
        ? { label: "대표발의", tone: "accent" }
        : asText(args.item.participation_type)
          ? { label: getLocalCouncilParticipationTypeLabel(asText(args.item.participation_type)!), tone: "subtle" }
          : null,
      asText(args.item.result_label)
        ? { label: asText(args.item.result_label)!, tone: "subtle" }
        : null,
    ].filter((badge): badge is SectionCardBadge => Boolean(badge)),
    summaryLine:
      asText(asRecord(args.item.bill_summary).summary_line) ?? null,
    detailRows: buildSectionDetailRows(args.item, [
      { label: "상태", keys: ["bill_stage", "ordinance_status"] },
      { label: "제안일", keys: ["proposed_at"] },
    ]),
    actions: {
      viewUrl: locatorAction.viewUrl ?? fallbackActions.viewUrl,
      viewLabel: locatorAction.viewLabel ?? "원문 링크 보기",
      downloadUrl: fallbackActions.downloadUrl,
      downloadLabel: fallbackActions.downloadUrl ? "파일 다운로드" : null,
    },
    sourceLabel: resolveSectionSourceLabel({
      item: args.item,
      sectionSourceRefs: args.sectionSourceRefs,
      preferredSourceKinds: [],
      preferredSourceRoles: ["official_activity"],
    }),
    sourceUrl: locatorAction.viewUrl ?? fallbackActions.viewUrl,
    sourceLinks: resolveSectionSourcePayload({
      item: args.item,
      sectionSourceRefs: args.sectionSourceRefs,
      preferredSourceKinds: [],
      preferredSourceRoles: ["official_activity"],
    }).sourceLinks,
  };
}
```

```ts
export function buildMeetingActivityCardViewModel(args: {
  item: Record<string, unknown>;
  sectionSourceRefs: Record<string, unknown>[];
}): SectionCardViewModel {
  const locator = asRecord(args.item.official_record_locator);
  const locatorAction = getLocatorAction(locator);
  const groundingStatus = asText(asRecord(args.item.content_grounding).status) ?? "unavailable";
  const supportedSummary =
    groundingStatus === "supported" ? asText(args.item.activity_summary_line) : null;

  return {
    headline:
      [
        asText(args.item.session_label),
        asText(args.item.activity_label) ?? getLocalCouncilActivityTypeLabel(asText(args.item.activity_type) ?? ""),
      ].filter((value): value is string => Boolean(value)).join(" · ") || "회의 활동",
    meta: asText(args.item.meeting_date) ?? null,
    badges: [
      asText(args.item.record_grounding_level)
        ? {
            label: getLocalCouncilRecordGroundingLevelLabel(
              asText(args.item.record_grounding_level)!,
            ),
            tone: "subtle",
          }
        : null,
      {
        label: getLocalCouncilContentGroundingStatusLabel(groundingStatus),
        tone: groundingStatus === "supported" ? "accent" : "subtle",
      },
    ].filter((badge): badge is SectionCardBadge => Boolean(badge)),
    summaryLine:
      supportedSummary ??
      "공식 기록 위치는 확보됐지만 발언 요약은 아직 승격하지 않음",
    detailRows: buildSectionDetailRows(args.item, [
      { label: "회의일", keys: ["meeting_date"] },
      { label: "회의명", keys: ["meeting_name"] },
    ]),
    actions: {
      viewUrl: locatorAction.viewUrl,
      viewLabel: locatorAction.viewLabel,
      downloadUrl: null,
      downloadLabel: null,
    },
    sourceLabel: resolveSectionSourceLabel({
      item: args.item,
      sectionSourceRefs: args.sectionSourceRefs,
      preferredSourceKinds: [],
      preferredSourceRoles: ["official_activity"],
    }),
    sourceUrl: locatorAction.viewUrl,
    sourceLinks: resolveSectionSourcePayload({
      item: args.item,
      sectionSourceRefs: args.sectionSourceRefs,
      preferredSourceKinds: [],
      preferredSourceRoles: ["official_activity"],
    }).sourceLinks,
  };
}
```

Update `buildSectionCardViewModel()` to return `viewLabel: null`, `downloadLabel: null` by default so existing callers continue to work.

- [ ] **Step 4: Re-run the adapter tests**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern "buildBillActivityCardViewModel prefers official record locators over generic source refs|buildMeetingActivityCardViewModel keeps unsupported meetings conservative"'
```

Expected:

```text
✔ buildBillActivityCardViewModel prefers official record locators over generic source refs
✔ buildMeetingActivityCardViewModel keeps unsupported meetings conservative
ℹ fail 0
```

- [ ] **Step 5: Commit**

```bash
git add src/features/local-council/detail.ts tests/local_council_detail.test.ts
git commit -m "feat(local-council): add activity grounding card adapters"
```

---

### Task 4: Render the recommended bill/meeting hierarchy in the detail page

**Files:**
- Modify: `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
- Modify: `src/features/local-council/data.ts`
- Modify: `tests/local_council_detail.test.ts`

- [ ] **Step 1: Add failing render tests**

Add these tests to `tests/local_council_detail.test.ts`.

```ts
test("LocalCouncilPersonDetailView renders bill badges, summary, and locator-aware action labels", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView({
    expandedKey: "의안:0",
  });
  const person =
    dossiers[
      "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640"
    ] as LocalCouncilPersonDossierResponse;

  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person,
      dataSource: "backend",
      onBack: () => undefined,
    }),
  );

  assert.match(html, /대표발의/);
  assert.match(html, /강동구 청년 지원에 관한 조례를 정하는 의안이다\./);
  assert.match(html, /의안 상세 열기/);
});

test("LocalCouncilPersonDetailView keeps unsupported meeting copy conservative", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView({
    expandedKey: "회의:0",
  });
  const person =
    dossiers[
      "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640"
    ] as LocalCouncilPersonDossierResponse;

  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person,
      dataSource: "backend",
      onBack: () => undefined,
    }),
  );

  assert.match(html, /공식 기록 위치 확인/);
  assert.match(html, /내용 검토 전/);
  assert.match(
    html,
    /공식 기록 위치는 확보됐지만 발언 요약은 아직 승격하지 않음/,
  );
  assert.match(html, /회의록 위치 확인/);
});

test("LocalCouncilPersonDetailView translates district head data gaps instead of showing raw flags", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView();
  const person = dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse;

  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person,
      dataSource: "backend",
      onBack: () => undefined,
    }),
  );

  assert.doesNotMatch(html, /uncollected:district_head_minutes_person_linkage/);
  assert.match(html, /구청장 개인 회의 활동 linkage는 아직 수집\/검토 전입니다\./);
});
```

- [ ] **Step 2: Run the render tests and confirm they fail**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern "LocalCouncilPersonDetailView renders bill badges, summary, and locator-aware action labels|LocalCouncilPersonDetailView keeps unsupported meeting copy conservative|LocalCouncilPersonDetailView translates district head data gaps instead of showing raw flags"'
```

Expected: FAIL because the current component does not render badges, `summaryLine`, dynamic action labels, or translated data-gap copy.

- [ ] **Step 3: Update `LocalCouncilPersonDetailView.tsx` to use the new adapters and render optional UI**

Import the new adapter helpers and the flag label helper.

```tsx
import {
  buildLocalCouncilDiagnosticsViewModel,
  buildLocalCouncilOverlayViewModel,
  buildLocalCouncilSourceContractSummaryViewModel,
  getLocalCouncilDataGapFlagLabel,
  getLocalCouncilDataSourceLabel,
  getLocalCouncilExplainabilityLines,
  getLocalCouncilFreshnessDetailRows,
  getLocalCouncilFreshnessLabel,
  getLocalCouncilOfficeExplanation,
  getLocalCouncilOfficeLabel,
  getLocalCouncilSummaryBasisLabels,
  getLocalCouncilSummaryEvidenceDigest,
  getLocalCouncilSummaryFallbackReason,
  getLocalCouncilSummaryModeLabel,
  getPayloadText,
  type LocalCouncilLabelValue,
} from "@/features/local-council/data";
import {
  buildBillActivityCardViewModel,
  buildExpandableSectionContentId,
  buildMeetingActivityCardViewModel,
  buildPersonHeroMeta,
  buildSectionCardViewModel,
  type SectionCardViewModel,
} from "@/features/local-council/detail";
```

Render translated flag chips instead of raw tokens.

```tsx
{diagnostics.dataGapFlags.length > 0 ? (
  <div className="mt-4">
    <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
      data_gap_flags
    </p>
    <ChipGroup items={diagnostics.dataGapFlags.map(getLocalCouncilDataGapFlagLabel)} />
  </div>
) : null}
```

Use bill/meeting adapters instead of the generic builder.

```tsx
const officialActivityItems = person.bills.map((item) =>
  buildBillActivityCardViewModel({
    item,
    sectionSourceRefs: person.source_refs,
  }),
);

const meetingItems = person.meeting_activity.map((item) =>
  buildMeetingActivityCardViewModel({
    item,
    sectionSourceRefs: person.source_refs,
  }),
);
```

Teach `ExpandableRecordList` to render optional badges and summary before expansion.

```tsx
{item.badges && item.badges.length > 0 ? (
  <div className="mt-2 flex flex-wrap gap-2">
    {item.badges.map((badge) => (
      <span
        key={`${recordKey}:${badge.label}`}
        className="rounded-full border px-2.5 py-1 text-[12px] font-semibold"
        style={{
          borderColor: "var(--border)",
          color: badge.tone === "accent" ? "var(--amber)" : "var(--text-secondary)",
          background: badge.tone === "accent" ? "var(--amber-bg)" : "var(--surface-alt)",
        }}
      >
        {badge.label}
      </span>
    ))}
  </div>
) : null}
{item.summaryLine ? (
  <p className="mt-2 text-sm leading-6" style={{ color: "var(--foreground)" }}>
    {item.summaryLine}
  </p>
) : null}
```

Use dynamic action labels.

```tsx
{item.actions.viewUrl ? (
  <a
    href={item.actions.viewUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
    style={{ borderColor: "var(--border)", color: "var(--navy)" }}
  >
    {item.actions.viewLabel ?? "원문 보기"}
  </a>
) : null}
{item.actions.downloadUrl ? (
  <a
    href={item.actions.downloadUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
    style={{ borderColor: "var(--border)", color: "var(--navy)" }}
  >
    {item.actions.downloadLabel ?? "파일 다운로드"}
  </a>
) : null}
```

- [ ] **Step 4: Re-run the render tests**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern "LocalCouncilPersonDetailView renders bill badges, summary, and locator-aware action labels|LocalCouncilPersonDetailView keeps unsupported meeting copy conservative|LocalCouncilPersonDetailView translates district head data gaps instead of showing raw flags"'
```

Expected:

```text
✔ LocalCouncilPersonDetailView renders bill badges, summary, and locator-aware action labels
✔ LocalCouncilPersonDetailView keeps unsupported meeting copy conservative
✔ LocalCouncilPersonDetailView translates district head data gaps instead of showing raw flags
ℹ fail 0
```

- [ ] **Step 5: Commit**

```bash
git add src/features/local-council/components/LocalCouncilPersonDetailView.tsx src/features/local-council/data.ts tests/local_council_detail.test.ts
git commit -m "feat(local-council): render activity grounding detail cards"
```

---

### Task 5: Update human-facing docs and run full verification

**Files:**
- Modify: `docs/local-council/runbooks/local-frontend-backend-check-guide.md`
- Modify: `docs/local-council/notes/current/local-council-member-current-status-brief.md`

- [ ] **Step 1: Update the runbook with the new UI expectations**

Add or update bullets in `docs/local-council/runbooks/local-frontend-backend-check-guide.md` so the manual check explicitly covers:

```md
- `의안` 카드에 `대표발의` 또는 동등 participation badge가 보인다.
- `bill_summary`가 있는 경우 `의안 내용` 1문장이 카드에 보인다.
- bill locator가 있으면 버튼 라벨이 `의안 상세 열기` 또는 동등한 locator-aware 문구로 보인다.
- meeting item이 `supported`가 아니면 `직접 발언 확인`처럼 읽히지 않고, `공식 기록 위치는 확보됐지만 발언 요약은 아직 승격하지 않음` 같은 보수적 문구가 보인다.
- 구청장 상세는 `district_head_official_minutes`를 개인 회의 활동으로 승격하지 않고, 관련 진단 플래그를 설명형 문구로 보여준다.
```

- [ ] **Step 2: Update the current-status brief**

Add or revise bullets in `docs/local-council/notes/current/local-council-member-current-status-brief.md` to reflect the new contract.

```md
- `bills` 카드:
  - `participation_type`, `bill_stage`, `ordinance_status`, `bill_summary`, `official_record_locator`를 읽기 쉬운 카드 정보로 보여 준다.
- `meeting_activity` 카드:
  - `record_grounding_level`과 `content_grounding.status`를 분리해서 보여 준다.
  - `activity_summary_line`은 `supported`인 경우에만 본문처럼 노출한다.
- 구청장 meeting policy:
  - `district_head_official_minutes`는 개인 활동 근거가 아니라 `council-level minutes index`로 다루며, diagnostics copy에서 그 한계를 설명한다.
```

- [ ] **Step 3: Run the full verification set**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run lint'
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run test:local-council-samples'
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npx --yes tsx --test tests/local_council_api_client.test.ts tests/local_council_proxy.test.ts tests/local_council_detail.test.ts'
zsh -lc 'source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use >/dev/null && npm run build'
```

Expected:

```text
> woogook_fe_test@0.1.0 lint
> node scripts/lint-tracked-files.mjs
validated 3 local council person dossier samples
ℹ fail 0
Route (app)
```

- [ ] **Step 4: Commit**

```bash
git add docs/local-council/runbooks/local-frontend-backend-check-guide.md docs/local-council/notes/current/local-council-member-current-status-brief.md
git commit -m "docs(local-council): document activity grounding detail UI"
```

## Spec Coverage Check

- `의안`/`회의` 카드 위계 재구성: `Task 3`, `Task 4`
- `official_record_locator` 우선 replay surface: `Task 3`, `Task 4`
- `content_grounding` 보수적 노출 규칙: `Task 2`, `Task 3`, `Task 4`
- `district_head_official_minutes` demotion 정책: `Task 1`, `Task 4`, `Task 5`
- sample fixture와 테스트 갱신: `Task 1`, `Task 4`
- runbook/current-status 문서 동기화: `Task 5`

## Notes For Execution

- 이 plan은 `local-council` 상세 화면 내부의 `의안`/`회의` 카드만 다시 짠다. 다른 섹션까지 같이 리디자인하지 않는다.
- `popup_params`는 frontend가 직접 URL 규칙을 발명해 재조합하지 않는다. locator가 직접 사용할 수 있는 `source_url`을 줄 때만 버튼으로 노출한다.
- `meeting_activity` item이 `supported`가 아니면 발언 요약을 비워 두고, 사람이 읽는 fallback 문장만 보여 준다.
