# issue #28 local-council explainable context UI 보강

## 배경

- 기준 이슈: `#28 feat(local-council): explainable diagnostics와 richer dossier context UI를 보강한다`
- 기존 상세 화면은 `summary`, `diagnostics`, `freshness` 기본 패널은 있었지만 explainability copy와 `source_contract_summary` 노출이 약했다.
- 백엔드 payload 확장 필드는 additive 형태이므로, 파싱 실패 없이 관용적으로 수용해야 했다.

## 변경 사항

- schema 경계 확장:
  - `summary/diagnostics/freshness`에 `explanation_lines`를 허용했다.
  - `summary/diagnostics/top-level`의 `source_contract_summary`를 허용했다.
- view-model 헬퍼 추가:
  - explainability line 통합/중복 제거 헬퍼 추가.
  - source contract summary 통합 헬퍼 추가(여러 위치 payload를 병합하고 더 풍부한 값을 우선).
- detail UI 보강:
  - `설명 가능한 진단` 섹션 추가.
  - `출처 계약 점검` 이슈 수와 이슈 목록 렌더링 추가.
- sample fixture, 테스트, runbook/brief 문서를 새 payload 의미에 맞춰 동기화했다.

## 비채택안

- `source_contract_summary`를 단일 위치(예: summary 전용)로만 가정하는 방안은 비채택.
  - 이유: backend additive 계약에서 위치별 제공 차이가 있을 수 있어 내구성이 낮음.
- 엄격한 nested schema 강제는 비채택.
  - 이유: backend 확장 단계에서 optional/unknown 허용이 더 안전함.

## 검증

- `npx --yes tsx --test tests/local_council_detail.test.ts tests/local_council_proxy.test.ts` 통과
- `npm run test:local-council-samples` 통과
- `npm run lint` 통과(기존 unrelated warning 1건 유지)
- `npm run build` 통과
- `python3 scripts/validate_agents_harness.py` 통과
- `python3 -m unittest -q tests.test_agents_docs` 실패(메인 브랜치에서도 동일 재현되는 기존 baseline 실패)
- `git diff --check` 통과

## 후속 메모

- `tests.test_agents_docs`의 `test_gitignore_keeps_turn_events_shareable_but_runtime_state_ignored` 실패는 본 이슈 범위 밖의 기존 상태다.
- PR 본문에 baseline 실패 재현 사실(main 동일)을 명시해 리뷰 혼선을 줄인다.
