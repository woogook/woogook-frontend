# 현직 지방의원 상세 사용자 화면 정리 설계

- 작성일: 2026-04-18
- 소유 도메인: `local-council`
- 관련 화면: `/local-council` 상세 뷰
- 관련 코드:
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/detail.ts`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/data.ts`

## 배경

현재 `/local-council` 상세 화면은 의원 본문 정보와 함께 운영·진단·디버깅 목적의 정보가 많이 노출된다. 예를 들어 `발행·진단`, `설명 가능한 진단`, `spot-check`, `publishable_degraded`, `needs_human_review`, 샘플 안내 배너, overlay 운영 상태 문구는 개발자에게는 유용하지만 일반 사용자가 의원 정보를 파악하는 데에는 방해가 된다.

이번 변경은 상세 화면을 사용자용 정보 중심으로 정리해, 실제 의원과 관련된 정보만 남기고 내부 품질 점검용 정보는 숨기는 것이다.

## 목표

- 상세 화면에서 실제 의원 정보와 직접 관련된 내용만 남긴다.
- 사용자가 이해하기 어려운 운영·디버깅·진단 정보는 제거한다.
- `local-council` 상세 화면에서만 적용하고 다른 도메인에는 영향을 주지 않는다.
- 출처 링크와 공식 근거 카드는 유지해 정보 신뢰성을 확인할 수 있게 한다.

## 비목표

- backend payload, schema, API contract는 변경하지 않는다.
- roster 화면의 데이터 소스 배지와 동작은 이번 변경 범위에 포함하지 않는다.
- `assembly`, `local-election` 등 다른 도메인 UI는 변경하지 않는다.
- 카드 내부의 실제 출처 링크와 의원 관련 supplemental 자료 자체는 지우지 않는다.

## 제거 원칙

### 제거 대상

- hero 하단의 `기준 ...` 시각 문구
- 샘플 데이터 안내 배너
- `발행·진단` 섹션 전체
- `설명 가능한 진단` 섹션 전체
- `spot-check` 섹션 전체
- overlay에서 운영용 메타 정보
  - `준비 완료`, `준비 중` 같은 상태 라벨
  - 허용 소스 목록
  - 생성 시각
  - 대상 member id
  - 보강 정보가 supplemental surface라는 설명
- 사용자가 직접 이해할 필요가 없는 내부 상태 문자열
  - `publishable`, `publishable_degraded`
  - `needs_human_review`
  - `data_gap_flags`
  - `source_contract`
  - `freshness lineage`

### 유지 대상

- 인물명, 직책, 정당, 프로필 이미지, 학력/경력 등 hero 정보
- grounded summary 본문
- `근거 요약` 섹션
  - 요약 근거 출처 칩 포함
- `공식 프로필`
- `당선 근거`
- `위원회`
- `의안`
- `회의`
- `재정 활동`
- 각 카드의 출처 링크, 원문 보기/다운로드 링크
- 실제 의원 관련 supplemental 콘텐츠
  - 기사 제목
  - 기사 요약
  - 매체명
  - 원문 보기 링크

## 최종 결정

- `LocalCouncilPersonDetailView`에서 진단성 섹션과 문구를 제거한다.
- `SupplementalOverlaySection`은 운영 메타를 걷어내고, 실제 보강 콘텐츠 목록만 남긴다.
- `근거 요약`은 유지하되 개발자 용어가 과한 설명 문장은 함께 정리한다.
- 카드/출처 링크는 그대로 유지해 사용자가 확인 가능한 공식 근거 경로를 잃지 않게 한다.

## 화면 구조

### 변경 후 상단

- 뒤로 가기
- hero
  - 인물명
  - 직책/정당
  - summary headline
  - grounded summary
- 상세 카드 섹션
  - 근거 요약
  - 공식 프로필
  - 당선 근거
  - 위원회
  - 의안
  - 회의
  - 재정 활동
  - 보강 정보(실제 콘텐츠가 있을 때만)

### 변경 후 보강 정보

- 보강 정보 섹션 제목은 유지한다.
- 실제 기사/공개자료 item만 보여준다.
- 상태/생성 시각/허용 소스/대상 id/운영 설명은 숨긴다.
- 콘텐츠가 전혀 없으면 섹션 자체를 숨기거나, 최소한의 사용자용 empty state만 유지한다.

## 테스트 전략

- 기존 `tests/local_council_detail.test.ts`에서 사용자 화면에 더 이상 보이지 않아야 하는 문자열을 `doesNotMatch`로 고정한다.
  - `발행·진단`
  - `설명 가능한 진단`
  - `spot-check`
  - `publishable_degraded`
  - `기준 2026-...`
  - `data_gap_flags`
- 유지해야 하는 의원 정보는 `match`로 계속 보장한다.
  - 인물명
  - 요약 본문
  - 공식 프로필/당선 근거/위원회/의안/회의/재정 활동
  - 출처 링크
  - overlay 기사 제목/원문 링크
- `e2e/local-council/local-sample.spec.ts`도 사용자 관점 검증으로 맞춘다.

## 수동 확인

인앱 브라우저에서 `http://localhost:3000/local-council` 상세 화면을 열고 아래를 확인한다.

- 보이는 것
  - 의원 소개와 공식 활동 카드
  - 카드별 출처 링크
  - 실제 보강 기사/자료
- 사라지는 것
  - 진단/점검/spot-check 성격의 박스
  - freshness/생성 시각/운영 상태
  - 내부 상태 문자열
