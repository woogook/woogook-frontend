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

- `/local-council` 경로에서 주소 선택 → 현직자 명단 → dossier 상세 흐름이 구현돼 있다.
- backend가 아직 연결되지 않았을 때는 강동구 샘플 fixture로 로컬 미리보기를 제공한다.
- 세부 제품 정본 문서는 아직 최소 상태이므로, 후속 변경 전에는 현재 구현과 관련 spec/plan 문서를 함께 확인한다.
