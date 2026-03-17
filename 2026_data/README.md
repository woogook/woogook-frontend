# Inspector AI 전달용 데이터 가이드

이 문서는 Inspector AI로 프론트 시안을 만들 때 사용할 데이터 파일과 응답 규칙을 정리한 문서다.

## 1. 목적

Inspector AI에는 선거구 원본 JSON이나 후보자 원본 JSON을 직접 넣기보다, 화면에서 바로 소비하는 `ballot response` 형태를 전달하는 것이 가장 효율적이다.

현재 프론트 프로토타입에서는 아래 두 상태를 우선 확인하면 된다.

1. 주소가 단일 선거구로 잘 매핑되는 `resolved` 상태
2. 같은 행정동에 복수 지역구가 걸리는 `partially_ambiguous` 상태

## 2. 전달 파일 목록

### 2.1 실데이터 원본

아래 파일은 백엔드 기준 canonical 데이터다.

1. 선거구 canonical JSON  
   [`nec_2026_local_election_constituencies_unified.json`](/Users/jeonjihun/Desktop/Upstage/Woogook/woogook-backend/지방선거/data/중앙선거관리위원회/선거통계시스템/선거구/nec_2026_local_election_constituencies_unified.json)
2. 후보자 canonical JSON  
   [`nec_2026_local_election_candidates_unified.json`](/Users/jeonjihun/Desktop/Upstage/Woogook/woogook-backend/지방선거/data/중앙선거관리위원회/선거통계시스템/후보자/nec_2026_local_election_candidates_unified.json)

위 두 파일은 전체 데이터셋이므로 Inspector AI 시안 확인용으로는 너무 크다.

### 2.2 Inspector 전달용 샘플

아래 파일을 Inspector AI에 바로 전달하면 된다.

1. 정상 응답 샘플  
   [sample_ballot_response_resolved_seoul.json](/Users/jeonjihun/Desktop/Upstage/Woogook/woogook-backend/지방선거/docs/inspector/sample_ballot_response_resolved_seoul.json)
2. 일부 모호 응답 샘플  
   [sample_ballot_response_partially_ambiguous_jeju.json](/Users/jeonjihun/Desktop/Upstage/Woogook/woogook-backend/지방선거/docs/inspector/sample_ballot_response_partially_ambiguous_jeju.json)

## 3. 프론트가 받아야 하는 기본 응답 shape

프론트는 아래 구조 하나만 기준으로 화면을 설계하면 된다.

```ts
type BallotResponse = {
  city_name_canonical: string;
  sigungu_name: string;
  emd_name: string;
  resolution_status: "resolved" | "partially_ambiguous" | "ambiguous";
  ballot_count: number;
  ballots: BallotItem[];
  ambiguous_ballots: AmbiguousBallot[];
};
```

### 3.1 핵심 필드 의미

1. `resolution_status`
   - `resolved`: 모든 선거 코드가 단일 선거구로 판정됨
   - `partially_ambiguous`: 일부 선거 코드만 추가 선택이 필요함
   - `ambiguous`: 주요 선거 코드가 모두 모호해서 추가 선택이 필요함

2. `ballot_count`
   - `ballots.length`와 동일하다
   - `ambiguous_ballots`에 들어간 선거 코드는 포함하지 않는다

3. `ballots`
   - 지금 바로 보여줄 수 있는 선거 카드 목록

4. `ambiguous_ballots`
   - 사용자에게 추가 선택 UI를 띄워야 하는 선거 코드 목록

## 4. 프론트 렌더링 규칙

1. `resolution_status === "resolved"` 이면 `ballots`를 그대로 렌더링한다.
2. `resolution_status === "partially_ambiguous"` 이면 `ballots`는 먼저 보여주고, `ambiguous_ballots`는 별도 선택 카드나 모달로 처리한다.
3. `ballot_subject_type === "candidate_person"` 이면 후보 카드 리스트 UI를 사용한다.
4. `ballot_subject_type === "party_list"` 이면 후보 개인 카드가 아니라 정당 투표 성격을 설명하는 UI를 사용한다.
5. `candidates.length === 0` 이면 에러로 처리하지 말고 `데이터 준비 중` 또는 `아직 후보 정보 없음` 상태를 보여준다.
6. `contest_id` 는 프론트 key와 후속 상세 조회 key로 그대로 사용한다.

## 5. 현재 데이터 상태

1. 후보자 데이터는 현재 서울시 기준 데이터만 연결돼 있다.
2. `8` 광역의원비례대표, `9` 기초의원비례대표는 현재 정당명부 데이터가 없어 `candidates=[]` 로 내려간다.
3. 제주 `10` 교육의원 선거구는 아직 공식 선거구 데이터가 확보되지 않아 현재 응답에 포함되지 않는다.
4. 현재 후보 데이터는 내부적으로 예비후보자 소스를 사용하지만, 프론트 프로토타입에서는 일반 후보 카드처럼 렌더링해도 된다.

## 6. 샘플 데이터 사용 권장 방식

1. `sample_ballot_response_resolved_seoul.json` 으로 기본 메인 화면과 후보 카드 화면을 설계한다.
2. `sample_ballot_response_partially_ambiguous_jeju.json` 으로 모호한 주소 처리 UI를 설계한다.
3. 비례대표 빈 상태는 서울 샘플의 `election_code=8,9` 카드로 확인한다.

## 7. Inspector AI에 함께 전달하면 좋은 설명

아래 문장을 같이 전달하면 된다.

```md
이 서비스는 사용자가 자신의 주소를 입력하면 이번 지방선거에서 어떤 투표를 하게 되는지 자동으로 보여주고, 각 선출직별 후보자 정보를 비교할 수 있게 돕는 서비스다.

화면은 다음 흐름을 중심으로 설계해줘.
1. 주소 입력 또는 지역 선택
2. 내가 받는 투표지 요약
3. 선출직별 후보 카드 목록
4. 비례대표와 지역구를 구분한 카드 구조
5. 일부 선거구가 모호할 경우 추가 선택을 유도하는 UI

샘플 JSON은 실제 API 응답 형태를 축약한 예시다.
```
