# local-council detail contract parity

## 배경

- frontend detail 화면은 `summary.explanation_lines`와 `source_contract_summary` 일부만 읽고 있었다.
- backend `#458/#460/#461` 기준 현재 계약은 `evidence`, `diagnostics.quality_signals`, `spot_check.huboid`, `freshness.lineage/staleness_bucket/explanation`까지 detail에서 확인 가능해야 한다.
- 강동구 sample fixture도 아직 `council_slug + member_source_docid` 기반 `person_key`를 유지하고 있어 backend current key 규칙과 어긋나 있었다.

## 변경 사항

- schema 경계에 `evidence`, `quality_signals`, `huboid`, `lineage`, `staleness_bucket`, `explanation` additive field를 수용하도록 추가했다.
- detail helper가 아래 정보를 사람이 읽는 row로 정리하게 했다.
  - `quality_signals`
  - `source_contract_summary`
  - `spot_check.huboid`
- detail 화면의 `설명 가능한 진단` 섹션을 아래 하위 묶음으로 확장했다.
  - `요약 설명`
  - `근거 현황`
  - `품질 신호`
  - `출처 계약 점검`
  - `진단 설명`
  - `신선도 계보`
- 강동구 sample resolve/dossier fixture의 `basic_council person_key`를 `huboid` 우선 opaque key로 갱신했다.

## 비채택안

- `explanation_lines`를 기존처럼 하나의 bullet list로만 합쳐 보여 주는 안
  - 어떤 설명이 summary/diagnostics/freshness/source contract에서 온 것인지 구분이 약해서 채택하지 않았다.
- roster에서 person-level diagnostics를 직접 노출하는 안
  - issue `#30` 범위를 넘어가므로 채택하지 않았다.

## 검증

- `PATH="/opt/homebrew/opt/node@18/bin:$PATH" npx --yes tsx --test tests/local_council_detail.test.ts tests/local_council_proxy.test.ts`
- `PATH="/opt/homebrew/opt/node@18/bin:$PATH" npm run test:local-council-samples`
- `python3 scripts/validate_agents_harness.py`
- `git diff --check`
- `PATH="/opt/homebrew/opt/node@18/bin:$PATH" npm run lint`
  - baseline warning 1건: `src/app/components/CandidateCards.tsx`의 기존 `<img>` 경고
- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run build`
  - `node@18`는 Next.js minimum version 미달이라 build는 `node@22` 경로로 검증했다.

## 후속 메모

- `docs/superpowers/plans/2026-04-11-local-council-member-address-roster-detail-implementation-plan.md`의 old sample key 예시는 이번 구현 이후 stale 상태다.
- 이 구현은 detail 화면 중심 parity까지만 다루고, roster-level diagnostics surfacing은 별도 이슈로 남긴다.
