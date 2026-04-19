# 지방의원 의안 카드 연관 사유·근거 문구 설계

- 작성일: 2026-04-18
- 소유 도메인: `local-council`
- 관련 화면: `/local-council` 상세 뷰의 `구의원 > 의안` 카드
- 관련 저장소:
  - `/Users/eric/dev/upstage/woogook/woogook-frontend`
  - `/Users/eric/dev/upstage/woogook/woogook-backend`
- 관련 코드:
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/detail.ts`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/tests/local_council_detail.test.ts`
  - `/Users/eric/dev/upstage/woogook/docs/runbook/local-council-manual-e2e-runbook.md`

## 배경

현재 구의원 상세의 `의안` 카드는 제목, 상태, 제안일 정도만 보여준다. 사용자는 이 카드가 왜 특정 구의원과 연결됐는지, 그리고 어떤 근거로 연결했는지를 카드만 보고 바로 이해하기 어렵다.

live backend payload를 확인한 결과, 현재 응답에는 이미 다음 필드가 포함되어 있다.

- `participation_type`, `participation_label`
- `basis_kind`
- `matched_by`
- `proposer`
- `source_ref.source_label`

즉, 이번 변경은 backend 스키마를 늘리지 않고도 frontend에서 사용자용 설명 문구를 조합해 해결할 수 있다.

## 목표

- 구의원 `의안` 카드에 `연관 사유`와 `근거` 행을 추가한다.
- 내부 코드값을 그대로 노출하지 않고 사용자 문구로 번역한다.
- `local-council` 도메인에만 적용하고 다른 도메인 카드 구조는 건드리지 않는다.
- 기존 링크 버튼과 시간 표기 정책을 깨지 않는다.

## 비목표

- `basis_kind`, `matched_by`, `confidence` 같은 내부 식별값을 raw text로 노출하지 않는다.
- backend API schema를 새로 추가하거나 source contract를 바꾸지 않는다.
- `회의`, `재정 활동`, `구청장 공식활동` 카드에는 같은 문구를 확장 적용하지 않는다.
- 제안자 명단 전체를 카드에 노출하지 않는다.

## 최종 결정

### 1. 카드 상세 행 2개를 추가한다

- `연관 사유`
- `근거`

두 행 모두 기존 `상태`, `제안일`과 같은 `detailRows`에 들어간다.

### 2. 연관 사유는 participation 중심으로 설명한다

- `primary_sponsor`
  - `대표발의 의안으로 확인됨`
- `co_sponsor`
  - `공동발의 의안으로 확인됨`
- `submitted_by_district_head`
  - `구청장이 제출한 의안으로 확인됨`
- `listed_activity` + `matched_by=PROPSR contains member name`
  - `제안자 명단에 의원명이 포함되어 연결됨`
- 그 외
  - `의안 참여 기록으로 연결됨`

### 3. 근거는 출처 기준을 짧게 요약한다

- `basis_kind=official_council_bill_search`
  - `강동구의회 의안검색 기준`
- `basis_kind=portal_member_bill_index`
  - `지방의정포털 의안 목록 기준`
- 그 외
  - 출처 라벨이 있으면 `<출처명> 기준`
  - 없으면 `공식 수집 근거 기준`

### 4. 내부 구현 신호는 숨긴다

- `basis_kind`, `matched_by`, `confidence` raw 값은 카드에 그대로 노출하지 않는다.
- 제안자 목록은 문구 생성에만 참고하고, 최종 UI에는 노출하지 않는다.
- 이유: 디버깅 정보처럼 보이지 않게 하면서도 사용자는 연결 맥락을 이해할 수 있어야 한다.

## 데이터 흐름

1. `buildBillActivityCardViewModel()`이 bill item을 읽는다.
2. `participation_type`, `participation_label`, `basis_kind`, `matched_by`, `source_ref`를 해석한다.
3. helper가 사용자 문구 `연관 사유`, `근거`를 만든다.
4. 카드 `detailRows`에 기존 `상태`, `제안일`과 함께 추가한다.

## 에러 처리

- 관련 필드가 비어 있으면 해당 설명 행은 생략한다.
- `title_only` bill summary 숨김 정책은 그대로 유지한다.
- 링크가 없더라도 설명 행은 렌더링된다.

## 테스트 전략

### 단위 테스트

- `buildBillActivityCardViewModel()`이 공식 의안검색 건에 대해
  - `연관 사유 = 대표발의 의안으로 확인됨`
  - `근거 = 강동구의회 의안검색 기준`
  를 추가하는지 검증한다.
- 지방의정포털 목록 매칭 건에 대해
  - `연관 사유 = 제안자 명단에 의원명이 포함되어 연결됨`
  - `근거 = 지방의정포털 의안 목록 기준`
  을 추가하는지 검증한다.

### 렌더 테스트

- `LocalCouncilPersonDetailView`의 `의안` 확장 카드에 새 문구가 보이는지 확인한다.
- 기존 `출처 · ...` 링크 CTA가 그대로 유지되는지 확인한다.

### 수동 확인

runbook 기준 강동구 구의원 상세에서 아래를 본다.

- `의안` 카드가 여전히 정상적으로 열린다.
- 각 카드에 `연관 사유`, `근거`가 노출된다.
- 기존 출처 링크 클릭과 뒤로가기 복원이 깨지지 않는다.
