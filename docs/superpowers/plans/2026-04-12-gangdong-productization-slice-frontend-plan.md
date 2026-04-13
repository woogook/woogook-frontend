# Gangdong Productization Slice Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the new Gangdong local-council productization contract in the detail and roster UI while keeping the frontend tolerant of legacy sample payloads.

**Architecture:** Keep the contract boundary loose in `src/lib/schemas.ts` so richer backend payloads do not break parsing, then add focused display helpers in `src/features/local-council/data.ts` for the new evidence, diagnostics, and freshness text. Render the new contract directly in the existing detail and roster components instead of introducing a new `detail.ts` abstraction, and update the sample fixture plus tests to lock the visible behavior and the sample/live drift down together.

**Tech Stack:** TypeScript, React, Next.js, Zod, node test runner, `tsx`.

---

### Task 1: Extend the local-council contract boundary and display helpers

**Files:**
- Modify: `/Users/eric/dev/upstage/woogook/woogook-frontend/src/lib/schemas.ts`
- Modify: `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/data.ts`
- Test: `/Users/eric/dev/upstage/woogook/woogook-frontend/tests/local_council_detail.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("local council detail helpers surface optional evidence and diagnostics fields", () => {
  const result = buildLocalCouncilDetailMeta({
    summary: {
      evidence_digest: "공식 프로필과 회의록을 기준으로 확인",
      fallback_reason: "공식 요약이 아직 비어 있어 기본 요약을 사용",
      summary_basis: {
        source_kinds: ["gangdong_district_head_official_profile"],
      },
    },
    diagnostics: {
      spot_check: "2026-04-08 샘플 점검 완료",
      publish_status: "publishable",
    },
    freshness: {
      basis_timestamp: "2026-04-08T10:10:00+09:00",
      source_snapshot_at: "2026-04-08T09:50:00+09:00",
    },
  });

  assert.equal(result.evidenceDigest, "공식 프로필과 회의록을 기준으로 확인");
  assert.equal(result.fallbackReason, "공식 요약이 아직 비어 있어 기본 요약을 사용");
  assert.equal(result.spotCheck, "2026-04-08 샘플 점검 완료");
  assert.equal(result.publishStatus, "publishable");
  assert.equal(result.freshnessLabel, "기준 2026-04-08T10:10:00+09:00");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern 'local council detail helpers surface optional evidence and diagnostics fields'`
Expected: FAIL because `buildLocalCouncilDetailMeta` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export const localCouncilPersonSummarySchema = z
  .object({
    headline: z.string(),
    grounded_summary: z.string(),
    summary_mode: z.enum(["agentic", "fallback", "none"]),
    summary_basis: localCouncilPayloadObjectSchema,
    evidence_digest: z.string().nullable().optional(),
    fallback_reason: z.string().nullable().optional(),
  })
  .catchall(z.unknown());

export const localCouncilPersonDossierResponseSchema = z.object({
  person_name: z.string(),
  office_type: z.string(),
  summary: localCouncilPersonSummarySchema,
  official_profile: localCouncilPayloadObjectSchema,
  committees: z.array(localCouncilPayloadObjectSchema),
  bills: z.array(localCouncilPayloadObjectSchema),
  meeting_activity: z.array(localCouncilPayloadObjectSchema),
  finance_activity: z.array(localCouncilPayloadObjectSchema),
  elected_basis: localCouncilPayloadObjectSchema,
  source_refs: z.array(localCouncilPayloadObjectSchema),
  diagnostics: localCouncilPayloadObjectSchema.optional(),
  freshness: localCouncilPayloadObjectSchema,
});

export function getLocalCouncilFreshnessLabel(freshness: Record<string, unknown>) {
  const timestamp = freshness.basis_timestamp;
  if (typeof timestamp !== "string" || !timestamp.trim()) {
    return "기준 시각 확인 필요";
  }
  return `기준 ${timestamp}`;
}
```

```ts
export function buildLocalCouncilDetailMeta(input: {
  summary: Record<string, unknown>;
  diagnostics?: Record<string, unknown> | null;
  freshness: Record<string, unknown>;
}) {
  return {
    evidenceDigest: getPayloadText(input.summary as Record<string, unknown>, ["evidence_digest"]),
    fallbackReason: getPayloadText(input.summary as Record<string, unknown>, ["fallback_reason"]),
    spotCheck: getPayloadText(input.diagnostics ?? {}, ["spot_check", "spot_check_note"]),
    publishStatus: getPayloadText(input.diagnostics ?? {}, ["publish_status"]),
    freshnessLabel: getLocalCouncilFreshnessLabel(input.freshness),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern 'local council detail helpers surface optional evidence and diagnostics fields'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schemas.ts src/features/local-council/data.ts tests/local_council_detail.test.ts
git commit -m "feat: extend local council contract helpers"
```

### Task 2: Render evidence digest, diagnostics, and freshness explanations in the detail surface

**Files:**
- Modify: `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
- Test: `/Users/eric/dev/upstage/woogook/woogook-frontend/tests/local_council_detail.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("LocalCouncilPersonDetailView renders evidence digest and diagnostics blocks when present", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView({
    expandedKey: "공식 프로필:0",
  });
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person: {
        person_name: "이수희",
        office_type: "basic_head",
        summary: {
          headline: "이수희 공식 근거 요약",
          grounded_summary: "요약 본문",
          summary_mode: "fallback",
          summary_basis: { source_kinds: ["gangdong_district_head_official_profile"] },
          evidence_digest: "공식 프로필과 회의록을 기준으로 확인",
          fallback_reason: "공식 요약이 없어 기본 요약을 사용",
        },
        diagnostics: {
          spot_check: "2026-04-08 샘플 점검 완료",
          publish_status: "publishable",
        },
        official_profile: {},
        committees: [],
        bills: [],
        meeting_activity: [],
        finance_activity: [],
        elected_basis: {},
        source_refs: [],
        freshness: {
          basis_timestamp: "2026-04-08T10:10:00+09:00",
          source_snapshot_at: "2026-04-08T09:50:00+09:00",
        },
      },
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  assert.match(html, /근거 요약/);
  assert.match(html, /공식 프로필과 회의록을 기준으로 확인/);
  assert.match(html, /진단/);
  assert.match(html, /2026-04-08 샘플 점검 완료/);
  assert.match(html, /기준 2026-04-08T10:10:00\+09:00/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern 'LocalCouncilPersonDetailView renders evidence digest and diagnostics blocks when present'`
Expected: FAIL because the component does not render the new blocks yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
const evidenceDigest = getPayloadText(person.summary, ["evidence_digest"]);
const fallbackReason = getPayloadText(person.summary, ["fallback_reason"]);
const diagnostics = person.diagnostics;
const spotCheck = getPayloadText(diagnostics ?? {}, ["spot_check", "spot_check_note"]);
const publishStatus = getPayloadText(diagnostics ?? {}, ["publish_status"]);
const freshnessSummary = getLocalCouncilFreshnessLabel(person.freshness);

{(evidenceDigest || fallbackReason || spotCheck || publishStatus) ? (
  <section className="mt-5 rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
    <h3 className="text-lg font-bold" style={{ color: "var(--navy)" }}>근거·진단</h3>
    {evidenceDigest ? <p className="mt-2 text-sm" style={{ color: "var(--foreground)" }}>{evidenceDigest}</p> : null}
    {fallbackReason ? <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{fallbackReason}</p> : null}
    {spotCheck ? <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Spot check · {spotCheck}</p> : null}
    {publishStatus ? <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Publish · {publishStatus}</p> : null}
  </section>
) : null}
{freshnessSummary ? <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>{freshnessSummary}</p> : null}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern 'LocalCouncilPersonDetailView renders evidence digest and diagnostics blocks when present'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/local-council/components/LocalCouncilPersonDetailView.tsx tests/local_council_detail.test.ts
git commit -m "feat: render local council evidence diagnostics"
```

### Task 3: Add roster terminology guidance for office labels

**Files:**
- Modify: `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/data.ts`
- Modify: `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/components/LocalCouncilRosterView.tsx`
- Test: `/Users/eric/dev/upstage/woogook/woogook-frontend/tests/local_council_detail.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("LocalCouncilRosterView explains office labels in the roster header copy", () => {
  const LocalCouncilRosterView = loadLocalCouncilRosterView();
  const html = renderToStaticMarkup(
    createElement(LocalCouncilRosterView, {
      resolveData: {
        resolution_status: "resolved",
        district: {
          gu_code: "11740",
          district_slug: "seoul-gangdong",
          district_name: "서울특별시 강동구",
        },
        roster: {
          district_head: { person_key: "district-head", person_name: "이수희", office_type: "basic_head" },
          council_members: [],
          source_coverage: {},
          freshness: {},
        },
      },
      dataSource: "backend",
      onSelectPerson: () => {},
      onBack: () => {},
    }),
  );

  assert.match(html, /구청장/);
  assert.match(html, /구의원/);
  assert.match(html, /기초자치단체장/);
  assert.match(html, /기초의원/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern 'LocalCouncilRosterView explains office labels in the roster header copy'`
Expected: FAIL because the roster view does not yet include explanatory copy.

- [ ] **Step 3: Write minimal implementation**

```ts
export function getLocalCouncilOfficeExplanation(officeType: string) {
  if (officeType === "basic_head") return "기초자치단체장";
  if (officeType === "basic_council") return "기초의원";
  if (officeType === "metro_council") return "광역의원";
  return officeType;
}
```

```tsx
<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
  {getLocalCouncilOfficeExplanation("basic_head")}와 {getLocalCouncilOfficeExplanation("basic_council")} 기준으로 명단을 보여줍니다.
</p>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern 'LocalCouncilRosterView explains office labels in the roster header copy'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/local-council/data.ts src/features/local-council/components/LocalCouncilRosterView.tsx tests/local_council_detail.test.ts
git commit -m "feat: clarify local council office labels"
```

### Task 4: Refresh the Gangdong sample contract and lock drift down

**Files:**
- Modify: `/Users/eric/dev/upstage/woogook/woogook-frontend/src/data/samples/sample_local_council_gangdong_person_dossiers.json`
- Modify: `/Users/eric/dev/upstage/woogook/woogook-frontend/tests/local_council_detail.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("sample district head dossier includes evidence digest diagnostics and richer freshness fields", () => {
  const person = dossiers["seoul-gangdong:district-head"] as Record<string, unknown>;
  assert.equal(person.summary?.evidence_digest, "공식 프로필과 회의록, 재정 근거를 묶어 확인 가능");
  assert.equal(person.summary?.fallback_reason, null);
  assert.equal(person.diagnostics?.spot_check, "2026-04-08 샘플 점검 완료");
  assert.equal(person.diagnostics?.publish_status, "publishable");
  assert.equal(person.freshness?.basis_timestamp, "2026-04-08T10:10:00+09:00");
  assert.equal(person.freshness?.source_snapshot_at, "2026-04-08T09:50:00+09:00");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern 'sample district head dossier includes evidence digest diagnostics and richer freshness fields'`
Expected: FAIL because the sample fixture does not yet carry the new fields.

- [ ] **Step 3: Write minimal implementation**

```json
{
  "summary": {
    "evidence_digest": "공식 프로필과 회의록, 재정 근거를 묶어 확인 가능",
    "fallback_reason": null,
    "summary_basis": {
      "source_kinds": ["nec_current_holder", "gangdong_district_head_official_profile"]
    }
  },
  "diagnostics": {
    "spot_check": "2026-04-08 샘플 점검 완료",
    "publish_status": "publishable"
  },
  "freshness": {
    "basis_timestamp": "2026-04-08T10:10:00+09:00",
    "source_snapshot_at": "2026-04-08T09:50:00+09:00"
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx --yes tsx --test tests/local_council_detail.test.ts --test-name-pattern 'sample district head dossier includes evidence digest diagnostics and richer freshness fields'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/samples/sample_local_council_gangdong_person_dossiers.json tests/local_council_detail.test.ts
git commit -m "feat: refresh gangdong sample contract"
```

## Self-Review

1. Spec coverage:
   - Evidence digest, fallback reason, diagnostics, spot-check, and freshness explanation are covered by Tasks 1 and 2.
   - Office-term guidance is covered by Task 3.
   - Sample/live contract drift is covered by Task 4.
2. Placeholder scan:
   - No TBD/TODO placeholders remain in the plan text.
3. Type consistency:
   - The plan uses the existing loose payload model in `src/lib/schemas.ts`, so new optional fields do not require changing consumers outside the owned files.

Plan complete and saved to `docs/superpowers/plans/2026-04-12-gangdong-productization-slice-frontend-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
