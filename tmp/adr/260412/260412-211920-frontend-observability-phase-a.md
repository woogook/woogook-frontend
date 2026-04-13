# frontend observability phase a

## 배경

- 기준 이슈: `#22`
- 설계 문서: `docs/superpowers/specs/2026-04-12-frontend-observability-design.md`
- 로컬 스택 설계 문서: `docs/superpowers/specs/2026-04-12-frontend-observability-local-stack-design.md`
- 목표는 backend와 분리된 frontend 전용 observability의 Phase A를 현재 저장소 안에서 먼저 가동하는 것이다.
- `Vercel Hobby` 제약 때문에 플랫폼 로그 drain에 기대지 않고, 앱 레벨 telemetry와 metrics를 직접 심어야 한다.

## 변경 사항

- `vitest`와 `prom-client`를 추가하고 CI에 `npm run test`를 포함했다.
- `.logs/frontend/YYYY-MM-DD/*.ndjson` 로컬 로그 정책과 rotation 기반 writer를 추가했다.
- 브라우저/서버/analyzer 공통 observability envelope와 correlation id 유틸을 추가했다.
- 브라우저 bootstrap, browser ingest route, metrics endpoint, analyzer webhook route를 추가했다.
- `api-client`에 correlation id 전파와 client-side 실패 로깅을 추가했다.
- 주요 API route와 backend proxy route를 `observeRoute` helper로 감싸 request metric과 structured error logging을 추가했다.
- README와 배포 runbook에 observability endpoint와 환경변수를 문서화했다.
- `ops/observability` 아래에 `Grafana + Loki + Prometheus` 로컬 stack과 provisioning 파일을 추가했다.
- `Frontend Observability` dashboard, Discord contact point, 두 개의 alert rule을 코드로 provisioning하도록 구성했다.
- `scripts/observability/*.mjs`와 `/api/observability/dev/fail` route를 추가해 synthetic browser error / API 5xx alert를 반복 재현 가능하게 만들었다.
- 로컬 alert 검증 안정성을 위해 `Loki pattern_ingester`를 비활성화하고, Prometheus scrape interval을 `5s`, Grafana rule interval을 `10s`로 조정했다.
- synthetic trigger는 `increase(...[2m])` alert가 바로 잡히도록 scrape interval을 넘겨 2회 전송하도록 설계했다.

## 비채택안

- preview/production에서도 항상 로컬 파일 쓰기를 시도하는 안은 채택하지 않았다.
  - 이유: `Vercel` serverless 파일시스템에서 실패 지점이 되므로, 기본값은 `local` 환경에서만 파일 기록으로 제한했다.
- 모든 `info`급 page-view/request 로그를 Loki로 보내는 안은 채택하지 않았다.
  - 이유: free tier 소모가 커서 `warn/error`와 analyzer/pipeline event 중심으로 cloud 전송 기준을 줄였다.
- LLM 공급자별 SDK를 저장소에 직접 넣는 안은 채택하지 않았다.
  - 이유: 우선은 generic webhook 연동으로 두고, 공급자 선택은 후속 단계로 분리했다.

## 검증

- `npm run test`
- `npm run lint`
  - 기존 `src/app/components/CandidateCards.tsx`의 `@next/next/no-img-element` warning 1건 유지
- `npm run build`
- `npm run observability:stack:config`
- `npm run observability:health-check`
- `npm run observability:emit-browser-error`
- `npm run observability:emit-api-5xx`
- `curl http://127.0.0.1:9090/api/v1/query?...increase(woogook_frontend_browser_event_total[2m])`
  - synthetic browser error 이후 값이 `2.125...`로 증가함을 확인
- `curl http://127.0.0.1:9090/api/v1/query?...increase(woogook_frontend_request_total{status=~"5.."}[2m])`
  - synthetic API 5xx 이후 값이 `2.125...`로 증가함을 확인
- `curl http://127.0.0.1:3100/loki/api/v1/query_range?...`
  - `service="woogook-frontend"` stream에서 `browser_error`, `server_error` 로그 유입 확인
- `curl http://127.0.0.1:3001/api/prometheus/grafana/api/v1/rules`
  - `FrontendBrowserErrorDetected`, `FrontendApi5xxDetected`가 모두 `firing` 상태로 올라온 것을 확인
- `.logs/frontend/2026-04-12/browser.ndjson`, `.logs/frontend/2026-04-12/server.ndjson`
  - local NDJSON 정본이 날짜 기준 파일로 적재되는 것을 확인

## 후속 메모

- `WOOGOOK_OBSERVABILITY_LLM_WEBHOOK_URL`의 실제 LLM 공급자 연결은 후속 작업으로 분리한다.
- `EC2 frontend-observability gateway`가 준비되면 direct Loki push와 analyzer 실행 위치를 재정렬한다.
- `Vercel` worktree의 추가 lockfile warning을 없애려면 `next.config.ts`의 `turbopack.root` 정리가 필요하다.
- `ops/observability/.env`의 Discord webhook이 placeholder면 Grafana는 notifier 전송을 시도하지만 `discord.invalid` DNS 실패 로그만 남긴다. 실제 채널 수신 검증은 유효한 webhook 값으로 다시 확인해야 한다.
