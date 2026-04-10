# Pre-Merge Workflow

## 목적

- merge 직전 상태를 최신 내용으로 정리한다.

## 입력

- 기준 GitHub Issue
- PR
- 최신 변경 내용
- 리뷰 상태

## 실행 순서

1. 최신 작업 내용을 기준으로 GitHub Issue와 PR 내용을 갱신한다.
2. merge 전에 남은 blocker가 없는지 확인한다.
3. GitHub PR merge는 `Create a merge commit`만 사용하고 `Squash and merge`와 `Rebase and merge`는 사용하지 않는다.
4. merge 직전 상태를 다시 점검하고 필요한 정리를 마친다.

## 완료 조건

- GitHub Issue와 PR이 최신 상태를 반영한다.
- GitHub PR merge 전략이 `Create a merge commit`으로 정리되어 있다.
- merge 전에 필요한 정리가 끝나 있다.
