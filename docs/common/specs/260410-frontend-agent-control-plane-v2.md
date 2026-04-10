# 프론트엔드 agent control-plane v2 적용 설계

- 문서 유형: `specs`
- 소유 도메인: `common`
- 상태: `active`
- 관련 이슈: `#18`
- 정본 여부: `아니오`
- 최종 갱신일: `2026-04-11`

## 배경

백엔드 `woogook-backend`는 현재 `AGENTS.md + glossary.md + .agents/` 중심의 v2 agent control-plane을 사용한다. 반면 프론트엔드 `woogook-frontend`는 `docs/common/codex/*`와 `scripts/llm_workflow_*` helper 중심의 v1-lite 구조를 사용한다.

두 저장소가 같은 팀 workflow를 공유하려면 프론트엔드도 백엔드의 최신 구조를 따르되, 백엔드 전용 배포와 환경 변수 검증은 가져오지 않아야 한다.

## 목표

- 프론트엔드 작업 진입점을 `AGENTS.md -> glossary.md -> .agents/README.md`로 단순화한다.
- `.agents/` 아래에 도메인 entry, workflow 문서, machine-facing contract를 둔다.
- 기존 `docs/common/codex/*`와 `llm_workflow_*` helper는 제거하고, 전환표에 대체 경로를 남긴다.
- GitHub Issue/PR template와 하니스 검증 스크립트가 v2 기준을 강제한다.
- Codex adapter와 turn-flow observability는 작업 실패를 만들지 않는 best effort 보조 기록기로만 붙인다.

## 비목표

- 제품 UI, API route, 데이터 접근 코드 변경
- 백엔드 배포 workflow 또는 backend dotenv 검증 이식
- GitHub Issue/PR 완전 자동 동기화 구현
- 외부 observability 서비스 도입

## 설계

### 1. top gate와 control-plane 분리

`AGENTS.md`는 최상위 관문만 맡는다. 프로젝트 관련 작업이면 `glossary.md`와 `.agents/README.md`로 라우팅하고, 세부 단계 문서는 `.agents/README.md`가 소유한다.

`.agents/README.md`는 사람과 agent가 공통으로 읽는 control-plane entry다. 여기에는 읽기 순서, 소유 도메인 판단, workflow 라우팅, 작업 기록 규칙, 한글 우선 표기 원칙, turn-flow observability 경계를 둔다.

### 2. 도메인 entry

프론트엔드 도메인은 `assembly`, `local-election`, `local-council`, `common` 네 개다. `local-council`은 현직 지방의원 기능이 곧 추가될 예정이므로 이번 control-plane에서 먼저 1급 도메인으로 둔다.

- `assembly`: `docs/assembly/canonical/llm-entry.md`와 온보딩 문서를 가리킨다.
- `local-election`: `docs/local-election/canonical/llm-entry.md`를 가리킨다.
- `local-council`: `docs/local-council/canonical/llm-entry.md`를 가리킨다.
- `common`: `docs/common/canonical/*` 중 현재 작업과 직접 관련된 문서를 가리킨다.

도메인 entry는 도메인 고유 문맥만 추가하고, 공통 workflow 규칙은 `.agents/workflows/*.md`로 모은다.

### 3. workflow 문서

백엔드 v2와 같은 단계 vocabulary를 사용한다.

- `issue`
- `worktree`
- `implementation`
- `review`
- `commit`
- `pull-request`
- `requested-pr-review-follow-up`
- `pre-merge`
- `post-merge`

프론트엔드 검증 명령은 `npm run lint`, `npm run build`, `python3 scripts/validate_agents_harness.py`를 기본으로 삼는다. 테스트 파일이 추가되면 해당 테스트 명령도 workflow와 PR 본문에 기록한다.

### 4. contract와 validator

`.agents/contracts/common.yaml`은 사람이 읽는 문서가 아니라 기계가 최소 surface를 확인하는 contract다. `scripts/validate_agents_harness.py`는 필수 파일, contract 문구, GitHub template 항목, top gate 라우팅을 검증한다.

검증 테스트는 Python 표준 라이브러리만 사용한다. 프론트엔드 저장소에는 Python dependency manager가 없으므로 CI와 로컬 명령은 `python3 -m unittest discover -s tests -p 'test_*.py'`를 기준으로 한다.

### 5. GitHub template와 sync surface

기존 `.github/ISSUE_TEMPLATE/llm-workflow.yml`은 `.github/ISSUE_TEMPLATE/agent-task.yml`로 대체한다. PR template는 관련 이슈, closing keyword, 소유 도메인, 변경 내용, 리뷰 포인트, 문서 영향, 검증을 명시한다.

`scripts/agents_sync.py`는 백엔드처럼 최소 명령 surface만 제공한다. 이번 범위에서는 `issue`, `pull-request`, `post-merge-report`가 준비됐음을 출력하는 수준으로 제한한다.

### 6. Codex adapter와 turn-flow observability

`.codex/`와 `.claude/`는 source of truth가 아니라 thin adapter다. Codex hook은 프로젝트 관련 turn의 시작과 종료를 best effort로 기록한다. 기록 실패는 본 작업 실패가 아니다.

turn-flow artifact는 `tmp/turn-flow-observability/turns/**`만 공유 가능한 산출물로 열어 두고, `active-sessions`와 `hook-state`는 실행 중 상태라 ignore한다.

## 전환 전략

1. v2 surface를 추가한다.
2. validator와 테스트로 새 surface를 고정한다.
3. `docs/common/canonical/llm-entry-common.md`, `docs/common/canonical/llm-workflow-harness.md`, `docs/common/codex/*`, `scripts/llm_workflow_*`, `scripts/prepare_pr.py`, `scripts/validate_llm_workflow.py`는 제거한다.
4. `README.md`의 작업 문서 진입 경로를 `.agents/` 기준으로 갱신한다.

## 검증 전략

- `python3 scripts/validate_agents_harness.py`
- `python3 -m unittest discover -s tests -p 'test_*.py'`
- `npm run lint`
- `npm run build`

## 위험과 완화

- 백엔드 구조를 그대로 복사하면 백엔드 전용 경로나 배포 workflow가 섞일 수 있다. 프론트엔드 contract는 `assembly`, `local-election`, `local-council`, `common`을 지원하되, 백엔드의 `docs/지방의원/**` 경로는 가져오지 않는다.
- `.worktrees/`가 저장소에 잡히면 작업 공간이 오염된다. `.gitignore`와 로컬 exclude를 모두 고려한다.
- Next build는 worktree가 부모 저장소 안에 있을 때 lockfile 중복 경고를 낼 수 있다. 이번 작업에서는 경고를 기록하고, 빌드 성공 여부와 별개로 다룬다.
