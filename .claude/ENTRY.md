# Claude Entry

`.claude/`는 thin adapter다. 이 파일은 Claude가 공통 진입 경로로 연결될 때 필요한 최소 규칙만 담는다.

## 읽는 순서

1. `AGENTS.md`를 읽는다.
2. `glossary.md`를 읽는다.
3. 요청이 `프로젝트 관련 작업`이면 `.agents/README.md`를 읽는다.
4. 필요할 때만 `.agents/entry/*.md`, `.agents/workflows/*.md`, `.agents/contracts/common.yaml`을 읽는다.

## 어댑터 원칙

- source of truth는 `AGENTS.md`, `glossary.md`, `.agents/`, `docs/`다.
- `.claude/`는 공통 계약을 우회하지 않는다.
- 프로젝트 관련 turn이면 `.agents/README.md`가 정의한 session-scoped turn-flow observability 규약을 따른다.
- 추가 문서는 `.agents/README.md`가 지시하는 경로만 읽는다.
