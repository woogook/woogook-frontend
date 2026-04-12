# Codex Entry Adapter

`.codex/`는 thin adapter다. 이 파일은 Codex가 공통 진입 경로로 연결될 때 필요한 최소 규칙만 담는다.

## 읽는 순서

1. `AGENTS.md`를 읽는다.
2. `glossary.md`를 읽는다.
3. 요청이 `프로젝트 관련 작업`이면 `.agents/README.md`를 읽는다.
4. 필요할 때만 `.agents/entry/*.md`, `.agents/workflows/*.md`, `.agents/contracts/common.yaml`을 읽는다.

## 어댑터 원칙

- source of truth는 `AGENTS.md`, `glossary.md`, `.agents/`, `docs/`다.
- `.codex/`는 공통 계약을 우회하지 않는다.
- 프로젝트 관련 turn이면 `.agents/README.md`가 정의한 session-scoped turn-flow observability 규약을 따른다.
- Codex 경로의 canonical observability caller는 `scripts/codex_turn_flow_observability.py`다.
- Codex의 project-local hook wiring은 `.codex/config.toml`과 `.codex/hooks.json`이 담당한다.
- automatic invocation은 trusted checkout에서 Codex가 project config를 로드할 때 이 project-local hook wiring으로 연결된다.
- hook runner는 `scripts/codex_turn_flow_hooks.py`이고, 이 runner가 `scripts/codex_turn_flow_observability.py`를 호출한다.
- `.codex/hooks.json`의 command는 shell-specific `$(...)` expansion에 의존하지 않고, 현재 `cwd`에서 git root를 찾아 runner를 실행한다.
- automatic hook path의 `session_key` source of truth는 hook stdin의 `session_id`다.
- `scripts/codex_turn_flow_observability.py`는 non-hook/manual 경로에서 explicit `--session-key` 또는 `CODEX_THREAD_ID` fallback을 맡고, low-level `scripts/turn_flow_observability.py` CLI를 직접 조립하지 않는다.
- `UserPromptSubmit` hook는 turn 시작 시 `start-turn`과 initial `record-stage`를 맡는다.
- `Stop` hook는 single-hook setup에서는 즉시 `record-stage`와 `finalize-turn`을 맡는다.
- multi-hook setup에서는 current turn을 먼저 detach한 뒤 deferred finalize로 요약을 마무리해 다음 `UserPromptSubmit`과 artifact가 섞이지 않게 한다.
- hook가 사용할 stage intent는 prompt 기반 best-effort classification이며, 공통 surface는 계속 `start-turn`, `record-stage`, `finalize-turn`이다.
- 추가 문서는 `.agents/README.md`가 지시하는 경로만 읽는다.
