# 현직 지방의원 카드 펼침 UI 단순화 설계

- 작성일: 2026-04-18
- 소유 도메인: `local-council`
- 관련 화면: `/local-council` 상세 뷰
- 관련 코드:
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/tests/local_council_detail.test.ts`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/e2e/local-council/local-sample.spec.ts`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/e2e/local-council/integration.spec.ts`

## 배경

지방의원 상세 카드에는 `원문 이동`과 `열기/닫기`가 함께 노출된다. 사용자는 눈에 띄는 버튼을 눌렀을 때 링크 이동을 기대하기 쉽지만, 현재 `열기/닫기`는 세부 정보 토글 역할만 수행한다. 버튼 수가 많아 시선이 분산되고, 카드의 주된 행동이 무엇인지도 한눈에 드러나지 않는다.

## 목표

- `local-council` 상세 카드에서 텍스트형 `열기/닫기` 버튼을 제거한다.
- 카드 본문 전체를 펼침/접힘 트리거로 만들어 상세 정보 접근 경로를 단순화한다.
- 외부 이동은 `원문 이동` CTA 하나로 명확히 분리한다.
- 이미 확장 가능한 보강 정보 섹션도 같은 disclosure 패턴으로 맞춘다.

## 비목표

- backend payload, source contract, 링크 URL은 변경하지 않는다.
- `local-election`, `assembly` 등 다른 도메인 상세 화면에는 적용하지 않는다.
- 카드 내부의 출처 링크, 다운로드 링크, 보강 정보 콘텐츠는 제거하지 않는다.

## 최종 결정

- 확장 가능한 카드의 제목/메타/배지/요약 영역 전체를 하나의 disclosure button으로 감싼다.
- 우측 액션 영역에는 외부 이동이 필요한 경우 `원문 이동`만 남긴다.
- 텍스트 `열기/닫기`는 제거하고, 접힘 상태는 작은 chevron 아이콘 회전으로만 표시한다.
- 보강 정보 섹션도 동일하게 헤더 전체를 클릭 가능한 disclosure header로 바꾼다.
- 접근성은 유지한다.
  - disclosure button에는 기존처럼 `aria-expanded`, `aria-controls`, 상세한 `aria-label`을 유지한다.
  - `원문 이동`은 독립 link로 남겨 키보드/스크린리더 동작을 분리한다.

## 화면 규칙

### 카드

- 확장 가능 + 외부 링크 있음
  - 좌측 본문: 카드 펼침/접힘
  - 우측 CTA: `원문 이동`
- 확장 가능 + 외부 링크 없음
  - 카드 전체 본문: 카드 펼침/접힘
- 확장 불가 + 외부 링크 있음
  - 우측 CTA: `원문 이동`
  - 본문은 정적 정보

### 보강 정보

- 섹션 헤더 전체가 펼침/접힘 트리거가 된다.
- 별도 `열기/닫기` 텍스트 버튼은 두지 않는다.
- 아이콘만으로 현재 상태를 표시한다.

## 테스트 전략

- `tests/local_council_detail.test.ts`
  - 카드/보강 정보에서 `열기`, `닫기` 텍스트가 더 이상 렌더되지 않음을 고정한다.
  - 대신 disclosure용 `aria-label`과 `aria-expanded`는 유지되는지 확인한다.
  - `원문 이동` 링크는 계속 노출되는지 확인한다.
- `e2e/local-council/local-sample.spec.ts`
  - 카드 확장은 제목 텍스트 영역 클릭으로 계속 동작하는지 확인한다.
  - `원문 이동` 링크는 계속 존재하고 별도 클릭 대상임을 확인한다.
  - 보강 정보는 텍스트 토글 없이도 열려 있는 기본 상태를 유지하는지 확인한다.
- `e2e/local-council/integration.spec.ts`
  - 실제 backend 연동 fixture에서도 동일한 disclosure 동작을 보장한다.

## 수동 확인

인앱 브라우저에서 `http://localhost:3000/local-council` 상세 화면을 열고 아래를 확인한다.

- 카드 우측에는 `원문 이동`만 보인다.
- 카드 제목/메타 영역을 누르면 세부 정보가 접히고 펼쳐진다.
- `열기`, `닫기` 텍스트는 카드와 보강 정보 어디에도 보이지 않는다.
- `원문 이동`을 누르면 실제 외부 링크로 이동한다.
