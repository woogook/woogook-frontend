# 배경

- `local-council` Playwright spec은 sample fallback smoke 수준까지는 자동화되어 있었지만, 실제 backend와 Postgres를 포함한 통합 경로는 수동 준비가 필요했다.
- `regions` API는 frontend Next route가 직접 Postgres를 조회하고, `local-council` API는 backend proxy를 타므로 integration E2E는 두 런타임을 함께 준비해야 한다.

# 변경 사항

- frontend 저장소에 `scripts/e2e/local-council-integration.mjs`를 추가했다.
- 이 스크립트가 `woogook-backend`를 탐색하고 `docker compose up -d postgres`, `uv run alembic upgrade head`, 최소 fixture seed, backend health check, Playwright integration spec 실행까지 연쇄 처리한다.
- `package.json`의 `e2e:integration`을 오케스트레이터로 바꾸고, raw spec 실행용 `e2e:integration:spec`을 분리했다.
- integration spec은 `공식 근거 데이터`와 fixture 이름을 확인해 sample fallback이 아니라 실제 backend 응답 경로를 검증하도록 강화했다.
- runbook에 실행 전제와 override env를 문서화했다.

# 비채택안

- frontend CI 안에서 backend 저장소까지 자동 checkout해 integration E2E를 항상 돌리는 방안은 이번 범위에서 제외했다.
- 이유는 현재 frontend 저장소 단독 CI가 sibling backend 저장소 접근을 전제로 하지 않기 때문이다.
- backend seed pipeline 전체를 재사용하는 방안도 제외했다.
- 이유는 Playwright integration용으로는 지역 select와 `local_council` 조회에 필요한 최소 fixture를 직접 넣는 편이 더 빠르고 결정적이기 때문이다.

# 검증

- 구현 후 `npm run e2e:integration`으로 실제 backend/Postgres 연동 시나리오를 재실행한다.
- 최종적으로 `npm run lint`, `npm run test`, `npm run e2e:smoke`, `npm run e2e:integration`, `npm run build` 순서로 검증한다.

# 후속 메모

- backend 저장소 접근이 CI에서 보장되면 integration job을 별도 workflow나 matrix job으로 올리는 확장이 가능하다.
