# 프런트엔드 observability 로컬 스택 설계

- 작성일: `2026-04-12`
- 소유 도메인: `common`
- 관련 문서:
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/docs/superpowers/specs/2026-04-12-frontend-observability-design.md`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/docs/common/runbooks/vercel-deployment-runbook.md`
  - `/Users/eric/dev/upstage/woogook/woogook-frontend/README.md`

## 배경

기존 Phase A 구현으로 `woogook-frontend`는 브라우저/서버/analyzer 공통 observability envelope, 로컬 NDJSON 파일 로그, Prometheus metrics endpoint, Loki/Discord/LLM webhook 연계 코드를 갖추게 됐다. 하지만 현재 저장소만으로는 `Grafana` 데이터소스 구성, 대시보드, alert rule, `Discord` contact point를 끝까지 재현할 수 없다.

이번 설계의 목적은 저장소 안에서 `frontend 앱 실행 -> Loki/Prometheus 수집 -> Grafana 조회 -> Discord alert 수신`까지 닫힌 로컬 개발 루프를 제공하는 것이다. 운영 경로는 이후 `Grafana Cloud` 또는 `EC2 gateway`로 확장하더라도, 로컬 self-hosted 스택에서 사용한 provisioning 구조와 alert 모델을 최대한 재사용한다.

## 목표

- 저장소 안에 로컬 self-hosted observability stack을 추가한다.
- `docker compose up`으로 `Grafana + Loki + Prometheus`를 띄울 수 있게 한다.
- frontend 앱을 호스트에서 `npm run dev`로 실행하면 로그와 metrics가 로컬 스택으로 유입되게 한다.
- `Grafana`에서 로그와 메트릭을 바로 조회할 수 있게 한다.
- 실제 `Discord webhook`으로 alert를 전송할 수 있게 한다.
- alert 검증 시나리오를 저장소 스크립트로 재현 가능하게 만든다.

## 비목표

- 운영 `Grafana Cloud` 계정과 실배포 환경 프로비저닝을 자동화하지 않는다.
- backend observability를 이번 로컬 스택에 포함하지 않는다.
- `LLM analyzer`를 로컬 compose 서비스로 분리하지 않는다.
- 장기 저장, HA, 멀티테넌트 같은 운영 수준 인프라 요구를 만족시키려 하지 않는다.

## 사용자 시나리오

### 시나리오 1. 로컬 로그 조회

1. 개발자가 `docker compose up -d`로 observability stack을 띄운다.
2. 개발자가 `npm run dev`로 frontend 앱을 실행한다.
3. 사용자가 페이지를 열고 브라우저 이벤트 또는 API 요청을 발생시킨다.
4. frontend 앱은 기존 observability 코드로 NDJSON 파일을 남기고, 동시에 Loki push와 metrics 노출을 수행한다.
5. 개발자는 `Grafana`에서 route별 로그와 브라우저 오류를 조회한다.

### 시나리오 2. 실제 Discord alert 검증

1. 개발자가 `.env.local` 또는 실행 env에 `WOOGOOK_OBSERVABILITY_DISCORD_WEBHOOK_URL`을 설정한다.
2. 저장소의 테스트 helper가 브라우저 오류 또는 API 5xx를 발생시킨다.
3. `Prometheus`와 `Grafana Alerting`이 임계치를 만족하는 rule을 평가한다.
4. `Grafana`는 provisioning된 `Discord contact point`로 alert를 보낸다.
5. 필요 시 같은 alert를 analyzer webhook에도 보낸다.

## 설계 원칙

1. observability 인프라 코드는 앱 코드와 분리해 `ops/observability` 아래에 둔다.
2. 로컬 개발에서 재현 가능한 것이 우선이며, 운영 수준 확장성은 후순위로 둔다.
3. 앱은 기존 direct push 방식을 유지하고, 로컬 stack은 이를 받아들이는 쪽으로 맞춘다.
4. `Grafana` 설정은 수동 클릭이 아니라 provisioning 파일로 관리한다.
5. 로컬 alert 검증은 사람이 실수 없이 반복할 수 있게 스크립트로 제공한다.

## 제안 아키텍처

### 전체 구성

- `frontend app`
  - 호스트에서 `npm run dev`로 실행
  - Loki direct push 수행
  - `/api/observability/metrics` 노출
  - `/api/observability/analyzer` 노출
- `Loki`
  - frontend 로그 수집 대상
  - 개발 환경용 single-binary 설정 사용
- `Prometheus`
  - frontend metrics scrape
  - route latency, request count, browser event count 수집
- `Grafana`
  - Loki / Prometheus datasource provisioning
  - dashboard provisioning
  - alert rule provisioning
  - `Discord contact point`와 notification policy provisioning

### 데이터 흐름

1. 브라우저 이벤트와 서버 이벤트는 기존 앱 코드로 생성된다.
2. 로컬에서는 `.logs/frontend/YYYY-MM-DD/*.ndjson` 파일이 계속 정본으로 남는다.
3. 앱은 `WOOGOOK_OBSERVABILITY_LOCAL_MIRROR_TO_CLOUD=true`일 때 Loki push endpoint로 동일 이벤트를 보낸다.
4. `Prometheus`는 frontend 앱의 `/api/observability/metrics`를 주기적으로 scrape한다.
5. `Grafana`는 `Loki`와 `Prometheus`를 datasource로 사용한다.
6. alert rule이 발화하면 `Discord`로 보내고, 선택적으로 analyzer webhook에도 전달한다.

## 저장소 구조

아래 디렉터리를 추가한다.

- `ops/observability/docker-compose.yml`
- `ops/observability/.env.example`
- `ops/observability/loki/loki-config.yml`
- `ops/observability/prometheus/prometheus.yml`
- `ops/observability/grafana/provisioning/datasources/*.yml`
- `ops/observability/grafana/provisioning/dashboards/*.yml`
- `ops/observability/grafana/provisioning/alerting/*.yml`
- `ops/observability/grafana/dashboards/*.json`
- `scripts/observability/*.mjs`
- `docs/common/runbooks/frontend-observability-local-runbook.md`

각 책임은 아래와 같다.

- `docker-compose.yml`: 로컬 stack 서비스 기동
- `loki-config.yml`: 개발용 Loki 저장소/limits 설정
- `prometheus.yml`: metrics scrape job 정의
- `grafana/provisioning/**`: datasource, dashboard, alert, contact point 코드화
- `grafana/dashboards/*.json`: route latency / error / browser event 패널
- `scripts/observability/*.mjs`: smoke test, synthetic failure, health check
- `runbook`: 실제 실행 절차와 Discord 검증 절차 문서화

## 환경변수

### frontend 앱

- `WOOGOOK_OBSERVABILITY_LOCAL_MIRROR_TO_CLOUD=true`
- `WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL=http://localhost:3100/loki/api/v1/push`
- `WOOGOOK_OBSERVABILITY_LOKI_QUERY_URL=http://localhost:3100/loki/api/v1/query_range`
- `WOOGOOK_OBSERVABILITY_DISCORD_WEBHOOK_URL=<discord webhook>`
- 필요 시 `WOOGOOK_OBSERVABILITY_LLM_WEBHOOK_URL`

### compose 스택

- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`
- `GRAFANA_ALERTS_DISCORD_WEBHOOK_URL`
- `FRONTEND_METRICS_TARGET`

`FRONTEND_METRICS_TARGET` 기본값은 `host.docker.internal:3000`으로 두고, Linux에서도 동작하도록 compose에 `extra_hosts`를 추가한다.

## Grafana provisioning 설계

### datasource

- `Prometheus`: `http://prometheus:9090`
- `Loki`: `http://loki:3100`

### dashboard

최소 패널은 아래를 포함한다.

1. route별 request total
2. route별 p95 latency
3. browser error count
4. server error 로그 스트림
5. browser error 로그 스트림
6. analyzer / pipeline event 로그 스트림

### alert rule

로컬 개발에서 검증 가능한 최소 rule만 둔다.

1. `FrontendBrowserErrorDetected`
   - 최근 2분 동안 `woogook_frontend_browser_event_total{signal_type="browser_error"}` 증가량이 1 이상
2. `FrontendApi5xxDetected`
   - 최근 2분 동안 `woogook_frontend_request_total{status=~"5.."}` 증가량이 1 이상

threshold는 로컬 검증이 쉽도록 낮게 두고, 운영 이전에는 별도 rule profile로 재조정한다.

### notification policy

- 기본 policy는 위 두 rule을 `Discord` contact point로 라우팅한다.
- 선택적으로 같은 alert를 frontend analyzer webhook에도 fan-out할 수 있게 한다.

## Discord 알림 설계

이번 범위의 “실제 Discord 알림”은 `Grafana Alerting -> Discord contact point` 경로를 의미한다.

- 알림 본문은 `Grafana` 기본 템플릿 또는 얇은 커스텀 템플릿을 사용한다.
- webhook URL은 provisioning 파일에 하드코딩하지 않고 env 치환으로 주입한다.
- webhook이 비어 있으면 stack은 올라오되 alert 전송 검증 단계에서 명확히 안내한다.

## synthetic failure 설계

사람이 브라우저에서 수동으로 오류를 재현하는 대신 스크립트를 제공한다.

최소 스크립트는 아래 두 종류다.

- `emit-browser-error`
  - 브라우저 이벤트 ingest endpoint로 `browser_error` payload를 직접 전송
- `emit-api-5xx`
  - 존재하지 않거나 실패하는 API 요청을 발생시켜 `request_total{status="500"}` 또는 `503`을 유도

스크립트는 alert 발화 이후 `Grafana`와 `Discord`에서 확인할 수 있는 명확한 출력 메시지를 제공해야 한다.

## 실행 절차

1. `ops/observability/.env.example`를 복사해 `.env`를 만든다.
2. `docker compose up -d`로 stack을 띄운다.
3. frontend 앱 env를 채우고 `npm run dev`를 실행한다.
4. `scripts/observability/health-check.mjs`로 Loki, Prometheus, Grafana 상태를 확인한다.
5. 앱을 열어 기본 page-view와 API 요청을 발생시킨다.
6. `Grafana` dashboard에서 로그/메트릭이 들어오는지 확인한다.
7. `scripts/observability/emit-browser-error.mjs` 또는 `emit-api-5xx.mjs`를 실행한다.
8. `Discord` 채널에서 alert 수신을 확인한다.

## 테스트 전략

### 자동 테스트

- provisioning 파일과 스크립트의 정적 검증
- observability helper의 기존 단위 테스트 유지
- 필요 시 smoke test로 `docker compose config` 검증

### 수동 검증

- `docker compose up -d` 성공
- Grafana login 가능
- dashboard 자동 로드
- Loki log query 성공
- Prometheus target up
- synthetic failure 후 alert 발화
- Discord 메시지 수신

## 실패 모드와 대응

### frontend 앱은 켜졌지만 Grafana에 로그가 안 보임

- Loki push URL 오설정
- 로컬 미러링 env 미설정
- compose 네트워크/포트 충돌

대응:

- runbook과 health check 스크립트로 단계별 확인

### metrics는 보이는데 alert가 안 감

- rule query 조건 미충족
- rule evaluation interval이 너무 김
- Discord webhook 누락

대응:

- synthetic script가 alert 조건을 만족하는 payload를 강하게 만들고, runbook에 확인 경로를 적는다.

### Discord는 가는데 analyzer가 실패

- 이번 설계의 성공 기준은 Discord alert 수신까지다.
- analyzer webhook은 선택적 연동으로 두고, 실패해도 Discord alert 자체는 유지한다.

## 남은 위험

- 로컬 stack은 운영 `Grafana Cloud`와 100% 동일하지 않다.
- `host.docker.internal` 의존은 플랫폼 차이가 있을 수 있으므로 Linux 보정이 필요하다.
- alert provisioning의 세부 문법은 `Grafana` 버전에 민감할 수 있으므로 compose 이미지 버전을 고정해야 한다.

## 구현 순서 제안

1. `ops/observability` 기본 compose와 설정 파일을 추가한다.
2. `Grafana` datasource와 dashboard provisioning을 붙인다.
3. `Prometheus` scrape를 실제 frontend metrics endpoint에 연결한다.
4. `Grafana alerting` provisioning과 `Discord contact point`를 붙인다.
5. synthetic failure 스크립트와 runbook을 추가한다.
6. 로컬에서 실제 `Grafana` 조회와 `Discord` alert를 검증한다.
