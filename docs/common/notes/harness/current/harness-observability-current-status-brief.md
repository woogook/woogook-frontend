# 프론트엔드 하네스 및 관측성 현재 현황

- 문서 유형: `notes`
- 소유 도메인: `common`
- 상태: `active`
- 관련 이슈: `#18`
- 정본 여부: `아니오`
- 연결된 정본 문서: `docs/common/canonical/agent-control-plane-v2-cutover-map.md`
- 최종 갱신일: `2026-04-11`

## 이 문서의 역할

이 문서는 `woogook-frontend` 저장소의 agent control-plane과 turn-flow observability 적용 현황을 팀원이 빠르게 확인하기 위한 문서다.

한 줄 요약:

- 현재 하네스는 `docs/common/codex/*` 기반 v1-lite 구조가 아니라 `AGENTS.md + glossary.md + .agents/ + scripts/*agents* + turn-flow 보조 기록기`로 구성된 v2 agent control-plane이다.

## 현재 구현된 수준

### 1. v2 agent control-plane이 기준면이다

- `AGENTS.md`는 최상위 관문으로 남아 모든 요청을 `프로젝트 관련 작업`과 `그 외 작업`으로 먼저 분류한다.
- 프로젝트 관련 작업은 `glossary.md`와 `.agents/README.md`로 진입한다.
- `.agents/README.md`는 도메인 entry와 작업 흐름 문서의 읽기 순서를 소유한다.
- `.agents/entry/*.md`는 도메인별 추가 문맥만 가리킨다.
- 지원 도메인은 `assembly`, `local-election`, `local-council`, `common`이다.
- `.agents/workflows/*.md`는 `issue`, `worktree`, `implementation`, `review`, `commit`, `pull-request`, `pre-merge`, `post-merge` 같은 단계별 최소 작업 흐름을 담는다.
- `.agents/contracts/common.yaml`은 기계가 읽는 최소 계약으로 유지된다.

### 2. v1-lite helper는 제거됐다

- `docs/common/codex/*` 문서는 현재 작업 트리에 없다.
- `scripts/llm_workflow_sync.py`, `scripts/prepare_pr.py`, `scripts/validate_llm_workflow.py`는 현재 경로가 아니다.
- 이전 경로가 필요하면 Git 기록에서 확인한다.

### 3. 하네스 검증은 얇은 검증기와 CI가 맡는다

- `scripts/validate_agents_harness.py`가 필수 파일, 작업 흐름 연결, 계약 문구, 이슈/PR 템플릿 항목을 확인한다.
- `.github/workflows/agents-harness-check.yml`가 PR에서 검증기와 관련 회귀 테스트를 실행한다.

### 4. `turn-flow` 관측성은 보조 기록기로 붙어 있다

- `scripts/turn_flow_observability.py`는 `tmp/turn-flow-observability/` 아래에 대화 turn 사건과 요약을 남기는 저수준 보조 스크립트다.
- project-local worktree에서도 기본 체크아웃 기준 정본 루트에 기록하도록 설계돼 있다.
- `session_key` 기반 현재 turn 등록소를 지원하므로 adapter가 `turn_id`를 계속 들고 다니지 않아도 된다.
- `.agents/README.md`는 이 보조 스크립트를 프로젝트 관련 turn의 실패해도 본 작업을 막지 않는 규약으로 설명한다.
- `.codex/ENTRY.md`와 `.claude/ENTRY.md`는 공통 규약을 얇게 연결한다.

## 아직 아닌 것

- 지속 실행 오케스트레이터, 대기열, 재시도 감독자는 없다.
- PR 생성, 이슈 동기화, 병합 후 보고가 완전 자동화된 상태는 아니다.
- `turn-flow` 관측성은 실제 작업 품질을 보증하지 않는다. 누락된 단계를 보여 주는 진단 도구다.

## 갱신 규칙

- `.agents/`, `.codex/`, `.claude/`, `scripts/*agents*`, `scripts/*turn_flow*`, `.github/workflows/agents-harness-check.yml` 중 현재 동작이 바뀌면 이 문서를 함께 갱신한다.
- 세부 작업 흐름 규칙은 이 문서에 복제하지 않는다. 해당 규칙은 `.agents/workflows/*.md`에 둔다.
