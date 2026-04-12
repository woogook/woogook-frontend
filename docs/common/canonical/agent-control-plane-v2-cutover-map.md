# 프론트엔드 agent control-plane v2 전환표

- 문서 유형: `canonical`
- 소유 도메인: `common`
- 상태: `active`
- 관련 이슈: `#18`
- 최종 갱신일: `2026-04-11`

## 목적

프론트엔드 저장소의 agent workflow 기준면을 v2 구조로 고정한다.

## 현재 기준

- 최상위 진입점: `AGENTS.md`
- 공통 용어: `glossary.md`
- control-plane entry: `.agents/README.md`
- machine-facing contract: `.agents/contracts/common.yaml`
- workflow 문서: `.agents/workflows/*.md`
- 도메인 entry: `.agents/entry/*.md`

## 지원 도메인

- `assembly`
- `local-election`
- `local-council`
- `common`

## 이전 surface와 새 surface

| 이전 surface | 새 surface | 처리 |
| --- | --- | --- |
| `docs/common/canonical/llm-entry-common.md` | `.agents/README.md`, `.agents/entry/common.md` | 제거 |
| `docs/common/canonical/llm-workflow-harness.md` | `.agents/README.md`, `.agents/contracts/common.yaml` | 제거 |
| `docs/common/codex/workflows/*.md` | `.agents/workflows/*.md` | 제거 |
| `docs/common/codex/guides/*.md` | `.agents/workflows/commit.md`, `.agents/workflows/pull-request.md`, `.agents/workflows/pre-merge.md` | 제거 |
| `docs/common/codex/policies/documentation-policy.md` | `.agents/README.md`, 도메인별 문서 검토 | 제거 |
| `scripts/llm_workflow_sync.py` | `scripts/agents_sync.py` | 교체 |
| `scripts/prepare_pr.py` | `.github/pull_request_template.md`, `.agents/workflows/pull-request.md` | 제거 |
| `scripts/validate_llm_workflow.py` | `scripts/validate_agents_harness.py` | 교체 |
| `.github/ISSUE_TEMPLATE/llm-workflow.yml` | `.github/ISSUE_TEMPLATE/agent-task.yml` | 교체 |

## 운영 규칙

- 프로젝트 관련 작업은 기준 GitHub Issue를 먼저 정한다.
- feature 작업은 `main`이 아닌 전용 branch/worktree에서 진행한다.
- PR 생성은 사람의 명시 요청이 있을 때만 진행한다.
- merge 전략은 `Create a merge commit`을 기본으로 한다.
- 사람이 읽는 산출물은 한글 우선으로 작성한다.
- adapter와 관측성 helper는 source of truth가 아니라 보조 계층이다.
- `local-council`은 현직 지방의원 기능 추가를 대비해 control-plane에서 먼저 지원한다.

## 검증 기준

- `python3 scripts/validate_agents_harness.py`
- `python3 -m unittest discover -s tests -p 'test_*.py'`
- `npm run lint`
- 필요한 경우 `npm run build`
