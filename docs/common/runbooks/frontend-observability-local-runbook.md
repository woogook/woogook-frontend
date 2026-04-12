# Frontend Observability Local Runbook

- 문서 유형: `runbook`
- 소유 도메인: `common`
- 상태: `draft`
- 최종 갱신일: `2026-04-12`

## 목적

- `woogook-frontend`의 로컬 observability stack을 실제로 실행하는 절차를 정리한다.
- `frontend 앱 실행 -> Grafana 조회 -> Discord alert 확인` 경로를 재현 가능하게 만든다.

## 구성 요소

- frontend 앱: `npm run dev`
- Grafana: `http://localhost:3001`
- Loki: `http://localhost:3100`
- Prometheus: `http://localhost:9090`

## 사전 준비

- Docker Desktop 또는 Docker Engine + Docker Compose가 설치돼 있어야 한다.
- Node 의존성이 설치돼 있어야 한다.
- 실제 Discord alert를 확인하려면 Discord webhook URL이 있어야 한다.

## 1. observability stack env 준비

```bash
cp ops/observability/.env.example ops/observability/.env
```

최소 수정 항목:

- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`
- `GRAFANA_ALERTS_DISCORD_WEBHOOK_URL`

`GRAFANA_ALERTS_DISCORD_WEBHOOK_URL`이 placeholder면 Grafana stack은 올라오지만 실제 Discord 알림은 실패한다.

## 2. frontend 앱 env 준비

frontend 앱 실행 env에 아래 값을 추가한다.

```bash
WOOGOOK_OBSERVABILITY_LOCAL_MIRROR_TO_CLOUD=true
WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL=http://localhost:3100/loki/api/v1/push
WOOGOOK_OBSERVABILITY_LOKI_QUERY_URL=http://localhost:3100/loki/api/v1/query_range
```

선택 항목:

- `WOOGOOK_OBSERVABILITY_DISCORD_WEBHOOK_URL`
  - analyzer route 자체의 Discord webhook 검증용
- `WOOGOOK_OBSERVABILITY_LLM_WEBHOOK_URL`
  - analyzer route 자체의 LLM webhook 검증용

## 3. stack 구성 검증

```bash
npm run observability:stack:config
```

기대 결과:

- `docker compose config`가 exit 0으로 끝난다.

## 4. stack 기동

```bash
npm run observability:stack:up
```

중단 및 정리:

```bash
npm run observability:stack:down
```

## 5. frontend 앱 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 연다.

## 6. health check

```bash
npm run observability:health-check
```

기대 결과:

- Loki readiness OK
- Prometheus readiness OK
- Grafana health OK
- frontend metrics endpoint OK

## 7. Grafana 접속

- URL: `http://localhost:3001`
- 계정: `ops/observability/.env`에 넣은 `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD`

확인 항목:

- `Frontend Observability` dashboard가 자동으로 로드되는가
- `Prometheus`, `Loki` datasource가 provisioning돼 있는가

## 8. synthetic alert 검증

### browser error alert

```bash
npm run observability:emit-browser-error
```

기대 결과:

- `/api/observability/browser-events`가 event를 수락한다.
- synthetic script가 scrape interval을 넘겨 2회 전송한다.
- `woogook_frontend_browser_event_total{signal_type="browser_error"}`가 증가한다.
- Grafana alert `FrontendBrowserErrorDetected`가 발화한다.

### api 5xx alert

```bash
npm run observability:emit-api-5xx
```

기대 결과:

- `/api/observability/dev/fail?status=503`가 503을 반환한다.
- synthetic script가 scrape interval을 넘겨 2회 호출한다.
- `woogook_frontend_request_total{status="503"}`가 증가한다.
- Grafana alert `FrontendApi5xxDetected`가 발화한다.

## 9. Discord 확인

- Discord webhook을 실제 값으로 넣었다면 alert가 channel에 도착하는지 확인한다.
- 도착하지 않으면 Grafana Alerting UI의 contact point test 결과와 container logs를 먼저 확인한다.

## 10. 문제 해결

### Grafana는 뜨는데 dashboard가 비어 있음

- frontend 앱 env에 Loki push / query URL이 빠지지 않았는지 확인한다.
- `WOOGOOK_OBSERVABILITY_LOCAL_MIRROR_TO_CLOUD=true`가 켜져 있는지 확인한다.
- `npm run observability:health-check`에서 frontend metrics endpoint가 살아 있는지 확인한다.

### Prometheus target이 down

- frontend 앱이 실제로 `3000` 포트에서 실행 중인지 확인한다.
- Docker에서 `host.docker.internal`이 해석되는지 확인한다.

### Discord alert가 오지 않음

- `GRAFANA_ALERTS_DISCORD_WEBHOOK_URL`이 placeholder가 아닌지 확인한다.
- Grafana contact point provisioning이 정상 로드됐는지 container logs에서 확인한다.
- synthetic trigger 뒤 최소 20초 이상 rule evaluation 시간을 기다린다.
