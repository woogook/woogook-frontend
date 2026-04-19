# Local Council Live Contract Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 강동구 `local-council` live DB/API 계약을 sample 수준의 프로필 메타데이터까지 복구해 구청장과 구의원 화면이 공식 source 기반으로 풍부하게 렌더되게 만든다.

**Architecture:** backend에서 구청장 공식 프로필 collector를 확장하고, 강동구의회 공식 의원 프로필 collector를 새로 추가한 뒤, projection builder가 구청장/구의원 모두에 대해 canonical `official_profile_payload`와 top-level `profile_image_url`을 만든다. frontend는 `local-council` 범위에서만 기존 소비 경로를 유지하면서 richer live payload를 바로 렌더한다.

**Tech Stack:** Python, FastAPI, SQLAlchemy, pytest, TypeScript, React, Node test runner, Next.js

---

### Task 1: Lock Failing Contract Tests First

**Files:**
- Modify: `/Users/eric/dev/upstage/woogook/woogook-backend/tests/test_gangdong_district_head_official_profile_collector.py`
- Modify: `/Users/eric/dev/upstage/woogook/woogook-backend/tests/test_local_council_api.py`
- Create: `/Users/eric/dev/upstage/woogook/woogook-backend/tests/test_gangdong_council_official_profile_collector.py`
- Test: same files above

- [ ] **Step 1: Add failing district-head collector expectations**

```python
assert artifact["profile_image_url"] == "https://www.gangdong.go.kr/..."
assert artifact["education_items"] == [
    "이화여자대학교 사회과학대학 행정학과",
    "연세대학교 행정대학원 도시행정학 석사",
]
assert artifact["career_items"][0] == "민선8기 강동구청장"
assert artifact["source_url"] == "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010"
assert artifact["links"][0]["label"] == "프로필"
```

- [ ] **Step 2: Add failing API contract expectations for live-ready canonical fields**

```python
assert payload["profile_image_url"] == "https://www.gangdong.go.kr/..."
assert payload["official_profile"]["education_items"] != []
assert payload["official_profile"]["career_items"] != []
assert payload["official_profile"]["source_url"] == "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010"
```

- [ ] **Step 3: Add failing council official profile collector fixture test**

```python
assert artifact["roster"][0]["person_name"] == "강유진"
assert artifact["member_profiles"][0]["profile"]["source_url"].endswith("/member/9011/profile.do")
assert artifact["member_profiles"][0]["profile"]["profile_image_url"].startswith("https://council.gangdong.go.kr/")
assert artifact["member_profiles"][0]["profile"]["education_items"] != []
assert artifact["member_profiles"][0]["profile"]["career_items"] != []
```

- [ ] **Step 4: Run targeted tests and confirm RED**

Run:

```bash
cd /Users/eric/dev/upstage/woogook/woogook-backend
pytest tests/test_gangdong_district_head_official_profile_collector.py tests/test_local_council_api.py tests/test_gangdong_council_official_profile_collector.py -q
```

Expected: new assertions fail because live collector/projection does not populate canonical hero metadata yet.

### Task 2: Extend District Head Official Profile Collector

**Files:**
- Modify: `/Users/eric/dev/upstage/woogook/woogook-backend/scripts/local_council_member/district_source_pipeline/collect/collect_gangdong_district_head_official_profile.py`
- Test: `/Users/eric/dev/upstage/woogook/woogook-backend/tests/test_gangdong_district_head_official_profile_collector.py`

- [ ] **Step 1: Extract image URL and hero metadata with helper functions**

```python
def _extract_profile_image_url(profile_html: str, *, base_url: str) -> str | None:
    ...

def _extract_profile_list_items(profile_html: str, heading_text: str) -> list[str]:
    ...
```

- [ ] **Step 2: Add canonical fields to collector artifact**

```python
return {
    ...
    "profile_image_url": profile_image_url,
    "education_items": education_items,
    "career_items": career_items,
    "source_url": source_urls["profile"],
    "links": _build_source_links(source_urls),
    ...
}
```

- [ ] **Step 3: Preserve existing sections while adding gap flags for missing hero fields**

```python
if not education_items:
    data_gap_flags.append("missing_education_items")
if not career_items:
    data_gap_flags.append("missing_career_items")
```

- [ ] **Step 4: Run collector tests and confirm GREEN**

Run:

```bash
cd /Users/eric/dev/upstage/woogook/woogook-backend
pytest tests/test_gangdong_district_head_official_profile_collector.py -q
```

Expected: PASS

### Task 3: Add Gangdong Council Official Profile Collector

**Files:**
- Create: `/Users/eric/dev/upstage/woogook/woogook-backend/scripts/local_council_member/district_source_pipeline/collect/collect_gangdong_council_official_profile.py`
- Modify: `/Users/eric/dev/upstage/woogook/woogook-backend/scripts/local_council_member/district_source_pipeline/common/seoul_district_source_registry.py`
- Modify: `/Users/eric/dev/upstage/woogook/woogook-backend/scripts/local_council_member/district_source_pipeline/inspect/show_source_status.py`
- Modify: `/Users/eric/dev/upstage/woogook/woogook-backend/scripts/local_council_member/district_source_pipeline/evaluate/build_gangdong_quality_reports.py`
- Create: `/Users/eric/dev/upstage/woogook/woogook-backend/tests/test_gangdong_council_official_profile_collector.py`

- [ ] **Step 1: Build fixture-driven collector from official member pages**

```python
def build_gangdong_council_official_profile_artifact(raw_snapshot_root: Path, *, district_slug: str, gu_code: str) -> dict[str, Any]:
    member_entries = _extract_member_entries(index_html)
    member_profiles = [_extract_member_profile(entry) for entry in member_entries]
    return {
        "source_kind": SOURCE_KIND,
        "district_slug": district_slug,
        "gu_code": gu_code,
        "office_type": "basic_council",
        "member_profiles": member_profiles,
        ...
    }
```

- [ ] **Step 2: Normalize canonical profile fields per member**

```python
profile = {
    "person_name": person_name,
    "mcode": mcode,
    "source_url": profile_url,
    "links": links,
    "profile_image_url": profile_image_url,
    "education_items": education_items,
    "career_items": career_items,
}
```

- [ ] **Step 3: Register the new source kind without touching other districts/domains**

```python
"gangdong_council_official_profile": DistrictSourceConfig(
    source_kind="gangdong_council_official_profile",
    provider_key="gangdong_council_site",
    office_type="basic_council",
    council_slug=council_slug,
    council_name=council_name,
    rasmbly_id="002003",
),
```

- [ ] **Step 4: Run new collector tests and confirm GREEN**

Run:

```bash
cd /Users/eric/dev/upstage/woogook/woogook-backend
pytest tests/test_gangdong_council_official_profile_collector.py -q
```

Expected: PASS

### Task 4: Normalize Projection and API Contract

**Files:**
- Modify: `/Users/eric/dev/upstage/woogook/woogook-backend/scripts/local_council_member/district_source_pipeline/build/build_projection_bundle.py`
- Modify: `/Users/eric/dev/upstage/woogook/woogook-backend/tests/test_local_council_projection_seed.py`
- Modify: `/Users/eric/dev/upstage/woogook/woogook-backend/tests/test_local_council_api.py`
- Optional modify: `/Users/eric/dev/upstage/woogook/woogook-backend/app/services/local_council.py`

- [ ] **Step 1: Add builder helpers for canonical official profile payload**

```python
def _build_canonical_official_profile_payload(...)-> dict[str, Any]:
    return {
        "office_label": office_label,
        "source_url": source_url,
        "links": links,
        "education_items": education_items,
        "career_items": career_items,
        "official_profile_sections": official_profile_sections,
        "activity_sections": activity_sections,
        "manifesto_sections": manifesto_sections,
    }
```

- [ ] **Step 2: Use canonical profile for district head projection**

```python
"profile_image_url": district_head_profile_payload.get("profile_image_url"),
"official_profile_payload": _build_canonical_official_profile_payload(
    office_label="강동구청장",
    profile_payload=district_head_profile_payload,
    ...
),
```

- [ ] **Step 3: Merge new official council profile source for council member projection**

```python
official_profile_payload = _build_canonical_official_profile_payload(
    office_label="강동구의원",
    profile_payload=gangdong_official_profile or portal_profile,
    ...
)
"profile_image_url": official_profile_payload.get("profile_image_url"),
```

- [ ] **Step 4: Seed/API tests should assert canonical non-raw fields**

```python
assert dossier.official_profile_payload["education_items"] == [...]
assert response["official_profile"]["source_url"].startswith("https://")
assert response["profile_image_url"] is not None
```

- [ ] **Step 5: Run backend contract tests**

Run:

```bash
cd /Users/eric/dev/upstage/woogook/woogook-backend
pytest tests/test_local_council_projection_seed.py tests/test_local_council_api.py -q
```

Expected: PASS

### Task 5: Consume Live Contract in Frontend Local Council Only

**Files:**
- Modify: `/Users/eric/dev/upstage/woogook/woogook-frontend/tests/local_council_detail.test.ts`
- Modify: `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/detail.ts`
- Modify: `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/components/LocalCouncilRosterView.tsx`

- [ ] **Step 1: Add failing frontend expectations for canonical live hero fields**

```ts
assert.equal(hero.imageUrl, "https://...");
assert.deepEqual(hero.educationItems, ["..."]);
assert.deepEqual(hero.careerItems, ["..."]);
assert.equal(hero.profilePageUrl, "https://...");
```

- [ ] **Step 2: Only add minimal normalization if the live backend shape still needs a tiny bridge**

```ts
const imageUrl = firstText([person, officialProfile], heroImageKeys);
const educationItems = collectTextList(officialProfile, ["education_items"]);
const careerItems = collectTextList(officialProfile, ["career_items"]);
```

- [ ] **Step 3: Keep changes scoped to `local-council` UI**

```ts
// No shared hub/domain code changes.
// No `local-election` / `assembly` imports touched.
```

- [ ] **Step 4: Run frontend tests**

Run:

```bash
cd /Users/eric/dev/upstage/woogook/woogook-frontend
node --test tests/local_council_detail.test.ts
```

Expected: PASS

### Task 6: End-to-End Verification and Pre-Push Review Loop

**Files:**
- Review all modified files above

- [ ] **Step 1: Run focused backend suite**

```bash
cd /Users/eric/dev/upstage/woogook/woogook-backend
pytest \
  tests/test_gangdong_district_head_official_profile_collector.py \
  tests/test_gangdong_council_official_profile_collector.py \
  tests/test_local_council_projection_seed.py \
  tests/test_local_council_api.py -q
```

- [ ] **Step 2: Run focused frontend suite**

```bash
cd /Users/eric/dev/upstage/woogook/woogook-frontend
node --test tests/local_council_detail.test.ts
```

- [ ] **Step 3: Manually verify IAB on `/local-council`**

```text
Check roster uses real Gangdong members.
Check district head detail shows real photo, education, career.
Check at least one council member detail shows official Gangdong council profile URL and richer hero metadata.
Check `/`, `국회의원`, `지방선거` flows remain unchanged.
```

- [ ] **Step 4: Run pre-push review loop**

```bash
git -C /Users/eric/dev/upstage/woogook/woogook-backend diff --stat
git -C /Users/eric/dev/upstage/woogook/woogook-frontend diff --stat
git -C /Users/eric/dev/upstage/woogook/woogook-backend diff --check
git -C /Users/eric/dev/upstage/woogook/woogook-frontend diff --check
```

- [ ] **Step 5: If review finds gaps, fix and repeat Step 1-4 before any push**

```text
Do not push with failing tests, contract mismatches, or domain spillover.
Repeat until clean.
```
