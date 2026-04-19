# 현직 지방의원 화면 KST 시간 표기 통일 설계

- 작성일: 2026-04-18
- 소유 도메인: `local-council`
- 관련 frontend 문서:
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/docs/local-council/canonical/llm-entry.md`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/docs/local-council/runbooks/local-frontend-backend-check-guide.md`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/docs/superpowers/specs/2026-04-11-local-council-member-address-roster-detail-design.md`

## 배경

`/local-council` 화면은 roster freshness, detail freshness, overlay 보강 정보, 의안/회의/재정 활동 카드에서 여러 종류의 시각 값을 보여준다. 현재 UI는 backend ISO 문자열(`2026-04-08T10:05:00+09:00`)과 raw date string, `toLocaleString("ko-KR")` 결과가 섞여 있어 동일한 화면 안에서도 표기 규칙이 일정하지 않다.

이번 변경은 `local-council` 도메인에서만 시간 표시 규칙을 통일해 사용자가 시각 정보를 한 눈에 비교할 수 있게 만드는 것이다. 다른 도메인(`assembly`, `local-election`, `common`)의 날짜/시간 표기 규칙은 건드리지 않는다.

## 목표

- `local-council` 도메인에서 화면에 표시되는 시간 값을 `YYYY-MM-DD HH:mm:ss` 형식으로 통일한다.
- 표시는 항상 KST 기준으로 맞춘다.
- timezone 문자열 `KST`는 화면에 별도로 붙이지 않는다.
- 날짜/시간 포맷터를 `local-council` 전용 helper 하나로 모아 이후 화면 추가 시에도 같은 규칙을 재사용할 수 있게 한다.

## 비목표

- `assembly`, `local-election`, `common` 등 다른 도메인의 시간 표기를 변경하지 않는다.
- backend payload 자체를 수정하거나 API contract를 바꾸지 않는다.
- 설명 문장 안에 섞여 있는 자유 텍스트 ISO 문자열(`freshness.explanation` 같은 문장)은 치환하지 않는다.
- `staleness_bucket`, `source_mode`, `basis_kind` 같은 상태 문자열을 시간 포맷으로 바꾸지 않는다.

## 대안 검토

### 1. `local-council` 전용 시간 포맷터 추가 후 날짜 필드에만 명시 적용

- 장점:
  - 도메인 경계가 명확하다.
  - 시간 표기 규칙을 한 군데서 유지할 수 있다.
  - 문자열 전체 치환보다 안전하게 적용 지점을 통제할 수 있다.
- 단점:
  - 기존 raw 문자열을 뿌리던 지점을 여러 군데 손봐야 한다.

### 2. 각 화면 컴포넌트에서 개별 포맷

- 장점:
  - 구현 진입이 가장 단순하다.
- 단점:
  - 새 화면 추가나 숨은 렌더 경로에서 다시 형식이 섞일 수 있다.
  - 같은 규칙이 여러 파일에 중복된다.

### 3. 공용 `src/lib` 날짜 포맷터를 확장해 `local-council`도 사용

- 장점:
  - 장기적으로 범용 재사용성이 좋다.
- 단점:
  - 현재 요구사항은 `local-council` 한정이라 범위가 과하다.
  - 다른 도메인 회귀 위험이 불필요하게 커진다.

권장안은 1번이다.

## 최종 결정

- `src/features/local-council/time.ts`에 전용 formatter를 추가한다.
- formatter는 아래 규칙으로 동작한다.
  - `YYYY-MM-DD` 문자열은 KST 자정으로 보고 `YYYY-MM-DD 00:00:00`으로 표시한다.
  - timezone이 포함된 ISO datetime은 KST로 변환해 표시한다.
  - timezone이 없는 `YYYY-MM-DD HH:mm:ss` 또는 `YYYY-MM-DDTHH:mm:ss`는 이미 KST local time으로 간주하고 형식만 정규화한다.
  - 파싱 불가 문자열은 억지로 바꾸지 않고 원문을 유지한다.
- formatter 적용은 날짜 필드로 확인된 지점에만 명시적으로 한다.

## 적용 범위

### 적용 대상

- roster 화면
  - `freshness.basis_timestamp`
- detail 화면
  - `freshness.basis_timestamp`
  - `freshness.generated_at`
  - `freshness.lineage[].timestamp`
  - `overlay.generated_at`
  - `overlay.sections[].items[].published_at`
  - `bills[].proposed_at`
  - `bills[].bill_date`
  - `finance_activity[].date`
  - `finance_activity[].activity_date`
  - `elected_basis.elected_at`

### 제외 대상

- `freshness.explanation`, `explanation_lines`, `note` 같은 자유 서술 문장
- `meeting_date`처럼 이미 자연어 문자열(`2026-03-25(수)`)로 내려오는 값
- 숫자/식별자/상태 문자열을 함께 다루는 범용 helper 전체

## 구조

### 새 helper

- 파일: `src/features/local-council/time.ts`
- 공개 함수:
  - `formatLocalCouncilDateTime(input)`
  - `formatLocalCouncilDateTimeOrOriginal(input)`
- 내부 책임:
  - 문자열 trim
  - date-only / local-datetime / timezone 포함 datetime 분기
  - KST 기준 `YYYY-MM-DD HH:mm:ss` 생성

### 기존 helper 연동

- `src/features/local-council/data.ts`
  - `getLocalCouncilFreshnessLabel`
  - `getLocalCouncilFreshnessDetailRows`
  - `buildLocalCouncilOverlayViewModel`
- `src/features/local-council/detail.ts`
  - `buildBillActivityCardViewModel`
  - `buildMeetingActivityCardViewModel`
  - `buildElectedBasisDisplayRecord`
  - `finance_activity`를 `SectionCardViewModel`로 넘기기 전 날짜 필드 변환
- `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
  - `buildFreshnessLineageRows`

## 예외와 경계 조건

- `2026-04-07`처럼 날짜만 있으면 `2026-04-07 00:00:00`으로 보인다.
- `2026-04-08T01:05:00Z`처럼 UTC 기반 값은 `2026-04-08 10:05:00`으로 보인다.
- `2026-03-25(수)`처럼 파싱 불가지만 사용자 의미가 있는 값은 원문을 유지한다.
- 값이 비어 있으면 기존 fallback 문구(`기준 시각 확인 필요`)를 유지한다.

## 테스트 전략

- 새 unit test로 formatter가 아래 케이스를 통과하는지 확인한다.
  - date-only
  - ISO with `+09:00`
  - ISO with `Z`
  - timezone 없는 local datetime
  - invalid string passthrough
- 기존 `tests/local_council_detail.test.ts`에 아래 회귀를 추가한다.
  - roster freshness가 `기준 2026-04-08 10:10:00`으로 보이는지
  - detail freshness rows가 `기준 시각`, `생성 시각`을 새 형식으로 보이는지
  - 신선도 계보 timestamp가 새 형식으로 보이는지
  - overlay `생성 시각`, `수집/발행 시각`이 새 형식으로 보이는지
  - 의안/재정 활동 카드의 날짜 필드가 새 형식으로 보이는지

## 수동 확인

인앱 브라우저에서 `http://localhost:3000/local-council`을 열고 `서울특별시 / 강동구 / 천호동` 경로를 확인한다.

- roster
  - 상단 freshness가 `기준 2026-.. ..:..:..` 꼴인지 확인
- detail
  - hero 아래 freshness
  - `발행·진단 > 신선도 설명`
  - `설명 가능한 진단 > 신선도 계보`
  - `보강 정보 > 생성 시각`
  - overlay item `수집/발행 시각`
  - 의안/재정 활동 카드 날짜
