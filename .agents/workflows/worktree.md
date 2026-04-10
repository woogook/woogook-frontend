# Worktree Workflow

## 목적

- 현재 작업을 `main`이 아닌 독립된 branch/worktree에서 진행한다.

## 입력

- 기준 GitHub Issue
- 기준 Issue 번호
- 기준 branch 또는 기준 commit
- 사람의 명시 요청이 있으면 그 기준점

## 실행 순서

1. 현재 작업을 `main`에서 직접 진행하지 않는다.
2. 기본 기준점은 `origin/main`으로 잡는다.
3. 사람이 다른 기준점을 명시하면 그 기준점에서 branch/worktree를 만든다.
4. branch 이름은 기본적으로 `<issue-number>-<short-kebab-summary>` suffix를 사용한다.
5. tool이 prefix를 붙이면 유지할 수 있다. 예: `codex/18-agent-control-plane-v2`
6. 현재 작업 세션의 변경이 다른 세션과 섞이지 않게 분리한다.
7. project-local worktree는 `.worktrees/` 아래에 두고, 해당 경로가 Git에 기록되지 않도록 한다.

## 완료 조건

- 현재 작업이 전용 branch/worktree에서 진행된다.
- 이후 구현과 리뷰가 이 격리된 작업 단위 안에서 이뤄질 수 있다.
