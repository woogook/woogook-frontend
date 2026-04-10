# Local Council Entry

## 목적

- `local-council` 도메인 작업에서 추가로 읽어야 할 도메인 정본 문서를 지정한다.

## 추가 문서

- `docs/local-council/canonical/llm-entry.md`
- 현재 작업과 직접 관련된 `docs/local-council/**` 문서
- `glossary.md`의 `local_council`과 `local_council_member` 용어
- 현직 지방의원 기능이 `local-election` 화면이나 데이터와 연결되면 `.agents/entry/local-election.md`도 함께 확인한다.

## 주의사항

- 공통 workflow는 `.agents/workflows/*.md`를 따른다.
- `local-council`은 현직 지방의원 사람 엔터티와 지방의회 기관 문맥을 다룬다.
- `local-election`의 선거 시점 후보자 문맥과 섞지 않는다.
