# 현직 지방의원 활동 근거 상세 화면 설계

- 작성일: 2026-04-15
- 소유 도메인: `local-council`
- 관련 backend 문서:
  - `/Users/eric/dev/upstage/woogook/woogook-backend/.worktrees/gangdong-v1-activity-grounding/docs/지방의원/specs/260415-213409-gangdong-v1-activity-grounding-structure.md`
  - `/Users/eric/dev/upstage/woogook/woogook-backend/.worktrees/gangdong-v1-activity-grounding/docs/지방의원/plans/260415-223428-gangdong-v1-activity-grounding-implementation-plan.md`
- 관련 frontend 문서:
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/docs/superpowers/specs/2026-04-11-local-council-member-address-roster-detail-design.md`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/docs/local-council/runbooks/local-frontend-backend-check-guide.md`

## 배경

`local-council` 상세 화면은 이미 강동구 V1 dossier를 `summary`, `official_profile`, `committees`, `bills`, `meeting_activity`, `finance_activity`, `elected_basis` 중심으로 보여준다. 다만 현재 frontend는 activity item을 거의 generic record로 렌더링하고 있어, backend가 추가하려는 `bill_summary`, `participation_type`, `record_grounding_level`, `content_grounding`, `official_record_locator`의 의미를 사용자에게 제대로 드러내지 못한다.

backend의 최신 activity grounding 설계는 top-level shape를 유지한 채 `의안`과 `회의` item semantics를 additive하게 확장한다. frontend는 이 additive contract를 그대로 수용하되, 화면에서 과장 없이 읽히도록 정보 위계를 다시 잡아야 한다.

이번 변경의 핵심은 새 정보를 "더 많이" 보여주는 것이 아니라, `공식 기록 위치를 다시 열 수 있는가`, `내용 수준 검토가 끝났는가`, `의안의 핵심 내용을 어디까지 말할 수 있는가`를 보수적으로 읽히게 만드는 것이다.

## 목표

- 기존 `/local-council` 상세 페이지 골격은 유지한다.
- `의안`과 `회의` 섹션 카드만 activity grounding contract에 맞게 재구성한다.
- `official_record_locator`를 일반 source link가 아니라 item-level replay surface로 보여준다.
- `content_grounding`이 없는 meeting item을 직접 발언 확인처럼 과장하지 않는다.
- `district_head_official_minutes` demotion 정책을 frontend에서도 일관되게 반영한다.
- 강동구 샘플 fixture와 상세 테스트가 새 contract를 실제로 대표하도록 갱신한다.

## 비목표

- `/local-council` 전체 레이아웃을 전면 재설계하지 않는다.
- `summary`, `발행·진단`, `설명 가능한 진단`, `보강 정보` 섹션 구조를 갈아엎지 않는다.
- backend가 아직 제공하지 않는 `content_grounding` live 결과를 frontend에서 추정 생성하지 않는다.
- locator payload를 frontend가 임의로 해석해 실제 URL 조합 규칙을 발명하지 않는다.
- 구청장 개인 회의 활동을 backend 정책보다 강하게 단정하지 않는다.

## 대안 검토

### 1. 현재 화면 유지

- 장점:
  - 구현 리스크가 가장 낮다.
- 단점:
  - 새 additive contract의 핵심 의미가 묻힌다.
  - `원문 보기`가 일반 source link와 item locator를 구분하지 못한다.

### 2. 기존 카드에 정보만 덧붙이는 보수적 보강

- 장점:
  - 레이아웃 변경 폭이 작다.
- 단점:
  - 정보는 늘지만 우선순위가 여전히 약하다.
  - `회의 activity`와 `의안 lifecycle`의 정책 차이가 선명하게 드러나지 않는다.

### 3. 페이지 골격은 유지하고 `의안`/`회의` 카드 정보 위계를 재구성

- 장점:
  - 현재 페이지 구조를 크게 깨지 않으면서 activity grounding 의미론을 가장 잘 드러낸다.
  - 테스트 범위를 `detail.ts`와 `LocalCouncilPersonDetailView` 중심으로 한정할 수 있다.
- 단점:
  - generic section card builder 일부를 전용 adapter 구조로 보강해야 한다.

권장안은 3번이다.

## 최종 결정

- 상단 hero, `근거 요약`, `발행·진단`, `설명 가능한 진단`, 하단 섹션 배열은 유지한다.
- `의안`과 `회의` 섹션 안에서만 카드 정보 위계를 activity grounding contract 기준으로 다시 짠다.
- source link 해석 우선순위는 `official_record_locator`가 있으면 그것을 먼저 사용하고, 없을 때만 기존 `source_ref`/`source_refs` fallback을 사용한다.
- meeting item은 `content_grounding.status == supported`인 경우에만 `activity_summary_line`을 본문처럼 노출한다.
- `district_head_official_minutes`는 frontend에서도 구청장 개인 meeting evidence처럼 보이지 않게 처리한다.

## 정보 구조

### 페이지 전체

- hero 영역, summary badge, freshness, diagnostics 섹션은 유지한다.
- 하단 record list의 섹션 순서도 유지한다.
- 바꾸는 범위는 `의안`과 `회의` 카드 내부 표현과 액션만으로 한정한다.

### 의안 카드

카드의 읽는 순서는 아래와 같이 고정한다.

1. `bill_title`
2. 참여/상태 배지
3. `bill_summary.summary_line`
4. 구조화된 상태 row
5. replay action

표시 규칙:

- 참여 배지는 `participation_type`을 사람이 읽는 문구로 번역한다.
  - `primary_sponsor -> 대표발의`
  - `co_sponsor -> 공동발의`
  - `submitted_by_district_head -> 구청장 제출`
  - `listed_activity -> 의안 참여 기록`
- 상태 row는 최소 `bill_stage`, `ordinance_status`, `result_label`을 읽기 좋은 문장으로 묶어 보여준다.
- `bill_summary.status == title_only`면 `제목 기준 보수적 요약`이라는 뉘앙스를 유지한다.
- `bill_summary`는 항상 `의안 내용`을 설명하는 문장으로 취급하고, 의원 개인의 의도/주장처럼 재서술하지 않는다.
- `official_record_locator.kind == bill_detail` 또는 동등한 locator가 있으면 액션 라벨은 `의안 상세 열기`로 둔다.
- 의안의 canonical source link가 별도로 있으면 보조 액션 `원문 링크 보기`를 둘 수 있다.

### 회의 카드

카드의 읽는 순서는 아래와 같이 고정한다.

1. `session_label` + `activity_label`
2. grounding 상태 배지
3. 설명 row 또는 `activity_summary_line`
4. replay action

표시 규칙:

- `activity_label`이 있으면 `meeting_name`보다 우선해서 보여준다.
- 상태 배지는 `record_grounding_level`과 `content_grounding.status`를 함께 해석한다.
  - `record_listed -> 공식 기록 목록 확인`
  - `record_located -> 공식 기록 위치 확인`
  - `supported -> 내용 검토 완료`
  - `queued -> 내용 검토 대기`
  - `unavailable -> 내용 검토 전`
  - `mention_only -> 직접 활동 확인 전`
  - `unclear -> 판단 유보`
  - `human_review_required -> 사람 검토 필요`
- `content_grounding.status == supported`인 경우에만 `activity_summary_line`을 카드 본문으로 노출한다.
- 그 외 상태에서는 `공식 기록 위치는 확보됐지만 발언 요약은 아직 승격하지 않음` 같은 보수적 설명 문장을 helper에서 생성한다.
- `official_record_locator.kind == council_minutes_popup`이면 액션 라벨은 `회의록 팝업 다시 열기` 또는 `회의록 위치 확인`으로 둔다.
- frontend가 `popup_params`를 조합해 새로운 URL 규칙을 발명하지 않는다. backend payload가 직접 사용 가능한 URL을 주지 않으면, locator 정보를 설명형으로만 노출할 수 있다.

### 구청장 상세

- `district_head_official_minutes`는 `council-level minutes index`라는 backend 정책을 따른다.
- 따라서 구청장 상세에서 meeting item이 비거나 demoted돼 있으면 이를 오류로 간주하지 않는다.
- 관련 `data_gap_flags`가 있으면 진단 영역에서 `구청장 개인 회의 활동 linkage는 아직 수집/검토 전`으로 번역한다.

## Frontend 구조

### View model 계층

- 기존 generic `buildSectionCardViewModel`은 유지하되, `의안`/`회의`는 전용 adapter helper를 둔다.
- 예상 경로:
  - `src/features/local-council/detail.ts`
  - 필요 시 `src/features/local-council/activityCards.ts` 또는 동등 helper file

책임:

- bill item -> `headline`, `status pills`, `summary line`, `detail rows`, `action labels`
- meeting item -> `headline`, `grounding pills`, `body line`, `detail rows`, `action labels`
- `official_record_locator` 우선 action resolution
- raw enum/status -> user-facing Korean label

### 화면 계층

- `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`

책임:

- `의안`, `회의` 섹션만 전용 adapter 결과를 사용해 렌더링한다.
- 다른 섹션은 기존 generic card 흐름을 유지한다.
- source badge, related source links, expandable panel 구조는 유지한다.

## 데이터 계약 반영

frontend는 schema를 엄격한 세부 object로 바꾸기보다, top-level 안정성을 유지하면서 additive field 소비 helper를 보강한다.

- `src/lib/schemas.ts`
  - 기존 `localCouncilPayloadObjectSchema` 기반 구조는 유지할 수 있다.
  - 다만 helper 수준에서 자주 읽는 field 명세를 type alias 또는 narrow helper로 문서화한다.
- `src/features/local-council/data.ts`
  - `participation_type`, `bill_stage`, `ordinance_status`, `record_grounding_level`, `content_grounding.status`, `activity_type` label helper를 추가한다.
  - `data_gap_flags` 번역 helper를 추가해 raw token 직접 노출을 줄인다.

## 로컬 샘플 정책

- `src/data/samples/sample_local_council_gangdong_person_dossiers.json`은 새 contract를 대표하도록 갱신한다.
- 최소 포함 항목:
  - bill item의 `participation_type`, `bill_stage`, `ordinance_status`, `bill_summary`, `official_record_locator`
  - meeting item의 `activity_type`, `activity_label`, `record_grounding_level`, `content_grounding`, `activity_summary_line` 유무 사례
  - `uncollected:district_head_minutes_person_linkage`, `uncollected:meeting_content_grounding` 같은 새 flag 사례
- 구청장 샘플은 meeting lane demotion 정책을 반영해야 한다.

## 오류 및 보수성 원칙

- locator가 있다고 해서 `내용 확인 완료`처럼 보이게 쓰지 않는다.
- meeting item의 `activity_summary_line`이 없으면 빈칸 대신 보수적 상태 설명을 보여준다.
- `bill_summary`가 없거나 `unavailable`이면 원문 액션은 유지할 수 있어도 내용 요약은 숨긴다.
- `source_ref`와 `official_record_locator`가 충돌하면 item-level locator를 우선하고, 일반 source link는 보조 링크로만 둔다.

## 검증 계획

- detail helper 테스트:
  - bill adapter가 `participation_type`, `bill_summary`, `official_record_locator`를 올바른 카드 model로 변환하는지 확인한다.
  - meeting adapter가 `supported`와 non-`supported` 상태를 다르게 렌더링하는지 확인한다.
  - locator action resolution이 `official_record_locator`를 우선하는지 확인한다.
- detail view 렌더 테스트:
  - 권장안 정보 위계가 DOM에 반영되는지 확인한다.
  - 구청장 상세가 demoted meeting 정책을 따르는지 확인한다.
  - `data_gap_flags` 번역이 사용자 문구로 노출되는지 확인한다.
- fixture 검증:
  - 갱신된 sample dossier가 기존 local-council schema와 sample validation을 통과하는지 확인한다.
- 최종 명령:
  - `npm run lint`
  - `npx --yes tsx --test tests/local_council_api_client.test.ts tests/local_council_proxy.test.ts tests/local_council_detail.test.ts`
  - 필요 시 `npm run build`

## 구현 순서

1. 전용 worktree에서 sample fixture와 helper 테스트를 먼저 갱신한다.
2. bill/meeting 전용 adapter와 label helper를 추가한다.
3. `LocalCouncilPersonDetailView`에서 `의안`/`회의` 섹션을 권장안 위계로 전환한다.
4. locator replay와 data gap 번역 규칙을 다듬는다.
5. 관련 runbook과 brief 문구를 실제 화면 동작에 맞춰 갱신한다.
