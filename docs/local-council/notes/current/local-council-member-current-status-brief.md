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

## 사람용 요약

- 현재 frontend는 `서울특별시 강동구` V1 범위에 맞춰져 있다.
- 사람이 직접 확인할 때는 `frontend-only sample`과 `backend-connected live`를 둘 다 본다.
- 수동 검증 절차는 아래 runbook을 따라가면 된다.

## 빠른 판정

### 현재 구현된 것

- 범위: `서울특별시 강동구` 한정이다.
- 사용자 흐름: `/local-council`에서 `주소 선택 -> resolve -> roster -> person detail` 읽기 흐름이 구현돼 있다.
- 연결 방식: 브라우저는 Next route만 호출하고, Next route가 `WOOGOOK_BACKEND_BASE_URL` 기반으로 backend를 proxy한다.
- fallback: backend가 없거나 503 계열로 실패하면 `강동구`에 한해 로컬 sample fixture로 같은 흐름을 유지한다.
- roster surface:
  - `구청장 1명 + 구의원 명단`: roster 첫 화면에서 함께 보여 주는 기본 명단이다.
  - `freshness` 요약: 데이터 기준 시점과 최신성 상태를 짧게 보여 준다.
  - `source_coverage` 요약: 어떤 공식 출처가 채워졌는지 coverage 상태를 보여 준다.
- detail 기본 계약:
  - `summary`: 인물 카드 상단에 쓰는 핵심 요약과 요약 근거다.
  - `evidence`: 섹션별 공식 근거가 얼마나 있는지와 신호 강도를 요약한다.
  - `diagnostics`: 발행 상태, 결함 플래그, 사람 검토 필요 여부를 모은다.
  - `spot_check`: 수동 검증용 식별자와 빠른 확인 포인트를 담는다.
  - `official_profile`: 공식 프로필에서 읽은 기본 인적 정보다.
  - `committees`: 현재 위원회 소속과 직책을 담는다.
  - `bills`: 의안 발의·제안 등 입법 활동 기록을 담는다.
  - `meeting_activity`: 회의록 기반 출석·발언 등 회의 활동을 담는다.
  - `finance_activity`: 예산·결산 등 재정 관련 공식 활동을 담는다.
  - `elected_basis`: 당선 근거와 선거 이력을 요약한다.
  - `source_refs`: 응답 전체나 섹션이 참조한 공식 출처 목록이다.
  - `freshness`: 언제 어떤 기준 시점의 데이터를 보여 주는지 설명한다.
  - `source_contract_summary`: 출처 계약이 얼마나 깨끗한지 요약한 값이다.
  - `overlay`: 결정적 결과와 분리해서 보여 주는 additive 보강 정보다.
- 설명 가능성:
  - `summary.explanation_lines`: 요약 판단을 사람이 읽기 쉽게 풀어쓴 문장 목록이다.
  - `diagnostics.quality_signals`: 품질 판정에 사용한 세부 신호 모음이다.
  - `diagnostics.source_contract_summary`: 출처 계약 이슈 수와 상태 요약이다.
  - `diagnostics.explanation_lines`: 진단 결과를 사람이 읽는 문장으로 푼 목록이다.
  - `freshness.lineage`: 어떤 upstream run과 raw에서 왔는지 보여 주는 계보다.
  - `freshness.staleness_bucket`: 신선도 등급을 짧게 보여 주는 값이다.
  - `freshness.explanation`: 최신성 판단 근거를 문장으로 풀어쓴 설명이다.
- 보강 정보:
  - `overlay.status`: overlay를 생성할 수 있었는지와 현재 제공 상태다.
  - `overlay.support_tier`: 보강 정보의 지원 수준과 기대 신뢰도를 나타낸다.
  - `overlay.basis.allowed_sources`: overlay가 참조해도 되는 허용 소스 목록이다.
  - `overlay.basis.target_member_id`: overlay가 겨냥한 원본 member 식별자다.
  - `overlay.sections`: 채널·주제별로 나뉜 보강 카드 목록이다.
  - `overlay.disclaimers`: 사람이 먼저 읽어야 할 주의 문구와 한계 설명이다.
- 식별자 계약: `basic_council` sample과 live contract 기준 `person_key`는 `huboid` 우선 opaque key를 따른다.
- 출처 처리:
  - `source_url`: 대표로 노출할 primary 출처 링크다.
  - `source_links`: 함께 보여 줄 ordered related link 목록이다.
  - legacy `source_urls`: 구형 payload만 있을 때 호환 처리하는 링크 목록이다.
  - `download_url`: 파일 다운로드형 출처가 있으면 함께 처리한다.
  - placeholder URL 숨김: `.invalid` 같은 대체 URL은 렌더링 전에 제거한다.

### 아직 아닌 것

- 서울 25개 자치구 전체 지원은 아직 아니다.
- URL 기반 deep-link나 multi-district browse는 아직 없다.
- 이름 검색, 필터, 지도, 비교 화면은 아직 없다.
- backend 없이 live read를 재현하는 방법은 없고, fallback sample은 `강동구`만 준비돼 있다.
- cross-section 공통 출처 허브나 richer navigation model은 아직 없다.

### 사람이 직접 테스트할 범위

- `frontend-only sample mode`
  - backend 없이도 `/local-council` 주소 입력, roster, detail, overlay sample을 끝까지 확인한다.
  - `로컬 미리보기 데이터` 배지와 fallback 안내 문구가 보여야 한다.
- `backend-connected live mode`
  - frontend Next proxy를 통해 `resolve`와 `person detail`이 실제 backend 응답을 받는지 확인한다.
  - roster는 별도 proxy route가 아니라 `resolve` 응답에 포함된 live payload가 화면에 들어오는지 확인한다.
  - `공식 근거 데이터` 배지와 live payload가 보여야 한다.
- `scope guard`
  - 강동구 외 주소는 제한 안내 또는 backend 404 경계에 머물러야 한다.
  - 서울 전역 지원으로 읽히는 UX는 아직 허용하지 않는다.

### 2026-04-14 smoke 스냅샷

- `강동구` 한정으로 `frontend-only sample`과 `backend-connected live` 경로를 다시 확인했다.
- `frontend` 개발 서버는 현재 `Node.js 20.9 이상`이 필요하다.
- backend가 없거나 `WOOGOOK_BACKEND_BASE_URL`이 비어 있으면 `로컬 미리보기 데이터` 배지와 강동구 sample fixture가 보여야 한다.
- backend가 연결되면 `공식 근거 데이터` 배지와 live roster/detail payload가 보여야 한다.
- 수동 검증은 `주소 제출`, `roster 렌더링`, `detail 렌더링`, `quality/evidence/source contract copy`, `보강 정보(overlay) surface`, `source badge / source path 구분`, `frontend proxy 경유 API(resolve/person)`까지 확인했다.
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
- `freshness` 요약 문구: 데이터 기준 시점과 최신성 상태를 짧게 보여 준다.
- `source_coverage` 요약 문구: 어떤 공식 출처가 채워졌는지 coverage 상태를 보여 준다.
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
  - `headline`: 인물 카드 상단에 노출하는 짧은 한 줄 요약
  - `grounded_summary`: 공식 근거에 묶여 있는 요약 본문
  - 학력/경력/외부 링크
- 근거 요약
  - `summary.evidence_digest`: 어떤 근거가 요약에 쓰였는지 압축한 문구
  - `summary.summary_basis.source_kinds`: 요약 생성에 사용한 source kind 목록
  - `summary.fallback_reason`: fallback 요약으로 내려간 경우 그 이유
  - `summary.explanation_lines`: 요약 판단을 사람이 읽기 쉽게 풀어쓴 문장 목록
  - `summary.source_contract_summary`: summary 레이어에서 읽은 출처 계약 요약
- 설명 가능한 진단
  - `evidence`: 섹션별 근거 존재 여부와 품질 신호
  - `diagnostics.quality_signals`: 품질 판단에 사용한 세부 신호 묶음
  - `diagnostics.source_contract_summary`: 출처 계약 이슈 수와 요약 상태
  - `diagnostics.explanation_lines`: 진단 결과를 풀어쓴 문장 목록
  - `freshness.lineage`: 어떤 upstream run과 raw에서 왔는지 보여 주는 계보
  - `freshness.staleness_bucket`: 최신성 등급을 짧게 보여 주는 값
  - `freshness.explanation`: 최신성 판단 근거를 문장으로 설명한 값
- 보강 정보
  - `overlay.status`: 보강 정보가 준비됐는지와 현재 제공 상태
  - `overlay.support_tier`: 보강 정보의 지원 수준과 기대 신뢰도
  - `overlay.generated_at`: 보강 정보 생성 시각
  - `overlay.basis.allowed_sources`: overlay가 참조 가능한 허용 소스
  - `overlay.basis.target_member_id`: overlay가 겨냥한 원본 member 식별자
  - `overlay.sections`: 주제별 보강 카드 목록
  - `overlay.disclaimers`: 사람이 먼저 읽어야 할 주의 문구
- 발행·진단
  - `freshness`: 현재 응답이 언제 어떤 기준으로 생성됐는지 보여 주는 최신성 묶음
  - `diagnostics`: 발행 상태와 품질 진단 전체 묶음
  - `freshness.explanation_lines`: 최신성 판단을 풀어쓴 문장 목록
  - `diagnostics.explanation_lines`: 발행·품질 진단을 풀어쓴 문장 목록
  - `source_contract_summary`: top-level에서 읽는 출처 계약 상태 요약
  - `data_gap_flags`: 비어 있거나 약한 데이터 영역을 표시하는 플래그
  - `needs_human_review`: 사람이 다시 확인해야 하는지 여부
  - `spot_check`: 수동 검증용 식별자와 확인 포인트
- 세부 섹션
  - `official_profile`: 공식 프로필 기반 인적 정보와 경력
  - `elected_basis`: 당선 근거와 선거 이력
  - `committees`: 위원회 소속과 역할
  - `공식 활동`
  - `meeting_activity`: 회의록 기반 출석·발언 등 회의 활동
  - `finance_activity`: 예산·결산 등 재정 관련 공식 활동

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
