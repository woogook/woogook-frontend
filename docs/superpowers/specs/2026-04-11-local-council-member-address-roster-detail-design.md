# 현직 지방의원 주소 기반 명단·상세 화면 설계

- 작성일: 2026-04-11
- 소유 도메인: `local-council`
- 관련 backend 문서:
  - `/Users/eric/dev/upstage/woogook-backend/지방의원/README.md`
  - `/Users/eric/dev/upstage/woogook-backend/docs/지방의원/notes/current/local-council-member-current-status-brief.md`
  - `/Users/eric/dev/upstage/woogook-backend/docs/지방의원/canonical/llm-entry.md`
  - `/Users/eric/dev/upstage/woogook-backend/docs/지방의원/canonical/local-council-member-root-asset-layout.md`

## 배경

현직 지방의원 도메인은 현직 인물 엔터티인 `local_council_member`와 지방의회 기관 문맥인 `local_council`을 다룬다. `local-election`의 선거 시점 후보자와 같은 의미로 섞지 않는다.

backend에는 서울특별시 강동구 V1 조회 API가 준비되어 있다. 지원 범위는 강동구 주소 해석, 강동구 구청장과 구의원 roster, 인물별 dossier 조회다. 서울 25개구 전체, 실시간 외부 수집, 자동 발행 운영은 아직 범위 밖이다.

frontend에는 이미 `local-election` 도메인에 시/도, 구/군/시, 읍/면/동 선택형 주소 UX가 있다. 현직 지방의원 화면도 이 UX와 최대한 통일한다.

## 목표

- `/local-council`에서 주소 선택으로 우리동네 지방의원을 확인하는 첫 화면을 제공한다.
- 주소 선택 UI는 `local-election`과 같은 흐름을 공유한다.
- 주소 제출 후 강동구 roster를 보여주고, 인물 클릭 시 dossier 상세를 보여준다.
- frontend만 로컬에서 실행해도 강동구 샘플 흐름을 확인할 수 있게 fallback을 제공한다.
- backend V1의 실제 지원 범위를 숨기지 않고 사용자에게 명확히 안내한다.

## 비목표

- 지방선거 후보자 비교, 이슈 선택, 후보 상세 화면을 재사용하지 않는다.
- 서울 25개 자치구 전체를 지원하는 것처럼 표현하지 않는다.
- backend에 없는 실시간 수집 또는 데이터 보강 기능을 frontend에서 만들지 않는다.
- 구청장을 지방의원으로 잘못 분류하지 않는다.

## 사용자 흐름

1. 사용자가 `/local-council`에 진입한다.
2. 공통 주소 선택 UI에서 `시/도`, `구/군/시`, 선택적으로 `읍/면/동`을 선택한다.
3. 사용자가 `지방의원 확인하기`를 누른다.
4. frontend가 선택값을 `"서울특별시 강동구 천호동"` 형식의 address 문자열로 조립한다.
5. Next API route가 backend `/api/local-council/v1/resolve?address=...`로 요청을 proxy한다.
6. resolve 성공 시 `district`와 `roster`를 저장하고 roster 화면으로 이동한다.
7. 사용자가 구청장 또는 구의원 카드를 클릭한다.
8. frontend가 `person_key`를 URL encode해서 Next API route의 `/api/local-council/v1/persons/{person_key}`를 호출한다.
9. dossier 상세 화면에서 요약, 공식 프로필, 위원회, 의안, 회의, 재정 활동, 당선 근거, 출처를 확인한다.

backend가 없거나 호출에 실패하면 강동구 선택에 한해 로컬 샘플 데이터로 같은 흐름을 유지한다. 이때 화면에는 `로컬 미리보기 데이터` 배지를 노출해서 실제 backend 응답과 구분한다.

## 정보 구조

### 주소 화면

- 상단 배지: `지방의원`
- 제목: `우리동네 지방의원을 확인하세요`
- 설명: `지역을 선택하면 구청장과 구의원의 공식 근거 요약을 확인할 수 있습니다.`
- 버튼: `지방의원 확인하기`
- 샘플 버튼: 첫 slice에서는 `서울 강동구 천호동` 하나만 둔다.
- 하단 안내: 입력한 지역 정보는 현직자 조회에만 사용된다는 취지로 쓴다.

### Roster 화면

- 상단에는 `서울특별시 강동구`와 최신 근거 시각을 보여준다.
- 구청장 섹션은 `basic_head`를 `구청장`으로 표시한다.
- 구의원 섹션은 `basic_council`을 `구의원`으로 표시한다.
- 각 인물 카드는 이름, 정당, 직위, 프로필 이미지 또는 대체 avatar를 보여준다.
- `source_coverage`와 `freshness`는 사용자 친화 문구로 요약한다.

### Dossier 상세 화면

- 상단에는 이름, 직위, 정당, 요약 방식 배지를 보여준다.
- `summary.headline`과 `summary.grounded_summary`를 주요 요약으로 보여준다.
- `official_profile`, `committees`, `bills`, `meeting_activity`, `finance_activity`, `elected_basis`, `source_refs`, `freshness`를 섹션으로 나눈다.
- 비어 있는 섹션은 숨기지 않고 `공식 근거가 아직 준비되지 않았습니다.`로 표시한다.
- 구청장 상세에서는 `의정활동`이라고 쓰지 않고 `공식 활동` 또는 `구정활동`으로 표기한다.

## Frontend 구조

### 공통 주소 선택

기존 `src/app/components/AddressInput.tsx`의 역할을 도메인 중립 컴포넌트로 추출한다.

예상 경로:

- `src/features/regions/components/RegionAddressInput.tsx`
- `src/features/local-election/components/AddressInput.tsx`
- `src/features/local-council/components/LocalCouncilAddressStep.tsx`

`RegionAddressInput`은 아래 prop을 받는다.

- `eyebrow`
- `title`
- `description`
- `submitLabel`
- `samples`
- `footerNote`
- `onSubmit(city, district, dong)`
- `loading`
- `error`

`local-election`은 기존 문구와 동작을 유지한다. `local-council`은 같은 선택 UI를 사용하되 문구와 sample만 바꾼다.

### Local-council 화면

예상 경로:

- `src/app/local-council/page.tsx`
- `src/features/local-council/LocalCouncilPage.tsx`
- `src/features/local-council/components/LocalCouncilRosterView.tsx`
- `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
- `src/features/local-council/data.ts`

`LocalCouncilPage`는 `address`, `roster`, `detail` 세 view 상태만 갖는다.

## API 구조

브라우저는 backend를 직접 호출하지 않고 Next route만 호출한다.

예상 route:

- `GET /api/local-council/v1/resolve?address=...`
- `GET /api/local-council/v1/persons/{person_key}`

Next route는 `WOOGOOK_BACKEND_BASE_URL` 기반으로 FastAPI에 proxy한다. `person_key`는 `encodeURIComponent`로 path segment 안전성을 확보한다. Next route 응답 shape는 backend와 동일하게 유지하고, local-council API client가 `{ data, dataSource }` envelope로 감싸 화면에 넘긴다. `dataSource`는 `backend` 또는 `local_sample`이다.

frontend zod schema는 backend의 보장된 top-level shape를 검증한다.

- resolve 응답: `resolution_status`, `district`, `roster`
- roster 응답: `district_head`, `council_members`, `source_coverage`, `freshness`
- person 응답: `person_name`, `office_type`, `summary`, `official_profile`, `committees`, `bills`, `meeting_activity`, `finance_activity`, `elected_basis`, `source_refs`, `freshness`

활동 payload는 backend가 dict/list 형태로 유연하게 내려주므로, 화면 핵심 필드만 명시하고 나머지는 `record` 기반으로 안전하게 받는다.

## 로컬 fallback

당분간 frontend만 로컬에서 띄워놓고 작업할 수 있어야 하므로, backend 호출 실패를 곧바로 막다른 오류로 처리하지 않는다. `local-election`의 기존 샘플 fallback처럼 local-council도 강동구 샘플 fixture를 둔다.

예상 fixture:

- `src/data/samples/sample_local_council_gangdong_resolve.json`
- `src/data/samples/sample_local_council_gangdong_person_dossiers.json`

fallback 적용 기준은 아래와 같다.

- `resolve` 호출이 `WOOGOOK_BACKEND_BASE_URL` 없음, 503, network failure, backend unavailable 성격의 오류로 실패하고 선택 지역이 `서울특별시 / 강동구`이면 local sample resolve payload를 반환한다.
- `persons/{person_key}` 호출이 같은 성격으로 실패하고 sample person dossier index에 해당 `person_key`가 있으면 local sample dossier payload를 반환한다.
- 선택 지역이 강동구가 아니면 local sample을 보여주지 않는다. 이 경우 `현재 로컬 미리보기는 서울특별시 강동구만 준비되어 있습니다.`로 안내한다.
- backend가 명시적으로 404를 반환한 경우는 기본적으로 지원 범위 밖으로 본다. 다만 backend 자체가 없는 상태에서 강동구를 선택한 경우만 sample로 대체한다.
- sample fallback으로 진입한 화면에는 `로컬 미리보기 데이터` 또는 `샘플 데이터` 배지를 노출한다.
- fallback payload도 backend 응답과 같은 zod schema를 통과해야 한다. sample이 schema를 통과하지 못하면 화면에 표시하지 않고 schema 오류 안내를 보여준다.

fallback은 개발 편의 기능이지 데이터 출처 정책이 아니다. 사용자가 실제 데이터로 오해하지 않도록 roster와 detail 상단에 source badge를 표시하고, 출처 섹션에는 sample임을 명시한다.

## 오류 처리

- `WOOGOOK_BACKEND_BASE_URL` 없음 또는 backend 통신 실패 + 강동구 선택: local sample fallback으로 전환하고 `로컬 미리보기 데이터입니다.`를 표시한다.
- `WOOGOOK_BACKEND_BASE_URL` 없음 또는 backend 통신 실패 + 강동구 외 선택: `현재 로컬 미리보기는 서울특별시 강동구만 준비되어 있습니다.`
- backend 404: `현재는 서울특별시 강동구만 준비되어 있습니다.`
- 응답 schema parse 실패: 콘솔에 세부 오류를 남기고 화면에는 `응답 형식이 예상과 다릅니다. 잠시 후 다시 시도해주세요.`
- 인물 상세 404: roster로 돌아갈 수 있게 하고 `선택한 인물 정보를 찾지 못했습니다.`를 표시한다.
- 비어 있는 활동 섹션: `공식 근거가 아직 준비되지 않았습니다.`를 표시한다.

## 검증 계획

- zod schema 단위 검증: resolve, roster, person dossier fixture를 파싱한다.
- local sample 검증: 강동구 resolve fixture와 person dossier fixture가 zod schema를 통과하는지 확인한다.
- API client fallback 검증: backend URL 없음 또는 503 상황에서 강동구는 sample로 전환하고, 강동구 외 지역은 local preview 제한 안내를 반환하는지 확인한다.
- Next API route 검증: backend URL 없음, backend 404 relay, 성공 relay를 확인한다.
- 화면 흐름 검증: 주소 제출 후 roster 표시, 인물 클릭 후 detail 표시, fallback badge, 404 안내 문구를 확인한다.
- 지방선거 회귀 검증: 공통 주소 컴포넌트 추출 후 기존 `local-election` 문구, sample button, submit shape가 유지되는지 확인한다.
- 최종 명령: `npm run lint`, 가능하면 `npm run build`.

## 후속 구현 순서

1. 공통 주소 선택 컴포넌트를 추출하고 `local-election`을 기존 동작 그대로 연결한다.
2. `local-council` zod schema와 강동구 sample fixture를 추가한다.
3. backend 실패 시 sample로 전환하는 API client 함수를 추가한다.
4. Next local-council proxy route를 추가한다.
5. `/local-council` page와 address, roster, detail view를 추가한다.
6. 서비스 허브에 `현직 지방의원` 진입 카드를 추가한다.
7. 테스트와 lint/build 검증을 수행한다.
