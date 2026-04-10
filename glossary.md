# Glossary (용어집)

## 공통

- NEC(National Election Commission): 중앙선거관리위원회
- assembly: 국회 서비스 도메인
- local-election: 지방선거 서비스 도메인
- agent control-plane: agent가 작업 진입, 도메인 판단, workflow 단계, 검증 경로를 찾는 저장소 소유 기준면
- work-log: 기준 GitHub Issue에 남기는 작업 결정 기록 댓글

## 국회의원

- MONA(Member of National Assembly): 국회의원
- NAM(National Assembly Member): 국회의원

## 지방선거 및 지방의원

지방선거는 지방자치단체장, 지방의회 의원, 교육감을 선출하는 선거를 포괄한다.
같은 행정구역이라도 직책별 선거 단위가 다를 수 있으므로, 저장소에서는 일반 `district`보다 `contest`를 우선 용어로 사용한다.

### 핵심 엔터티

- local_election: 지방선거 전체 도메인
- local_election_candidate: 지방선거 후보자, 선거 시점 후보 엔터티 문맥에 사용
- local_election_contest: 지방선거의 선거 단위, 선거구·투표 단위 엔터티 문맥에 사용
- local_council: 지방의회, 기관·의회 단위 문맥에 사용
- local_council_member: 지방의원, 현직 지방의원 사람 엔터티 문맥에 사용

### 하위 직위·선거 문맥

- metro_head: 시·도지사, 광역자치단체장 문맥에 사용
- basic_head: 시장·군수·구청장, 기초자치단체장 문맥에 사용
- metro_council: 시·도의회, 광역의회 문맥에 사용
- basic_council: 시·군·구의회, 기초의회 문맥에 사용
- education_head: 교육감 문맥에 사용

### 사용 원칙

- `지방의회`는 기관이고, `지방의원`은 현직 의원 사람 엔터티다.
- `지방선거 후보자`는 선거 시점 후보 엔터티이며, `지방의원`과 같은 의미로 섞어 쓰지 않는다.
- 같은 `시·군·구`라도 단체장 선거, 광역의회 선거, 기초의회 선거의 선거구가 서로 다를 수 있다.
- 저장소 모델, DB, API 문맥에서는 일반적인 `district`보다 `local_election_contest`를 우선 사용한다.
