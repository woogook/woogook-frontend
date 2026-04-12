# AGENTS.md

이 문서는 `woogook-frontend` 저장소의 최상위 진입점이다.

## 역할

- 모든 요청을 먼저 `프로젝트 관련 작업`과 `그 외 작업`으로 분류한다.
- `프로젝트 관련 작업`이면 다음 문서로 라우팅한다.

## 요청 분류

- 요청이 이 저장소의 코드, 문서, 설정, CI, GitHub workflow, 작업 절차 변경과 직접 관련되면 `프로젝트 관련 작업`으로 본다.
- 그렇지 않으면 `그 외 작업`으로 보고, 이 문서의 workflow 경로를 시작하지 않는다.

## 다음 문서

- `프로젝트 관련 작업`이면 `glossary.md`를 읽는다.
- 그다음 `.agents/README.md`를 읽는다.

## 공통 원칙

- 사람이 읽는 문서, 설명, commit, PR 본문은 한글을 우선한다.
- code identifier, 파일 경로, 명령어, env var, schema key, GitHub 고정 문법은 원문을 유지한다.
- 용어와 표기는 `glossary.md`를 따른다.
- 같은 저장소에서 둘 이상의 세션을 병행할 때는 `git worktree`를 사용한다.
- GitHub 상태 변경은 connector 쓰기 권한을 전제하지 않고 `gh` 또는 `gh api`를 기본 경로로 사용한다.
