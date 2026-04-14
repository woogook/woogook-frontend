# Requested PR Review Follow-Up Workflow

## 먼저 적용할 GitHub 규칙

- inline review thread reply, review comment update, top-level PR comment 같은 GitHub write는 GitHub connector를 우선 사용한다.
- unresolved thread 상태 조회(`isResolved`, `isOutdated`)와 thread resolve는 connector에 경로가 없을 때 `gh api graphql` 또는 `gh` CLI를 사용한다.
- connector에 없는 write나 connector 권한 오류, coverage gap이 있을 때만 `gh` fallback을 사용한다.

## 목적

- 사람이 명시적으로 요청한 경우에만 PR review follow-up을 진행한다.
- `review.md`와 분리된 후속 조치 규칙을 고정한다.

## 입력

- 사람의 명시적 review 처리 요청
- PR 설명
- review comment / review thread
- 관련 코드와 문서
- 테스트 및 검증 결과

## 시작 조건

- 이 workflow는 PR이 열렸거나 새 commit이 push됐다는 이유만으로 자동 시작하지 않는다.
- 사람이 PR review follow-up을 명시적으로 요청했을 때만 시작한다.

## 문서 경계

- `.agents/workflows/review.md`는 pre-push review 지침으로 유지한다.
- 이 문서는 PR이 열린 뒤, 사용자 명시 요청으로 시작되는 review follow-up만 다룬다.

## 검토 기준

- review comment 본문만 보지 말고 PR 설명, diff, 관련 코드, 기존 구현 패턴, 테스트, review thread 문맥을 함께 확인한다.
- review 의견이 타당하면 필요한 최소한의 수정만 수행한다.
- review 의견이 일부만 타당하면 타당한 부분만 반영하고, 반영하지 않은 부분은 범위 또는 근거와 함께 thread reply에 남긴다.
- review 의견이 타당하지 않거나 현재 PR 범위를 벗어나면 코드를 수정하지 않고, 그 이유를 해당 thread reply에 남긴다.

## 조치 순서

1. PR 설명, diff, 관련 코드, 테스트, review thread 문맥을 함께 확인한다.
2. review 의견의 타당성과 현재 PR 범위를 먼저 판단한다.
3. 코드나 문서가 바뀌는 경우에는 `수정 -> 검증 -> commit -> push 확인 -> thread reply` 순서를 따른다.
4. thread reply는 짧고 구체적으로 작성하되, 무엇을 반영했고 무엇을 반영하지 않았는지 분명히 적는다.
5. 코드나 문서 변경을 반영한 thread reply 마지막 줄에는 해당 조치가 포함된 최신 commit hash를 남긴다.
6. review thread reply, update, resolve, top-level comment 처리에는 위 GitHub 도구 우선순위를 따른다.

## 금지 또는 예외

- review 조치 과정에서는 범위 밖 refactoring이나 unrelated cleanup을 하지 않는다.
- 원격 branch head에 push가 반영되기 전에는 조치 완료 성격의 reply를 남기지 않는다.
- commit 또는 push를 끝내지 못했으면 review thread에는 reply하지 않고, blocker 사유를 먼저 작업 보고에 남긴다.
- 명시적 요청이 없으면 unresolved review가 남아 있어도 agent가 임의로 commit, push, thread reply, review 처리 루프를 시작하지 않는다.

## reviewer-specific follow-up

이 규칙은 각 reviewer의 inline review thread에만 적용하고, top-level PR comment나 다른 reviewer에는 적용하지 않는다.

### Gemini

- `gemini-code-assist` inline review thread에는 실질 답글을 먼저 남긴다.
- 그 답글이 기록된 뒤에만 같은 thread에 `/gemini review-comment-reply`를 추가한다.
- 두 write는 connector를 우선 사용하고, connector gap이나 권한 오류가 있을 때만 `gh` fallback을 사용한다.

### Codex

- `Codex` inline review thread에는 실질 답글을 connector를 우선 사용해 남긴 직후 바로 resolved 처리한다.
- Codex는 별도 후속 요청이 없어도 자동으로 재리뷰를 진행하므로 `/gemini review-comment-reply` 같은 추가 명령을 남기지 않는다.
- reply write나 resolved 처리용 connector 경로가 없으면 `gh api graphql` 또는 `gh` fallback으로 thread를 정리한다.

## 완료 조건

- 사용자 요청으로 시작된 PR review follow-up이 현재 범위 안에서 정리되어 있다.
- 필요한 수정은 push까지 반영되었거나, 반영하지 않은 사유가 thread reply 또는 작업 보고에 남아 있다.
