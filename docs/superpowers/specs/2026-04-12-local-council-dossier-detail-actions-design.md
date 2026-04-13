# 현직 지방의원 dossier 상세 인터랙션 확장 설계

- 작성일: 2026-04-12
- 소유 도메인: `local-council`
- 관련 화면:
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/.worktrees/local-council-member-screen/src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
- 관련 backend 문맥:
  - `/Users/eric/dev/upstage/woogook/woogook-backend/지방의원/README.md`
  - `/Users/eric/dev/upstage/woogook/woogook-backend/docs/지방의원/canonical/gangdong-local-council-vertical-slice-validation-runbook.md`

## 배경

현재 dossier 상세 화면은 `공식 프로필`, `당선 근거`, `위원회`, `공식 활동`, `회의`, `재정 활동`, `출처`를 섹션으로 나눠 보여준다. 하지만 각 카드가 제목과 메타 한 줄만 보여주고, 클릭했을 때 더 자세한 정보나 원문 링크를 제공하지 않는다.

특히 `재정 활동`은 카드가 보이지만 아무 액션이 없어서 사용자가 다음 행동을 기대했다가 막히는 상태다. 이 문제는 `재정 활동` 하나의 이슈로 보이지만, 실제로는 dossier 전체 섹션이 같은 한계를 갖고 있다.

동시에 backend는 앞으로 item별 원문 URL, 다운로드 URL, 프로필/약력/학력 같은 인물 메타 정보를 더 보강할 가능성이 있다. frontend는 지금 데이터로도 동작해야 하고, backend 확장이 들어오면 큰 구조 변경 없이 받아들일 수 있어야 한다.

## 목표

- dossier 상세의 주요 섹션 카드가 모두 클릭 가능한 상호작용을 갖도록 만든다.
- 카드 안에서 상세 정보와 `원문 보기` 또는 `원문 다운로드` 액션을 제공한다.
- `재정 활동`뿐 아니라 `공식 활동`, `회의`, `공식 프로필`, `당선 근거`, `위원회`까지 같은 확장 규칙을 적용한다.
- 상단에 `인물 요약 블록`을 두고, backend가 제공하는 범위 안에서 사진·학력·약력 등을 표시할 수 있게 한다.
- backend 필드명이 아직 고정되지 않은 상태를 감안해서, optional field safe rendering을 기본 원칙으로 설계한다.

## 비목표

- backend에 아직 없는 정보를 frontend에서 추론해서 만들어내지 않는다.
- 특정 source 종류에만 맞춘 일회성 UI를 만들지 않는다.
- dossier를 별도 모달이나 새로운 라우트 구조로 재설계하지 않는다.
- 원문 다운로드 URL이 없는데도 다운로드가 가능한 것처럼 오해를 유도하지 않는다.

## 사용자 문제

1. 카드를 클릭할 수 있을 것처럼 보이는데 실제로는 다음 정보가 없다.
2. 섹션마다 정보 밀도와 액션 방식이 달라 일관성이 없다.
3. 인물 최상단에 핵심 프로필이 충분히 보이지 않아 상세 페이지 첫인상이 약하다.
4. backend가 필드를 추가할 때마다 frontend를 크게 다시 바꾸면 유지보수 비용이 커진다.

## 설계 원칙

- dossier 상세는 `상단 인물 요약 블록`과 `하단 근거 섹션 카드`의 두 층으로 구성한다.
- 섹션 카드는 모두 같은 폭과 같은 상호작용 규칙을 가진다.
- item-level source metadata를 우선 사용하고, 없으면 section-level source metadata로 fallback한다.
- 데이터가 없으면 빈 상태 문구를 억지로 채우지 않고, 해당 필드 또는 액션을 숨긴다.
- backend가 보내는 payload가 dict/list 기반으로 유연하므로, frontend도 우선순위 탐색과 안전한 조건부 렌더링으로 대응한다.

## 정보 구조

### 1. 상단 인물 요약 블록

위치: dossier 최상단, 이름과 요약 배지 아래

표시 후보:

- 프로필 사진
- 이름
- 직책
- 정당
- 한 줄 소개
- 학력
- 주요 약력
- 대표 링크

렌더링 원칙:

- 값이 있으면 표시한다.
- 값이 없으면 해당 항목은 숨긴다.
- 사진이 없으면 placeholder 또는 이니셜 avatar를 쓴다.
- `학력 없음`, `약력 없음` 같은 빈 상태 문구는 기본적으로 두지 않는다.

이 블록은 현재 backend 응답으로는 일부만 채워질 수 있다. 그래도 구조는 먼저 만든다. 나중에 backend가 필드를 추가하면 같은 블록 안에서 자연스럽게 확장된다.

### 2. 하단 근거 섹션 카드

대상 섹션:

- `공식 프로필`
- `당선 근거`
- `위원회`
- `공식 활동` 또는 `의안`
- `회의`
- `재정 활동`
- `출처`

공통 규칙:

- 섹션 카드 폭은 모두 동일하다.
- 각 item 카드는 기본적으로 요약 상태로 보인다.
- 사용자가 카드를 클릭하면 카드 내부에서 상세가 펼쳐진다.
- 펼쳐진 상세 하단에는 공통 액션 행을 둔다.
- 액션 행은 `원문 보기`, `원문 다운로드` 순서를 기본으로 한다.
- 링크가 없으면 해당 버튼은 숨긴다.

## 카드 인터랙션 모델

### 기본 상태

각 카드는 아래 정도만 요약해서 보여준다.

- 제목
- 날짜 또는 보조 메타
- 필요하면 한 줄 상태 정보

### 펼침 상태

각 카드의 상세 영역은 아래 구조를 따른다.

1. 상세 필드 목록
2. 설명/메모 영역
3. 액션 행

예시:

- `공식 활동`
  - 발의자
  - 상임위
  - 처리 결과
  - 관련 메모
- `회의`
  - 회의 유형
  - 차수
  - 회의일
  - 관련 메모
- `재정 활동`
  - 활동 유형
  - 기준 일자
  - 금액/통화
  - 관련 메모

### 액션 행

버튼 우선순위:

1. `원문 다운로드`
2. `원문 보기`

다만 노출 결정 우선순위는 데이터 availability 기준으로 아래와 같다.

1. `item.source_ref.download_url`
2. `item.source_ref.source_url`
3. `section-level source_refs`에서 같은 source_kind 또는 role의 URL
4. 둘 다 없으면 액션 버튼 미노출

즉, 버튼 순서는 `보기/다운로드`로 보이더라도, 실제 링크 계산은 item-level metadata를 우선한다.

## 데이터 계약 방향

### 권장 item-level source shape

각 dossier item은 앞으로 아래와 비슷한 구조를 가질 수 있다.

```json
{
  "title": "강동구 예산 집행 내역",
  "amount": 1250000,
  "currency": "KRW",
  "activity_date": "2026-04-01",
  "activity_type": "expense",
  "source_ref": {
    "source_kind": "local_finance_365",
    "source_title": "지방재정365",
    "source_url": "https://...",
    "download_url": "https://...",
    "download_label": "원문 다운로드"
  }
}
```

이 pattern은 `재정 활동`뿐 아니라 `공식 활동`, `회의`, `공식 프로필`, `당선 근거`, `위원회`에도 동일하게 적용할 수 있다.

### backend 미확정 대응

frontend는 하나의 고정 필드명만 가정하지 않는다. 우선순위 기반 접근을 사용한다.

예시:

- 프로필 사진:
  - `profile_image_url`
  - `photo_url`
  - `image_url`
- 학력:
  - `education`
  - `education_items`
  - `educations`
- 주요 약력:
  - `career`
  - `career_items`
  - `history`
  - `major_career`
- source metadata:
  - `source_ref`
  - `source_refs`

읽은 결과가 비어 있으면 그 블록은 렌더링하지 않는다.

## 섹션별 표시 전략

### 공식 프로필

- headline, section_title, office_label 같은 텍스트를 우선 사용한다.
- highlights, paragraphs, 활동 섹션이 있으면 펼침 상태에서 더 보여준다.
- 공식 사이트 링크는 item-level 또는 section-level source URL로 연결한다.

### 당선 근거

- 선거명, 선거일, 직책, 선거구, 후보 식별자 같은 근거 정보를 보여준다.
- 중앙선거관리위원회 source가 있으면 원문 보기 액션을 제공한다.

### 위원회

- 위원회명, 역할, 임기 등 요약성이 높은 메타를 우선 보여준다.
- 상세 원문이 없는 경우가 많을 수 있으므로 액션이 없으면 버튼은 숨긴다.

### 공식 활동 / 의안

- 제목, 날짜, 위원회, 결과를 보여준다.
- 의안 페이지, 의안 원문, 관련 회의 링크가 있으면 액션 행에 붙인다.

### 회의

- 회차, 날짜, 회의 유형, 차수를 보여준다.
- 회의록 원문 또는 최근자료 링크가 있으면 액션을 제공한다.

### 재정 활동

- 제목, 금액, 통화, 활동일, 활동유형을 보여준다.
- 현재는 section-level `local_finance_365` source_url fallback으로 동작할 수 있다.
- 추후 backend가 item-level `download_url`을 주면 같은 자리에서 다운로드 버튼을 활성화한다.

## UI 일관성 기준

- `공식 활동`, `회의`, `재정 활동`은 폭과 정보 밀도가 동일해야 한다.
- 특정 섹션만 더 많은 버튼이나 필드를 가지는 시안은 최종안으로 채택하지 않는다.
- 같은 섹션 계층의 카드라면 시각적 무게와 액션 위치도 동일해야 한다.

## 오류 및 빈 상태 처리

- 상세 필드가 없으면 해당 행을 숨긴다.
- source URL이 없으면 액션 버튼을 숨긴다.
- 섹션 데이터가 비어 있으면 현재 문구 `공식 근거가 아직 준비되지 않았습니다.`를 유지한다.
- backend schema가 확장되어도 기존 필드가 없는 경우 UI가 깨지지 않도록 null-safe, array-safe, object-safe 처리만 사용한다.

## 구현 방향

1. 공통 dossier card renderer를 도입한다.
2. 섹션별 `titleKeys`, `metaKeys`, `detail field resolver`, `source resolver`를 따로 둔다.
3. 상단 인물 요약 블록은 optional field resolver 기반으로 분리한다.
4. 액션 행은 공통 컴포넌트로 만들고, item-level / section-level source fallback을 캡슐화한다.
5. sample fixture와 local sample dossier도 이 구조를 수용할 수 있게 보강한다.

## 검증 기준

- 현재 강동구 sample dossier와 backend 응답 모두에서 화면이 깨지지 않는다.
- `재정 활동` 카드 클릭 시 상세가 펼쳐진다.
- `공식 활동`, `회의`, `재정 활동` 카드가 동일한 폭과 유사한 정보 밀도를 가진다.
- source URL이 있는 항목은 `원문 보기` 또는 `원문 다운로드` 액션이 나타난다.
- source URL이 없는 항목은 버튼이 나타나지 않는다.
- 인물 요약 블록은 데이터가 없는 항목을 숨기고, 빈 placeholder 문구를 남발하지 않는다.

## 후속 구현 순서

1. dossier 상세 시안 기준을 코드 구조로 나눈다.
2. 공통 card/expanded detail/action 행을 구현한다.
3. `재정 활동`에 먼저 적용해 interaction regression을 확인한다.
4. 같은 패턴을 `공식 활동`, `회의`, `공식 프로필`, `당선 근거`, `위원회`로 확장한다.
5. 상단 인물 요약 블록을 optional field safe 방식으로 추가한다.
6. sample data와 실제 backend 응답 기준으로 검증한다.
