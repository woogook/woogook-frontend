# Issue Workflow

## 먼저 적용할 GitHub 규칙

- GitHub Issue 생성 경로가 있으면 GitHub connector를 우선 사용한다.
- assignee처럼 connector에 없는 Issue metadata는 `gh` 같은 CLI 경로로 보완한다.
- 현재 tool surface에 Issue 생성용 connector write가 없을 때만 `gh issue create` 같은 CLI 경로를 사용한다.
- CLI fallback을 쓰더라도 할당(assign) 실패는 Issue 생성 자체를 막지 않는다.

## 목적

- 현재 작업의 기준 GitHub Issue를 정한다.
- 기존 이슈를 재사용할지 새 이슈를 만들지 판단한다.

## 입력

- 사람의 요구사항
- 관련 open/closed GitHub Issue
- 관련 PR
- 작업 범위와 비범위
- 필요한 문서 변경 여부

## 실행 순서

1. 현재 요청과 같은 목표와 범위를 가진 기존 open Issue가 있는지 확인한다.
2. 열린 이슈만으로 부족하면 관련 closed Issue와 PR을 함께 확인한다.
3. 기존 이슈가 현재 작업의 기준으로 충분하면 그 이슈를 재사용한다.
4. 그렇지 않으면 새 Issue를 만든다.
5. 기준 Issue에는 아래 최소 metadata를 남긴다.
   - 배경
   - 목표
   - 소유 도메인
   - 범위
   - 비범위
   - 작업 체크리스트
   - 검증
   - 문서 영향
   - 필요 시 참고 자료
6. 새 Issue 생성과 관련 GitHub write는 위 GitHub 도구 우선순위를 따른다.
7. CLI를 통해 할당(assign)을 시도할 때, 작성자가 사람 계정일 때 `--assignee <creator-login>`을 함께 사용해 최대한(best-effort) 할당(assign)을 시도한다.
8. 작성자가 봇 또는 앱 계정이면 자동 할당(auto-assign)을 시도하지 않는다.
9. 할당(assign)이 실패해도 Issue 생성 자체는 막지 않고, 실패 사유를 Issue 본문이나 댓글에 남기지 않는다.
10. Issue 제목과 본문은 한글을 기본으로 작성한다.
11. 영어가 더 정확하거나 자연스러운 경우에만 괄호로 병기한다.
12. label, 링크, 경로, 명령어 같은 literal은 원문을 유지한다.

## 완료 조건

- 현재 작업의 기준 GitHub Issue가 하나로 정해져 있다.
- 이후 기록과 판단을 모두 이 이슈에 연결할 수 있다.
