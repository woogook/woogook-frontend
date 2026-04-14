# Pull Request Workflow

## 먼저 적용할 GitHub 규칙

- PR 생성과 PR 본문 작성은 GitHub connector를 우선 사용한다.
- label, comment, review-adjacent metadata 같은 PR write도 connector를 우선 사용한다.
- assignee, project처럼 connector에 없는 PR metadata만 `gh` 같은 CLI 경로로 보완한다.
- 개별 metadata write 실패만으로 PR 생성 경로 전체를 CLI로 바꾸지 않는다.
- connector로 PR 생성 자체가 불가능할 때만 `gh pr create` 같은 CLI 경로를 fallback으로 사용한다.

## 목적

- 사람의 명시적 요청이 있을 때만 PR을 생성한다.

## 입력

- 기준 GitHub Issue
- 현재 branch
- 변경 요약
- 테스트 및 검증 결과

## 실행 순서

1. 사람이 PR 생성을 명시적으로 요청했는지 확인한다.
2. 요청이 있으면 현재 변경이 기준 Issue와 일치하는지 다시 확인한다.
3. PR을 생성하기 전에 commit history를 검토하고, commit squash가 필요한지 판단한 후 정리한다. 각 commit은 `.agents/workflows/commit.md` 기준을 따라야 한다.
4. PR 생성과 관련 GitHub write는 위 GitHub 도구 우선순위를 따른다.
5. CLI 경로로 PR을 만들 때 작성자가 사람 계정이면 `--assignee <creator-login>` 또는 `--assignee @me`를 함께 사용해 최대한(best-effort) 할당(assign)을 시도한다.
6. 작성자가 봇 또는 앱 계정이면 자동 할당(auto-assign)을 시도하지 않는다.
7. PR label은 아래 얕은 규칙으로만 추론하고, 저장소에 실제로 있는 label만 추가한다.
   - `docs(` 또는 `docs:` prefix이거나 문서-only 변경이면 `documentation`
   - `feat(` 또는 `feat:` prefix이면 `enhancement`
   - `fix(` 또는 `fix:` prefix이면 `bug`
   - `chore(` 또는 `chore:` prefix이면 `chore`
8. label이 저장소에 없거나 label/assignee 설정이 실패해도 PR 생성 자체는 막지 않는다. 실패 사유를 PR 본문이나 댓글에 남기지 않는다.
9. project는 저장소 정책이 명시적으로 있을 때만 추가한다. project를 추론해서 임의로 추가하지 않는다.
10. PR 제목은 기본적으로 `type(scope): 한글 요약` 형식을 사용한다.
11. PR 제목의 `type` 또는 `type(scope)`는 영어 소문자로 유지하고, 요약과 본문은 한글을 기본으로 작성한다.
12. 영어가 더 정확하거나 자연스러운 경우에만 괄호로 병기한다.
13. `closing keyword`, 경로, 명령어, GitHub 고정 문법은 원문을 유지한다.
14. PR 본문에는 아래 metadata를 남긴다.
   - 관련 이슈
   - closing keyword
   - 소유 도메인
15. PR 본문에는 아래 섹션을 반영한다.
   - 배경
   - 변경 내용
   - 리뷰 포인트
   - 문서 영향
   - 검증
   - 남은 위험 / 후속 작업
16. 기준 Issue와 PR이 서로 연결되도록 정리한다.

## 완료 조건

- 사람의 요청에 따라 PR이 생성되어 있다.
- PR 본문이 현재 변경과 검증 상태를 반영한다.
