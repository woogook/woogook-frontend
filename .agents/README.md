# Agent Control Plane

`.agents/`는 `woogook-frontend` 저장소의 agent control-plane이다.

## 역할

- `프로젝트 관련 작업`의 공통 읽기 순서를 정한다.
- 작업의 소유 도메인을 판단한다.
- 현재 단계에 맞는 workflow 문서로 라우팅한다.
- 필요할 때만 machine-facing contract를 읽게 한다.

## 읽기 순서

1. `glossary.md`
2. `.agents/README.md`
3. 필요 시 도메인 entry 문서
4. 현재 단계에 맞는 workflow 문서
5. 필요 시 `.agents/contracts/common.yaml`

## 소유 도메인 판단

- 작업의 소유 도메인은 `assembly`, `local-election`, `local-council`, `common` 중 하나로 판단한다.
- 세 서비스 도메인에 직접 속하지 않으면 `common`으로 본다.

## 도메인 entry

- `assembly`: `.agents/entry/assembly.md`
- `local-election`: `.agents/entry/local-election.md`
- `local-council`: `.agents/entry/local-council.md`
- `common`: `.agents/entry/common.md`

## workflow 라우팅

- GitHub Issue를 찾거나 만들 때: `.agents/workflows/issue.md`
- branch/worktree를 준비할 때: `.agents/workflows/worktree.md`
- 구현과 테스트를 진행할 때: `.agents/workflows/implementation.md`
- push 전에 리뷰와 조치를 진행할 때: `.agents/workflows/review.md`
- commit 제목과 본문, commit history를 정리할 때: `.agents/workflows/commit.md`
- PR을 생성할 때: `.agents/workflows/pull-request.md`
- 사용자가 명시적으로 요청한 PR review 후속 조치를 진행할 때: `.agents/workflows/requested-pr-review-follow-up.md`
- merge 전에 최신화와 점검을 할 때: `.agents/workflows/pre-merge.md`
- merge 후 정리를 할 때: `.agents/workflows/post-merge.md`

## 기록 원칙

- 구체적인 작업 기록은 `tmp/adr/<yymmdd>/yyMMdd-HHmmss-<주제>.md`에 남긴다.
- 작업 기록에는 `배경`, `변경 사항`, `비채택안`, `검증`, `후속 메모`를 포함한다.
- 기준 GitHub Issue가 있으면 중요한 결정과 검증 요약은 work-log 댓글에도 연결한다.

## turn-flow observability

- `scripts/turn_flow_observability.py`는 프로젝트 관련 turn에서 쓰는 best effort helper다.
- 이 helper는 메인 작업의 gate가 아니다. 기록이나 요약 생성에 실패해도 task failure를 뜻하지 않는다.
- 프로젝트 관련 turn은 session-scoped turn-flow observability 규약을 따른다.
- adapter는 `turn_id`를 직접 plumbing하지 않고 `session_key` 기준으로 turn start와 finalize를 연결한다.
- stage 경계에서는 같은 `session_key`의 active turn에 stage event를 append한다.
- stage vocabulary는 `issue`, `worktree`, `implementation`, `review`, `commit`, `push`, `pull-request`, `pre-merge`, `post-merge`다.

## 표기 원칙

- 사람이 읽는 산출물은 한글을 기본으로 작성한다.
- 영어가 더 정확하거나 자연스러운 경우에만 괄호로 병기한다.
- 이 원칙은 문서, 설명 문장, 실행 보고, GitHub Issue/PR 제목과 본문, commit 제목과 본문에 적용한다.
- code identifier, 파일 경로, 명령어, env var, schema key, machine-facing contract, GitHub 고정 문법은 이 원칙의 적용 대상이 아니다.
- Conventional Commits의 `type` 또는 `type(scope)`는 영어 소문자로 유지한다.

## contracts

- machine-facing contract가 필요할 때만 `.agents/contracts/common.yaml`을 읽는다.
