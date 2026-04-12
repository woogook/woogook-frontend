# 현직 지방의원 도메인 LLM 진입 문서

## 먼저 읽을 문서

1. `glossary.md`
2. `.agents/README.md`
3. `.agents/entry/local-council.md`
4. 현재 단계에 맞는 `.agents/workflows/*.md`

## 기본 수정 경로

- `src/app/local-council/**`
- `src/features/local-council/**`
- `docs/local-council/**`

## 경계

- `local-council`은 현직 지방의원 사람 엔터티와 지방의회 기관 문맥을 다룬다.
- `local-election`은 선거 시점 후보자와 선거 단위 문맥을 다룬다.
- 같은 사람을 다루더라도 현직 의원 정보와 선거 후보자 정보는 같은 의미로 섞지 않는다.

## 현재 상태

- 제품 기능과 세부 정본 문서는 아직 추가 전이다.
- 기능 추가 전까지는 이 문서를 도메인 placeholder로 사용하고, 실제 화면/데이터 계약이 생기면 이 문서를 먼저 갱신한다.
