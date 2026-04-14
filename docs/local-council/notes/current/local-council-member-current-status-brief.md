# 현직 지방의원 frontend 현재 현황

- 문서 유형: `notes`
- 소유 도메인: `local-council`
- 문서 surface: `shared`
- 주요 독자: `human, LLM agent`
- 상태: `active`
- 관련 PR: `#24`, `#33`
- 정본 여부: `아니오`
- 연결된 정본 문서: `docs/local-council/canonical/llm-entry.md`
- 최종 갱신일: `2026-04-14`

## 문서 역할

- 팀원이 `현직 지방의원` frontend의 현재 구현 범위를 빠르게 파악하기 위한 brief다.
- 화면 흐름과 계약 경계만 요약하고, 세부 로컬 실행 절차는 runbook으로 보낸다.
- backend와 계약을 맞출 때는 이 문서와 아래 문서를 함께 본다.
  - `docs/local-council/runbooks/local-frontend-backend-check-guide.md`
  - `docs/superpowers/specs/2026-04-11-local-council-member-address-roster-detail-design.md`
  - `docs/superpowers/plans/2026-04-12-gangdong-productization-slice-frontend-plan.md`

## 빠른 판정

### 현재 구현된 것

- 범위는 `서울특별시 강동구` 한정이다.
- `/local-council`에서 `주소 선택 -> resolve -> roster -> person detail` 읽기 흐름이 구현돼 있다.
- 브라우저는 Next route만 호출하고, Next route가 `WOOGOOK_BACKEND_BASE_URL` 기반으로 backend를 proxy한다.
- backend가 없거나 503 계열로 실패하면 `강동구`에 한해 로컬 sample fixture로 같은 흐름을 유지한다.
- roster는 `구청장 1명 + 구의원 명단`과 `freshness`, `source_coverage` 요약을 보여 준다.
- detail은 `summary`, `evidence`, `diagnostics`, `spot_check`, `official_profile`, `committees`, `bills`, `meeting_activity`, `finance_activity`, `elected_basis`, `source_refs`, `freshness`, `source_contract_summary`, `overlay`를 현재 계약 범위 안에서 보여 준다.
- detail의 설명 가능한 진단 구역은 `summary.explanation_lines`, `diagnostics.quality_signals`, `diagnostics.source_contract_summary`, `diagnostics.explanation_lines`, `freshness.lineage/staleness_bucket/explanation`까지 읽는다.
- detail 하단에는 additive `보강 정보` 구역이 있고, `overlay.status`, `support_tier`, `basis.allowed_sources`, `basis.target_member_id`, `sections`, `disclaimers`를 공식 결정적 결과와 분리해 보여 준다.
- `basic_council` sample과 live contract 기준 `person_key`는 `huboid` 우선 opaque key를 따른다.
- section card는 `source_url`, `source_links`, legacy `source_urls`, `download_url`을 함께 처리하고 placeholder URL은 숨긴다.

### 아직 아닌 것

- 서울 25개 자치구 전체 지원은 아직 아니다.
- URL 기반 deep-link나 multi-district browse는 아직 없다.
- 이름 검색, 필터, 지도, 비교 화면은 아직 없다.
- backend 없이 live read를 재현하는 방법은 없고, fallback sample은 `강동구`만 준비돼 있다.
- cross-section 공통 출처 허브나 richer navigation model은 아직 없다.

### 2026-04-14 smoke 스냅샷

- `강동구` 한정으로 `frontend-only sample`과 `backend-connected live` 경로를 다시 확인했다.
- backend가 없거나 `WOOGOOK_BACKEND_BASE_URL`이 비어 있으면 `로컬 미리보기 데이터` 배지와 강동구 sample fixture가 보여야 한다.
- backend가 연결되면 `공식 근거 데이터` 배지와 live roster/detail payload가 보여야 한다.
- 수동 검증은 `주소 제출`, `roster 렌더링`, `detail 렌더링`, `quality/evidence/source contract copy`, `보강 정보(overlay) surface`, `source badge / source path 구분`, `frontend proxy 경유 API`까지 확인했다.
- 강동구 외 주소는 계속 제한 안내 또는 backend 404 경계 안에 머물러야 하며, 서울 전역 지원으로 해석하면 안 된다.
- live backend가 model env 없이 seed된 경우 detail의 diagnostics에 `final_publish_status=publishable_degraded`, `agentic_review_status=unavailable`, `agentic_enrichment_status=skipped`가 보일 수 있고, 현재 smoke에서는 이를 UI failure로 보지 않는다.

## 현재 구성

### 1. 진입과 화면 상태

주요 진입 경로는 아래다.

- `src/app/local-council/page.tsx`
- `src/features/local-council/LocalCouncilPage.tsx`

현재 화면 상태는 아래 세 단계다.

- `address`
- `roster`
- `detail`

화면 전환 기준은 아래와 같다.

- 주소 제출 시 `resolve`를 호출한다.
- resolve 성공 시 roster로 이동한다.
- 인물 선택 시 `persons/{person_key}`를 호출한다.
- 브라우저 back/forward는 client history state로 맞춘다.
- view 전환 시 진행 중이던 resolve/detail 요청은 request id로 무효화한다.

### 2. 데이터 경로와 fallback

현재 네트워크 경계는 아래와 같다.

- 브라우저 -> `GET /api/local-council/v1/resolve?address=...`
- 브라우저 -> `GET /api/local-council/v1/persons/{person_key}`
- Next route -> backend FastAPI proxy

fallback 기준은 아래다.

- `WOOGOOK_BACKEND_BASE_URL`이 없거나 backend proxy가 503 계열로 실패하면 sample fallback을 검토한다.
- fallback은 `서울특별시 강동구` resolve와 sample dossier index에 있는 `person_key`에만 허용한다.
- `강동구` 외 지역은 `현재 로컬 미리보기는 서울특별시 강동구만 준비되어 있습니다.`로 안내한다.
- sample fallback으로 들어온 화면은 `로컬 미리보기 데이터` 배지를 보여 준다.

### 3. roster 화면

roster 화면에서 현재 보여 주는 핵심 정보는 아래다.

- `서울특별시 강동구` 제목
- `freshness` 요약 문구
- `source_coverage` 요약 문구
- `구청장`, `구의원` 구분 섹션
- 이름, 정당, 직위, 프로필 이미지 또는 대체 avatar

용어 기준은 아래다.

- `basic_head`는 `구청장`
- `basic_council`은 `구의원`
- 구청장은 `지방의원` 사람 엔터티가 아니므로 설명 문구에서 `구 행정을 총괄하는 단체장`으로 분리해 쓴다.

### 4. person detail 화면

detail 화면은 아래 묶음으로 나뉜다.

- hero block
  - 이름
  - 직위
  - 정당
  - headline
  - grounded summary
  - 학력/경력/외부 링크
- 근거 요약
  - `summary.evidence_digest`
  - `summary.summary_basis.source_kinds`
  - `summary.fallback_reason`
  - `summary.explanation_lines`
  - `summary.source_contract_summary`
- 설명 가능한 진단
  - `evidence`
  - `diagnostics.quality_signals`
  - `diagnostics.source_contract_summary`
  - `diagnostics.explanation_lines`
  - `freshness.lineage`
  - `freshness.staleness_bucket`
  - `freshness.explanation`
- 보강 정보
  - `overlay.status`
  - `overlay.support_tier`
  - `overlay.generated_at`
  - `overlay.basis.allowed_sources`
  - `overlay.basis.target_member_id`
  - `overlay.sections`
  - `overlay.disclaimers`
- 발행·진단
  - `freshness`
  - `diagnostics`
  - `freshness.explanation_lines`
  - `diagnostics.explanation_lines`
  - `source_contract_summary`
  - `data_gap_flags`
  - `needs_human_review`
  - `spot_check`
- 세부 섹션
  - `official_profile`
  - `elected_basis`
  - `committees`
  - `공식 활동`
  - `meeting_activity`
  - `finance_activity`

비어 있는 섹션은 숨기지 않고 empty state 또는 정적 카드로 둔다.

### 5. source contract UI 처리

detail 카드가 현재 해석하는 출처 규칙은 아래다.

- item-level `source_ref`가 있으면 우선 사용한다.
- 없으면 section-level `source_refs`에서 `preferredSourceKinds` 또는 `preferredSourceRoles` 순서로 찾는다.
- `source_url`이 있으면 primary link로 둔다.
- `source_links`가 있으면 ordered related links로 유지한다.
- legacy `source_urls`만 있으면 첫 링크를 primary로 승격하고 나머지를 related links로 둔다.
- `.invalid` placeholder와 비-http(s) URL은 렌더링 전에 제거한다.

현재 UI는 `backend가 정한 source contract를 풀어 보여 주는 역할`만 한다.

### 6. sample과 테스트

현재 local sample 자산은 아래다.

- `src/data/samples/sample_local_council_gangdong_resolve.json`
- `src/data/samples/sample_local_council_gangdong_person_dossiers.json`

핵심 회귀 검증은 아래다.

```bash
npm run test:local-council-samples
npx --yes tsx --test tests/local_council_api_client.test.ts tests/local_council_proxy.test.ts tests/local_council_detail.test.ts
```

테스트가 잠그는 핵심은 아래다.

- backend 미가동/503 시 강동구 sample fallback
- 강동구 외 주소의 제한 안내
- Next proxy relay와 `person_key` 인코딩
- diagnostics/freshness/evidence helper 정규화
- overlay helper 정규화와 `보강 정보` 렌더링
- source label/source_url/source_links 해석
- placeholder URL 제거
- roster/detail의 주요 렌더링

## 다음 단계

- 이 brief는 `현재 상태`를 공유하는 문서다.
- 현재 `강동구 V1`의 범위는 `서울시 강동구 한정 기능 + 운영 안정화`로 본다.
- 현재 기준 frontend는 `강동구 V1 + Phase 6 detail overlay surface`까지 반영한 상태다.
- live/sample smoke, proxy smoke, 제한 안내, degraded diagnostics 해석, overlay fallback copy가 문서 기준대로 반복 재현되면 V1/Phase 6 마감 상태로 본다.
- 후속 구현은 `docs/superpowers/plans/2026-04-12-gangdong-productization-slice-frontend-plan.md`를 기준으로 본다.
- 현재 남은 다음 단계는 모두 post-V1 후보로 본다.
  - overlay 사용성 확장
    - channel 정렬/필터, summary copy, target metadata 노출 범위를 더 다듬는다.
  - 설명력 보강
    - summary, evidence, freshness, diagnostics, overlay 문구를 더 제품 친화적으로 정리한다.
  - 서울 전역 확장 준비
    - 강동구 전용 fallback과 수동 smoke를 유지하되, multi-district browse와 address 일반화는 아직 계획 단계로만 둔다.

## 참고 경로

- `docs/local-council/README.md`
- `docs/local-council/canonical/llm-entry.md`
- `docs/local-council/runbooks/local-frontend-backend-check-guide.md`
- `docs/superpowers/specs/2026-04-11-local-council-member-address-roster-detail-design.md`
- `docs/superpowers/plans/2026-04-12-gangdong-productization-slice-frontend-plan.md`
- `src/app/local-council/page.tsx`
- `src/app/api/local-council/v1/`
- `src/features/local-council/`
- `src/data/samples/sample_local_council_gangdong_*.json`
- `tests/local_council_detail.test.ts`
