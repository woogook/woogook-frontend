# assembly/local-council observability direct llm

## 배경

- 기준 spec: `docs/superpowers/specs/2026-04-15-assembly-local-council-observability-direct-llm-design.md`
- 이번 세션 목표는 `assembly`, `local-council` 도메인에 공통 observability를 확장하고, `Grafana -> analyzer -> Upstage Solar Pro 2 -> Discord` 경로를 로컬 기준으로 닫는 것이다.
- `local-election` 도메인은 다른 세션에서 병행 수정 중이라 이번 변경 범위에서 제외한다.

## 변경 사항

- `assembly`와 `local-council`이 공통 backend proxy helper를 사용하도록 정리한다.
- analyzer는 `Upstage Solar Pro 2` direct provider adapter를 통해 incident summary를 보강한다.
- analyzer 대상 alert는 `severity=error`와 `team=frontend-observability` 기준으로 `Grafana`에서 analyzer webhook으로 라우팅한다.
- analyzer는 최종 summary를 `Discord` webhook으로 전송한다.
- root `/.env.example`, local stack sync script, runbook, README를 direct/relay 구조에 맞게 갱신한다.

## 비채택안

- 이번 세션에서 `local-election` helper를 공통 기준면으로 일반화하는 안은 채택하지 않았다.
  - 이유: 다른 세션과 충돌 가능성이 높다.
- 이번 세션에서 `woogook-backend` relay를 추가하는 안은 채택하지 않았다.
  - 이유: 로컬 기준 end-to-end 검증을 저장소 하나에서 닫는 것이 더 중요하다.

## 검증

- focused `Vitest` suites
- `npm test`
- `npm run lint`
- `npm run observability:stack:config`

## 후속 메모

- `local-election` observability 확장은 후속 작업으로 진행한다.
- 장기적으로는 `WOOGOOK_OBSERVABILITY_LLM_MODE=relay`를 사용해 direct provider 호출을 relay 기반 구조로 이관한다.
