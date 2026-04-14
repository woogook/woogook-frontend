# Post-Merge Workflow

## 먼저 적용할 GitHub 규칙

- post-merge PR 리포트 comment는 GitHub connector를 우선 사용한다.
- connector gap이나 권한 오류가 있을 때만 `gh` fallback을 사용한다.

## 목적

- merge 후 남은 branch/worktree를 정리한다.
- 코드 리뷰와 조치 결과를 한눈에 볼 수 있게 정리한다.

## 입력

- merge된 PR
- 관련 remote/local branch
- 관련 worktree
- PR의 코드 리뷰 본문과 답글

## 실행 순서

1. merge와 관련된 remote branch, local branch, worktree를 정리한다.
2. PR에 달린 코드 리뷰와 답글을 분석한다.
3. 리뷰 내용과 조치 결과를 하나의 리포트 형식으로 정리해 PR에 남긴다.
4. PR 리포트 comment 작성에는 위 GitHub 도구 우선순위를 따른다.

## 완료 조건

- merge 후 정리 대상이 모두 정리되어 있다.
- 코드 리뷰와 조치 결과를 한눈에 볼 수 있는 리포트가 남아 있다.
