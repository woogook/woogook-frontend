# 강동구 local-council live 계약 복구 설계

- 작성일: 2026-04-19
- 소유 도메인: `local-council`
- 적용 범위: `seoul-gangdong` 구청장 + 구의원
- 관련 저장소:
  - `/Users/eric/dev/upstage/woogook/woogook-backend`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend`
- 관련 코드:
  - `/Users/eric/dev/upstage/woogook/woogook-backend/scripts/local_council_member/district_source_pipeline/collect/collect_gangdong_district_head_official_profile.py`
  - `/Users/eric/dev/upstage/woogook/woogook-backend/scripts/local_council_member/district_source_pipeline/collect/collect_local_council_portal_members.py`
  - `/Users/eric/dev/upstage/woogook/woogook-backend/scripts/local_council_member/district_source_pipeline/build/build_projection_bundle.py`
  - `/Users/eric/dev/upstage/woogook/woogook-backend/scripts/local_council_member/district_source_pipeline/common/seoul_district_source_registry.py`
  - `/Users/eric/dev/upstage/woogook/woogook-backend/app/services/local_council.py`
  - `/Users/eric/dev/upstage/woogook/woogook-backend/tests/test_local_council_api.py`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/detail.ts`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/components/LocalCouncilRosterView.tsx`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/tests/local_council_detail.test.ts`

## 배경

현재 `local-council` 화면은 sample JSON을 사용할 때와 DB/API 기반 live payload를 사용할 때 정보 밀도가 크게 다르다.

- sample JSON에는 구청장 사진, 학력, 주요 약력 같은 hero 메타데이터가 포함된다.
- live payload는 같은 화면에서 사진이 비고, 학력/경력이 빠지며, 일부 공식 프로필 정보가 raw 구조 그대로 남아 있다.
- 그 결과 사용자는 "실데이터를 연결했더니 정보가 사라졌다"고 느낀다.

이 차이는 프런트 렌더러 부족이 아니라 backend 수집·프로젝션 계약이 sample 수준에 못 미치기 때문에 생긴다.

이번 변경은 프런트 fallback으로 빈칸을 메우는 대신, 강동구 `local-council` live 계약 자체를 sample 수준으로 복구하는 것이다.

## 목표

- 강동구 `local-council` 구청장 + 구의원 live payload가 sample JSON과 같은 종류의 핵심 프로필 메타데이터를 제공한다.
- `profile_image_url`, `education_items`, `career_items`, `source_url`, `links` 같은 값이 DB/API 기준으로 직접 채워진다.
- 공식 출처에서 검증 가능한 값만 수집한다.
- `local-council` 도메인에만 적용하고 `국회의원`, `지방선거`, `assembly` 등 다른 도메인에는 영향을 주지 않는다.
- 프런트는 기존 렌더링 경로를 최대한 유지하고, live 계약 개선의 수혜만 받게 한다.

## 비목표

- 모든 자치구로 일반화하는 범용 수집기를 이번 변경에서 만들지 않는다.
- 비공식 블로그, 기사, 수동 메모를 프로필 메타데이터 원천으로 쓰지 않는다.
- `국회의원`, `지방선거` 도메인의 API contract나 UI 문구를 바꾸지 않는다.
- 프런트에서 sample 전용 fallback을 추가해 live 빈칸을 덮어쓰지 않는다.
- 이미 동작하는 `의안`, `회의`, `당선 근거`, `재정 활동` 카드의 출처 링크 구조를 다시 설계하지 않는다.

## 현재 root cause

### 1. 구청장 프로젝션이 사진을 의도적으로 비운다

`build_projection_bundle.py`는 구청장 dossier를 만들 때 `profile_image_url`을 하드코딩으로 `None`에 둔다.

즉, DB가 사진을 저장하지 못하는 것이 아니라 projection이 값을 채우지 않는다.

### 2. 구청장 공식 프로필 collector는 hero 메타데이터를 수집하지 않는다

강동구청장 공식 프로필 collector는 활동/공약/공식 프로필 section과 source link는 수집하지만, 아래 값은 구조적으로 만들지 않는다.

- `profile_image_url`
- `education_items`
- `career_items`

그래서 live `official_profile_payload`에는 section은 있어도 hero block을 구성할 정규화 필드가 없다.

### 3. 구의원 live `official_profile_payload`는 raw 포털 구조라서 프런트 계약과 맞지 않는다

강동구의원 live payload는 `official_profile`에 아래처럼 raw 포털 구조를 유지한다.

- `member.name`
- `member.homepage`
- `member.education`
- `member.career`
- `member.photo_file_url`

하지만 프런트가 읽는 정규화 필드는 다음이다.

- `source_url`
- `links`
- `education_items`
- `career_items`

즉, 구의원 데이터는 "없다"기보다 "정규화되지 않았다"가 더 정확하다.

### 4. 구의원 사진/약력의 공식 원천은 지방의정포털보다 강동구의회 공식 페이지가 더 적합하다

지방의정포털 profile JSON은 현재 의원 이름과 `homepage` URL은 제공하지만, `photo_file_url`, `education`, `career`가 비어 있는 경우가 많다.

반면 강동구의회 공식 의원 페이지는 실제 current member 목록, 개별 의원 메인 페이지, 의원 프로필 페이지를 제공한다.

즉, 구의원 hero metadata는 포털 raw data를 억지로 쓰기보다 강동구의회 공식 페이지를 별도 source로 수집하는 편이 더 근본적이다.

## 설계 원칙

### 1. live contract가 sample contract를 따라가야 한다

sample JSON은 임시 데모가 아니라 사용자가 기대하는 정보 구조의 reference다.

따라서 live contract도 최소한 아래 필드 수준은 채울 수 있어야 한다.

- top-level `profile_image_url`
- `official_profile.source_url`
- `official_profile.links`
- `official_profile.education_items`
- `official_profile.career_items`

### 2. source별 raw 구조는 유지하되, 사용자 계약은 정규화 필드로 통일한다

backend 내부에서는 source별 raw payload를 보존할 수 있다.

하지만 API가 프런트에 노출하는 `official_profile_payload`는 공통 필드를 우선 제공해야 한다.

즉, "raw도 있고 normalized도 있는 구조"는 허용하지만 "raw만 있고 normalized는 없음"은 허용하지 않는다.

### 3. 공식 근거가 없는 값은 비워둔다

sample과 동일한 필드를 목표로 하더라도, 공식 출처에서 확인되지 않는 값은 넣지 않는다.

- 사진이 공식 페이지에 없으면 `null`
- 학력/경력이 빈 문자열이면 빈 목록
- 출처 URL이 없으면 `null`

## 최종 결정

### 1. 강동구 구청장 collector를 hero metadata까지 수집하도록 확장한다

`collect_gangdong_district_head_official_profile.py`는 기존 section 수집 외에 아래 값을 정규화해서 저장한다.

- `profile_image_url`
  - 강동구청장 공식 페이지의 프로필 이미지를 absolute URL로 정규화한다.
- `education_items`
  - 공식 프로필 페이지의 학력 항목을 순서대로 추출한다.
- `career_items`
  - 공식 프로필 페이지의 주요 약력 항목을 순서대로 추출한다.
- `source_url`
  - 공식 프로필 landing URL을 명시적으로 넣는다.
- `links`
  - `프로필`, `활동`, `공약` 링크를 사용자용 CTA 기준으로 유지한다.

기존 `official_profile_sections`, `activity_sections`, `manifesto_sections`는 그대로 유지한다.

### 2. 강동구 구의원용 공식 프로필 source를 새로 도입한다

새 source kind `gangdong_council_official_profile`를 추가한다.

이 collector는 강동구의회 공식 의원 페이지를 기준으로 current member별 프로필 메타데이터를 수집한다.

수집 범위:

- 의원별 공식 프로필 URL
- 의원별 프로필 이미지 URL
- 학력 목록
- 경력/약력 목록
- 공식 홈페이지에서 파생 가능한 추가 링크
  - 메인
  - 프로필
  - 인사말

member 식별은 아래 순서로 매칭한다.

1. 강동구 current roster의 person name
2. 강동구의회 공식 member main/profile URL의 `mcode`
3. 지방의정포털의 `homepage` URL이 있으면 보조 검증 수단으로 사용

이 source는 강동구의회 공식 페이지 기반이므로 "비공식 보강"에 해당하지 않는다.

### 3. 구의원 프로필 원천 우선순위를 명시한다

구의원 hero metadata는 아래 우선순위로 만든다.

1. `gangdong_council_official_profile`
2. `local_council_portal_members`

즉, 사진/학력/경력은 공식 강동구의회 페이지를 primary source로 삼고, 포털은 보조 source로만 남긴다.

포털 source는 계속 유지한다.

- 지방의정포털 의원 페이지 URL
- 포털 기반 의안/회의 활동
- 포털 기준 식별자

다만 hero metadata primary source 역할은 강동구의회 공식 프로필 source로 옮긴다.

### 4. projection 단계에서 `official_profile_payload`를 공통 계약으로 정규화한다

`build_projection_bundle.py`는 구청장/구의원 모두에 대해 `official_profile_payload`를 아래 공통 구조로 만든다.

```json
{
  "office_label": "강동구청장 또는 강동구의원",
  "source_url": "https://...",
  "links": [
    { "label": "프로필", "url": "https://..." }
  ],
  "education_items": ["..."],
  "career_items": ["..."],
  "official_profile_sections": [],
  "activity_sections": [],
  "manifesto_sections": []
}
```

source별 raw 구조가 필요하면 추가 key로 남겨도 되지만, 위 공통 필드는 항상 우선 채워져야 한다.

추가 규칙:

- top-level `profile_image_url`은 person hero용 canonical field로 채운다.
- 구청장은 더 이상 `profile_image_url = None`으로 고정하지 않는다.
- 구의원도 raw `member.photo_file_url`만 믿지 않고 official profile source 결과를 canonical image로 사용한다.

### 5. API assembly는 정규화된 dossier를 그대로 노출한다

`app/services/local_council.py`와 API schema는 새 정규화 필드를 별도 가공 없이 그대로 내려주는 쪽을 유지한다.

이 설계의 핵심은 "API 직전에 임시 조립"이 아니라 "projection이 이미 완성된 계약"이어야 한다는 점이다.

따라서 assembly는 source resolver나 문자열 재구성 책임을 최소화한다.

### 6. 프런트는 `local-council` 한정으로 live 계약만 소비한다

프런트 변경은 최소화한다.

- `detail.ts`의 `buildPersonHeroMeta()`는 이미 `profile_image_url`, `education_items`, `career_items`, `source_url`, `links`를 읽을 수 있다.
- 따라서 live contract가 채워지면 detail UI는 별도 sample fallback 없이 richer hero를 렌더할 수 있다.
- `LocalCouncilRosterView.tsx`도 top-level `profile_image_url`이 채워지면 placeholder initial 대신 실제 이미지를 렌더할 수 있다.

이 변경은 `src/features/local-council/**`만 대상으로 하고, `src/app/page.tsx`, `local-election`, `assembly` 등의 소비자는 건드리지 않는다.

## 데이터 흐름

### 구청장

1. 강동구청장 공식 프로필 collector가 공식 페이지를 수집한다.
2. collector가 `profile_image_url`, `education_items`, `career_items`, `links`, section을 정규화한다.
3. projection builder가 canonical `official_profile_payload`와 top-level `profile_image_url`을 만든다.
4. DB `local_council_person_dossier`에 저장한다.
5. API와 프런트는 같은 canonical payload를 소비한다.

### 구의원

1. current roster는 계속 NEC/elected basis 기준으로 유지한다.
2. 새 `gangdong_council_official_profile` collector가 강동구의회 공식 의원 페이지를 수집한다.
3. 기존 `local_council_portal_members`는 의안/회의/보조 프로필 source로 유지한다.
4. projection builder가 두 source를 합쳐 canonical `official_profile_payload`와 top-level `profile_image_url`을 만든다.
5. API와 프런트는 current member 기준으로 풍부한 hero metadata를 소비한다.

## 스키마 영향

이번 변경의 1차 목표는 기존 projection schema 안에서 끝내는 것이다.

이유:

- `local_council_person_dossier`는 이미 `profile_image_url` 컬럼을 갖고 있다.
- `official_profile_payload`는 JSONB라서 `education_items`, `career_items`, `links`, `source_url`를 추가로 저장할 수 있다.

따라서 예상되는 기본 방향은:

- DB migration 없음
- collector 출력 schema 확장
- projection build 규칙 수정
- DB 재적재

단, 새 source kind를 persistent source manifest에 노출해야 하므로 status/inspect/evaluate 스크립트는 업데이트 대상이다.

## 영향 범위 차단

이번 변경은 아래 경계 안에만 머문다.

### backend

- `local_council_member/district_source_pipeline/seoul-gangdong/**`
- `app/services/local_council.py`
- `tests/test_local_council_api.py`

### frontend

- `src/features/local-council/**`
- `tests/local_council_detail.test.ts`

아래 영역은 변경하지 않는다.

- `src/features/local-election/**`
- `src/app/page.tsx`의 도메인 허브 문구 구조
- `국회의원` 도메인 API/화면
- `assembly` 도메인 API/화면

## 테스트 전략

### backend collector/projection 테스트

- 구청장 공식 프로필 collector fixture에서 아래 필드를 검증한다.
  - `profile_image_url`
  - `education_items`
  - `career_items`
  - `links`
- 새 `gangdong_council_official_profile` collector fixture에서 아래를 검증한다.
  - current member name -> official page 매칭
  - absolute image URL 생성
  - 학력/경력 파싱
  - source URL/links 정규화
- projection builder 테스트에서 구청장/구의원 dossier가 공통 계약을 채우는지 검증한다.
  - `official_profile.source_url` non-null
  - `official_profile.education_items` list
  - `official_profile.career_items` list
  - top-level `profile_image_url` non-null 또는 공식 페이지 기준 null

### backend API 테스트

- `tests/test_local_council_api.py`에 강동구 구청장 1건, 구의원 1건을 golden assertion으로 추가한다.
- API 응답이 sample 전용 구조가 아니라 live canonical 구조를 갖는지 확인한다.
- 다른 도메인 endpoint snapshot은 건드리지 않는다.

### frontend 테스트

- `tests/local_council_detail.test.ts`
  - 구청장 detail에서 사진/학력/약력이 live payload로 렌더되는지 검증
  - 구의원 detail에서도 같은 종류의 hero metadata가 렌더되는지 검증
- roster 관련 테스트가 있으면 avatar image branch를 추가한다.
- `local-election`, `assembly` 테스트는 수정하지 않는다.

## 수동 확인

인앱 브라우저에서 아래를 확인한다.

### `/local-council` roster

- 강동구 구청장 카드에 실제 사진 노출
- 강동구 구의원 카드가 sample 이름이 아니라 current DB roster 기준으로 노출
- 가능한 경우 구의원 카드에도 실제 사진 노출

### 구청장 detail

- placeholder initial 대신 실제 프로필 사진
- 학력 목록 가독성 있게 노출
- 주요 약력 목록 가독성 있게 노출
- `근거 요약`과 각 카드의 출처 구조는 유지

### 구의원 detail

- 공식 프로필 source가 실제 강동구의회 의원 페이지를 가리킴
- 학력/경력이 공식 페이지 기준으로 채워짐
- `의안`, `회의`, `당선 근거` 카드 동작은 기존과 동일

### 도메인 회귀

- `/` 허브, `국회의원`, `지방선거`는 눈에 띄는 변화가 없어야 한다.

## 리스크와 완화

### 1. 강동구의회 HTML 구조 변경

새 collector는 공식 페이지 마크업에 의존한다.

완화:

- selector를 fixture 테스트로 고정한다.
- 파싱 실패 시 `schema_mismatch`와 명확한 data gap을 남긴다.

### 2. 일부 의원 페이지의 학력/경력 형식 편차

의원별 문구 포맷이 다를 수 있다.

완화:

- 최초 구현은 "목록 추출 가능한 구조"에만 대응한다.
- free-form 본문은 항목 분해보다 line-preserving 정규화를 우선한다.

### 3. 사진 URL 상대 경로 처리

강동구의회/강동구청 모두 상대 경로 이미지를 쓸 수 있다.

완화:

- collector에서 absolute URL로 정규화한 뒤 projection에만 저장한다.

## 최종 정리

이번 작업은 프런트 fallback 보강이 아니라 강동구 `local-council` live 계약 복구다.

- 구청장은 기존 공식 프로필 source를 더 풍부하게 수집한다.
- 구의원은 강동구의회 공식 프로필 source를 새로 도입한다.
- projection이 canonical profile contract를 만든다.
- 프런트는 그 결과를 `local-council` 범위에서만 소비한다.

이 설계가 완료되면 sample JSON과 live DB/API 사이의 정보 격차가 줄고, 사용자는 "실데이터를 붙였더니 정보가 빠진 화면"이 아니라 "공식 근거 기반으로 채워진 live 화면"을 보게 된다.
