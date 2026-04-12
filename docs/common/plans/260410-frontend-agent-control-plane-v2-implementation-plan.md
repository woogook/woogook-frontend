# Frontend Agent Control Plane v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프론트엔드 저장소에 백엔드 v2 하니스를 프론트엔드 도메인에 맞는 agent control-plane으로 적용한다.

**Architecture:** `AGENTS.md`는 top gate만 맡고, `.agents/README.md`가 도메인 entry와 workflow 라우팅을 소유한다. 검증은 Python 표준 라이브러리 기반 테스트와 `scripts/validate_agents_harness.py`로 잠그며, Codex turn-flow는 실패해도 작업을 막지 않는 adapter로 둔다.

**Tech Stack:** Markdown, YAML, Python standard library, GitHub Actions, Next.js/npm 검증

---

## Task 1: 설계와 계획 문서 추가

**Files:**
- Create: `docs/common/specs/260410-frontend-agent-control-plane-v2.md`
- Create: `docs/common/plans/260410-frontend-agent-control-plane-v2-implementation-plan.md`

- [x] **Step 1: 설계 문서를 추가한다**

Run: `test -f docs/common/specs/260410-frontend-agent-control-plane-v2.md`
Expected: exit code `0`

- [x] **Step 2: 계획 문서를 추가한다**

Run: `test -f docs/common/plans/260410-frontend-agent-control-plane-v2-implementation-plan.md`
Expected: exit code `0`

## Task 2: 하니스 검증 테스트 RED 작성

**Files:**
- Create: `tests/test_agents_docs.py`
- Create: `tests/test_agents_contract.py`
- Create: `tests/test_agents_validation.py`
- Create: `tests/test_agents_sync.py`
- Create: `tests/test_codex_turn_flow_observability.py`
- Create: `tests/test_codex_turn_flow_hooks.py`

- [x] **Step 1: `.agents` 문서 라우팅 테스트를 추가한다**

Run: `python3 -m unittest tests.test_agents_docs`
Expected: `.agents/README.md` 또는 `.codex/ENTRY.md`가 없어 실패한다.

- [x] **Step 2: contract 테스트를 추가한다**

Run: `python3 -m unittest tests.test_agents_contract`
Expected: `.agents/contracts/common.yaml`이 없어 실패한다.

- [x] **Step 3: validator와 sync 테스트를 추가한다**

Run: `python3 -m unittest tests.test_agents_validation tests.test_agents_sync`
Expected: `scripts/validate_agents_harness.py` 또는 `scripts/agents_sync.py`가 없어 실패한다.

- [x] **Step 4: Codex turn-flow 테스트를 추가한다**

Run: `python3 -m unittest tests.test_codex_turn_flow_observability tests.test_codex_turn_flow_hooks`
Expected: `scripts/codex_turn_flow_observability.py` 또는 `.codex/hooks.json`이 없어 실패한다.

## Task 3: v2 control-plane 문서 구현

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `glossary.md`
- Create: `.agents/README.md`
- Create: `.agents/contracts/common.yaml`
- Create: `.agents/entry/assembly.md`
- Create: `.agents/entry/local-election.md`
- Create: `.agents/entry/local-council.md`
- Create: `.agents/entry/common.md`
- Create: `.agents/workflows/issue.md`
- Create: `.agents/workflows/worktree.md`
- Create: `.agents/workflows/implementation.md`
- Create: `.agents/workflows/review.md`
- Create: `.agents/workflows/commit.md`
- Create: `.agents/workflows/pull-request.md`
- Create: `.agents/workflows/requested-pr-review-follow-up.md`
- Create: `.agents/workflows/pre-merge.md`
- Create: `.agents/workflows/post-merge.md`

- [x] **Step 1: top gate와 README 라우팅을 구현한다**

Run: `python3 -m unittest tests.test_agents_docs`
Expected: `.codex`와 script 관련 실패만 남는다.

- [x] **Step 2: contract와 workflow 문서를 구현한다**

Run: `python3 -m unittest tests.test_agents_contract tests.test_agents_docs`
Expected: contract와 workflow 라우팅 테스트가 통과한다.

## Task 4: GitHub template, validator, sync 구현

**Files:**
- Delete: `.github/ISSUE_TEMPLATE/llm-workflow.yml`
- Create: `.github/ISSUE_TEMPLATE/agent-task.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Modify: `.github/pull_request_template.md`
- Create: `.github/workflows/agents-harness-check.yml`
- Create: `scripts/validate_agents_harness.py`
- Create: `scripts/agents_sync.py`

- [x] **Step 1: agent-task issue template와 PR template를 구현한다**

Run: `python3 -m unittest tests.test_agents_validation`
Expected: validator script 관련 실패만 남는다.

- [x] **Step 2: validator와 sync script를 구현한다**

Run: `python3 -m unittest tests.test_agents_validation tests.test_agents_sync`
Expected: 두 테스트가 통과한다.

## Task 5: Codex adapter와 turn-flow helper 구현

**Files:**
- Create: `.codex/ENTRY.md`
- Create: `.codex/config.toml`
- Create: `.codex/hooks.json`
- Create: `.claude/ENTRY.md`
- Create: `scripts/turn_flow_observability.py`
- Create: `scripts/codex_turn_flow_observability.py`
- Create: `scripts/codex_turn_flow_hooks.py`
- Modify: `.gitignore`

- [x] **Step 1: adapter 문서를 추가한다**

Run: `python3 -m unittest tests.test_agents_docs`
Expected: turn-flow helper 관련 실패만 남는다.

- [x] **Step 2: turn-flow helper와 hook runner를 추가한다**

Run: `python3 -m unittest tests.test_codex_turn_flow_observability tests.test_codex_turn_flow_hooks`
Expected: 두 테스트가 통과한다.

- [x] **Step 3: turn-flow artifact ignore 규칙을 추가한다**

Run: `git check-ignore --quiet tmp/turn-flow-observability/active-sessions/example.json && git check-ignore --quiet tmp/turn-flow-observability/hook-state/example.json`
Expected: exit code `0`

## Task 6: legacy surface 정리와 작업 기록

**Files:**
- Delete or modify: `docs/common/canonical/llm-entry-common.md`
- Delete or modify: `docs/common/canonical/llm-workflow-harness.md`
- Delete or modify: `docs/common/codex/**`
- Delete: `scripts/llm_workflow_sync.py`
- Delete: `scripts/prepare_pr.py`
- Delete: `scripts/validate_llm_workflow.py`
- Create: `docs/common/canonical/agent-control-plane-v2-cutover-map.md`
- Create: `docs/common/notes/harness/current/harness-observability-current-status-brief.md`
- Create: `tmp/adr/260410/260410-235323-frontend-agent-control-plane-v2.md`

- [x] **Step 1: legacy 문서와 helper 경계를 정리한다**

Run: `python3 scripts/validate_agents_harness.py`
Expected: exit code `0`

- [x] **Step 2: ADR 작업 기록을 작성한다**

Run: `test -f tmp/adr/260410/260410-235323-frontend-agent-control-plane-v2.md`
Expected: exit code `0`

## Task 7: 전체 검증

**Files:**
- All changed files

- [x] **Step 1: harness 검증을 실행한다**

Run: `python3 scripts/validate_agents_harness.py`
Expected: exit code `0`

- [x] **Step 2: Python 테스트를 실행한다**

Run: `python3 -m unittest discover -s tests -p 'test_*.py'`
Expected: all tests pass

- [x] **Step 3: lint를 실행한다**

Run: `npm run lint`
Expected: exit code `0`; 기존 `CandidateCards.tsx` `<img>` warning은 남을 수 있다.

- [x] **Step 4: build를 실행한다**

Run: `npm run build`
Expected: exit code `0`; project-local worktree의 lockfile 중복 경고는 기록한다.
