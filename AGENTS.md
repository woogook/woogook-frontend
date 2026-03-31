# AGENTS.md

이 문서는 `woogook-frontend` 저장소의 공통 라우터다. 모든 Agent는 작업을 시작하기 전에 이 문서를 먼저 읽고, 요청 유형과 소유 도메인에 맞는 진입 문서를 추가로 읽는다.

## 기본 분기

1. 요청을 `일반 응답`과 `프로젝트 실행`으로 구분한다.
2. `프로젝트 실행`이면 소유 도메인을 `assembly`, `local-election`, `common` 중 하나로 정한다.
3. 소유 도메인에 맞는 `docs/*/canonical/llm-entry*.md`를 먼저 읽는다.
4. 현재 단계에 맞는 `docs/common/codex/workflows/*.md`, `docs/common/codex/guides/*.md`를 읽는다.

## 공통 원칙

- 문서, 커밋, PR 본문은 한글 우선으로 작성한다.
- 용어와 표기는 `glossary.md`를 따른다.
- 같은 저장소에서 둘 이상의 세션을 병행할 때는 `git worktree`를 사용한다.
- GitHub 상태 변경은 connector 쓰기 권한을 전제하지 않고 `gh` 또는 `gh api`를 기본 경로로 사용한다.
- 코드나 스크립트를 수정하면 관련 문서(`README.md`, `glossary.md`, `docs/**`) 영향 여부를 함께 검토한다.

## 도메인별 진입 문서

### `assembly`

- 먼저 읽기: `docs/assembly/canonical/llm-entry.md`
- 온보딩: `docs/assembly/onboarding/assembly-team-onboarding.md`

### `local-election`

- 먼저 읽기: `docs/local-election/canonical/llm-entry.md`

### `common`

- 먼저 읽기: `docs/common/canonical/llm-entry-common.md`
- workflow 기준: `docs/common/canonical/llm-workflow-harness.md`

## 작업 단계별로 읽을 문서

### 새 작업을 시작하거나 이슈를 만들 때

- `docs/common/codex/workflows/issue-writing-guide.md`

### 구현을 진행할 때

- `docs/common/codex/workflows/development-execution-guide.md`

### 문서 영향 여부를 검토할 때

- `docs/common/codex/workflows/documentation-review-guide.md`
- `docs/common/codex/policies/documentation-policy.md`

### commit, PR, merge를 진행할 때

- `docs/common/codex/workflows/work-completion-guide.md`
- `docs/common/codex/guides/local-hook-and-ci-enforcement-guide.md`
- `docs/common/codex/guides/git-commit-guide.md`
- `docs/common/codex/guides/github-pr-and-merge-guide.md`

## 기록 원칙

- 구체적인 작업 기록은 `tmp/adr/<yymmdd>/yyMMdd-HHmmss-<주제>.md`에 남긴다.
- 작업 기록에는 `배경`, `변경 사항`, `비채택안`, `검증`, `후속 메모`를 포함한다.
