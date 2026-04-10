# frontend agent control-plane v2 적용 기록

## 배경

백엔드 `woogook-backend`는 v2 agent control-plane을 사용하고 있지만, 프론트엔드 `woogook-frontend`는 `docs/common/codex/*`와 `llm_workflow_*` helper 중심의 v1-lite 구조를 유지하고 있었다. 두 저장소의 agent workflow 기준을 맞추기 위해 프론트엔드에 맞는 v2 구조를 적용했다.

## 변경 사항

- 기준 이슈 `#18`을 생성했다.
- `codex/18-agent-control-plane-v2` 브랜치를 `.worktrees/18-agent-control-plane-v2`에 분리했다.
- `AGENTS.md`를 top gate로 재작성했다.
- `.agents/README.md`, `.agents/contracts/common.yaml`, `.agents/entry/*`, `.agents/workflows/*`를 추가했다.
- 현직 지방의원 기능 추가를 대비해 `local-council` 도메인 entry와 `docs/local-council/canonical/llm-entry.md` placeholder를 추가했다.
- `.codex/`, `.claude/` thin adapter와 turn-flow helper를 추가했다.
- GitHub Issue/PR template와 agents harness check CI를 추가했다.
- `scripts/agents_sync.py`, `scripts/validate_agents_harness.py`와 Python 회귀 테스트를 추가했다.
- 기존 `docs/common/codex/*`와 `llm_workflow_*` helper를 제거했다.
- pre-push review에서 Python cache ignore, 전체 도메인 옵션 검증, 도메인 canonical 라우팅, 작업 기록 규칙, 계획 완료 상태를 보강했다.

## 비채택안

- 백엔드 하니스를 그대로 복사하지 않았다. `local-council` 도메인은 프론트엔드에도 곧 필요하므로 채택했지만, 백엔드 전용 경로와 배포/환경 변수 workflow는 프론트엔드 범위와 맞지 않기 때문이다.
- 기존 `docs/common/codex/*` 구조를 호환 레이어로 유지하지 않았다. 기준면이 둘로 나뉘면 새 작업자가 어느 문서를 따라야 하는지 다시 흔들리기 때문이다.
- GitHub Issue/PR 완전 자동 동기화는 이번 범위에서 제외했다.

## 검증

- `python3 scripts/validate_agents_harness.py`: 통과
- `python3 -m unittest discover -s tests -p 'test_*.py'`: 25개 테스트 통과
- `npm run lint`: exit code 0, 기존 `src/app/components/CandidateCards.tsx` `<img>` warning 1건 유지
- `npm run build`: exit code 0, project-local worktree lockfile 중복 경고 후 빌드 성공

## 후속 메모

- project-local worktree 안에서 `npm run build`를 실행하면 부모 저장소와 worktree의 lockfile을 동시에 감지하는 Next.js 경고가 날 수 있다.
- `turn-flow` 관측성 산출물은 작업 품질 gate가 아니라 진단용 보조 기록이다.
