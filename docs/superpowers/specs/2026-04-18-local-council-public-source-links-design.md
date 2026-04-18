# 현직 지방의원 공개 출처 링크 및 CTA 단순화 설계

- 작성일: 2026-04-18
- 소유 도메인: `local-council`
- 관련 화면: `/local-council` 상세 뷰
- 관련 저장소:
  - `/Users/eric/dev/upstage/woogook/woogook-backend`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend`
- 관련 코드:
  - `/Users/eric/dev/upstage/woogook/woogook-backend/app/domains/local_council/source_contract.py`
  - `/Users/eric/dev/upstage/woogook/woogook-backend/app/services/local_council.py`
  - `/Users/eric/dev/upstage/woogook/woogook-backend/tests/test_local_council_api.py`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/detail.ts`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/tests/local_council_detail.test.ts`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/e2e/local-council/local-sample.spec.ts`

## 배경

현재 `local-council` 상세 화면은 여러 카드에서 generic한 `원문 이동` 버튼과 `출처 · ...` 버튼을 함께 보여준다. 이 구조는 사용자가 각 버튼의 차이를 이해하기 어렵고, 인앱 브라우저 기준으로도 어떤 버튼이 실제로 무슨 페이지를 여는지 직관적이지 않다.

동시에 backend의 일부 출처는 `source_url`이 비어 있다. 특히 `elected_basis`는 내부 수집용 `request_url`만 존재하고, 사용자에게 안전하게 노출할 수 있는 공개 링크가 따로 채워지지 않는다. 그 결과 프런트에서는 카드 토글만 동작하고 실제 출처 이동 CTA는 제공되지 않는다.

이번 변경은 backend가 사용자용 공개 링크를 source별로 제공하고, frontend는 generic CTA를 제거한 뒤 의미 있는 출처 버튼만 남기는 것이다.

## 목표

- backend가 `source_kind`별로 사용자에게 노출 가능한 공개 링크를 `source_url` 또는 `source_links`로 내려준다.
- deep link를 만들 수 있으면 deep link를 사용하고, 불가능하면 공개 landing URL로 fallback한다.
- frontend 상세 카드에서 generic `원문 이동` 버튼을 제거한다.
- 각 카드의 `출처 · ...`, `활동`, `공약`, `원문 다운로드`, `관련 출처` 같은 구체 라벨 CTA가 primary action 역할을 하게 만든다.
- `local-council` 도메인에만 적용하고 다른 도메인 CTA 구조는 건드리지 않는다.

## 비목표

- backend가 원문 파일을 새로 수집하거나 미보유 deep link를 새로 계산하는 범용 크롤링 기능을 추가하지 않는다.
- `assembly`, `local-election` 등 다른 상세 화면 CTA 구조는 변경하지 않는다.
- `request_url`처럼 내부 수집용 URL을 그대로 사용자에게 노출하지 않는다.
- 다운로드 링크가 없는 source에 억지로 다운로드 CTA를 만들지 않는다.

## 최종 결정

### 1. Backend 공개 링크 resolver 도입

- `source_kind` 기반의 공개 링크 resolver를 backend에 추가한다.
- resolver는 source ref 정규화 시점에 실행한다.
- 공개 링크 후보가 없으면 `source_url`은 비운다.
- 공개 링크 후보가 여러 개면 `source_links`에 의미 있는 라벨과 함께 넣는다.

### 2. 링크 정책

- `gangdong_district_head_official_profile`
  - 구청장실/공식 프로필/공약/활동 같은 사용자용 공개 URL을 유지한다.
- `gangdong_council_official_activity`
  - 기존 상세/회의 공개 URL을 유지한다.
- `local_council_portal_members`
  - 지방의정포털 의원 공개 페이지를 유지한다.
- `local_finance_365`
  - 지방재정365 공개 페이지와 다운로드 URL을 유지한다.
- `nec_current_holder`, `nec_council_elected_basis`
  - 내부 `request_url` 대신 사용자가 접근 가능한 공개 landing URL을 `source_url`로 제공한다.
  - 식별자 기반 deep link가 없거나 안정적이지 않으면 선관위/공공데이터 공개 landing URL을 사용한다.

### 3. Frontend CTA 구조 단순화

- 카드 헤더 우측의 generic `원문 이동` 버튼을 제거한다.
- primary CTA는 expanded content 내부의 구체 라벨 버튼으로 통일한다.
  - `출처 · 중앙선거관리위원회`
  - `출처 · 지방재정365`
  - `활동`
  - `공약`
  - `원문 다운로드`
  - `관련 출처`
- 카드가 확장되지 않은 상태에서는 headline/meta/배지/summaryLine만 보여주고, CTA는 확장 시 드러난다.
- 확장 가능한 카드의 기본 토글 구조는 유지한다.

## 데이터 흐름

1. backend dossier 조립 단계에서 raw `source_refs_payload`를 읽는다.
2. `normalize_source_ref()`에서 invalid URL 제거, label 정규화와 함께 공개 링크 resolver를 적용한다.
3. frontend는 기존과 동일하게 `source_url`, `download_url`, `source_links`를 읽는다.
4. 단, 상세 UI는 `actions.viewUrl`을 더 이상 별도 `원문 이동` 버튼으로 노출하지 않고, `sourceLabel/sourceUrl` 기반 CTA만 렌더한다.

## 사용자 경험 변화

### 변경 전

- 같은 카드에 `원문 이동`과 `출처 · ...`가 함께 존재한다.
- `당선 근거`는 버튼처럼 보이지만 실제 이동 CTA가 없는 경우가 있다.
- 사용자가 어떤 버튼이 공식 출처인지 바로 파악하기 어렵다.

### 변경 후

- 카드 내부 CTA는 모두 의미 있는 라벨을 가진다.
- `당선 근거`는 공개 출처 URL이 있으면 `출처 · 중앙선거관리위원회` 버튼으로 바로 이동할 수 있다.
- generic `원문 이동` 문구가 사라져서 카드별 행동 의미가 더 분명해진다.

## 에러 처리

- 공개 링크 resolver가 source에 맞는 안전한 URL을 만들지 못하면 `source_url`은 비운다.
- invalid placeholder URL이나 비-HTTP(S) URL은 계속 제거한다.
- 링크가 없는 카드도 토글과 상세 정보는 유지하되, CTA는 노출하지 않는다.

## 테스트 전략

### Backend

- `tests/test_local_council_api.py`에 source ref 정규화 결과를 고정한다.
- `elected_basis` source가 role 정규화뿐 아니라 공개 `source_url`까지 갖는지 검증한다.
- invalid URL 제거 규칙이 공개 링크 resolver와 충돌하지 않는지 검증한다.

### Frontend

- `tests/local_council_detail.test.ts`
  - `원문 이동`이 더 이상 렌더되지 않는지 확인한다.
  - `출처 · ...`와 `원문 다운로드`가 CTA 역할을 유지하는지 확인한다.
  - `당선 근거` 카드가 구체 라벨 CTA를 렌더하는지 확인한다.
- `e2e/local-council/local-sample.spec.ts`
  - 대표 카드에서 출처 CTA 클릭 시 same-tab 이동이 되는지 확인한다.
  - 뒤로가기 후 상세 화면 복원이 유지되는지 확인한다.

## 수동 확인

인앱 브라우저에서 아래를 확인한다.

- 구청장 상세
  - `당선 근거` 확장 시 `출처 · 중앙선거관리위원회` 노출
  - generic `원문 이동` 미노출
- 구의원 상세
  - `의안`, `회의`, `공식 프로필` 카드에서 `출처 · ...` 혹은 명시적 관련 버튼만 남음
  - CTA 클릭 후 same-tab 이동과 뒤로가기 복원 정상
