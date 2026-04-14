# Frontend Observability Local Runbook

- 문서 유형: `runbook`
- 소유 도메인: `common`
- 상태: `draft`
- 최종 갱신일: `2026-04-14`

## 목적

- `woogook-frontend`의 로컬 observability stack(관측 스택)을 처음 실행하는 사람도 이 문서만 보고 따라갈 수 있게 한다.
- `frontend 앱 실행 -> 로그/메트릭 적재 -> Grafana 조회 -> alert 발화 -> Discord 확인`까지 한 번에 점검할 수 있게 한다.

## 이 문서로 확인하는 범위

- frontend 앱이 로컬에서 실행되는가
- `.logs/frontend/YYYY-MM-DD/*.ndjson` 파일 로그가 남는가
- Loki에 로그가 들어가는가
- Prometheus가 `/api/observability/metrics`를 scrape(수집)하는가
- Grafana dashboard(대시보드)와 alert rule이 자동으로 provisioning(사전 구성)되는가
- synthetic error(합성 오류) 스크립트로 alert를 실제로 발화시킬 수 있는가
- Discord webhook이 유효할 때 alert가 실제 채널까지 도달하는가

## 구성 요소

- frontend 앱: `http://localhost:3000`
- Grafana: `http://localhost:3001`
- Loki: `http://localhost:3100`
- Prometheus: `http://localhost:9090`

## 사전 준비

### 필요한 도구

- `Docker Desktop` 또는 `Docker Engine + Docker Compose`
- `Node.js`와 `npm`
- 권장 Node.js 버전:
  - [`.nvmrc`](/Users/eric/dev/upstage/woogook/woogook-frontend/.worktrees/31-frontend-observability-single-env-poc/.nvmrc) 기준 `22.22.2`
- 최소 Node.js 버전:
  - `20.9.0`
- 선택 사항:
  - `python3`
    - JSON 출력을 보기 좋게 정리할 때 사용한다.
  - 실제 `Discord webhook URL`
    - Discord alert를 진짜로 확인할 때 필요하다.

### 권장 터미널 구성

- 터미널 1:
  - frontend 앱 실행용
- 터미널 2:
  - observability stack 실행용
- 터미널 3:
  - health check(상태 점검), synthetic error, Grafana/Prometheus/Loki 확인용

### 예상 소요 시간

- 처음 세팅:
  - 약 10분 ~ 20분
- 이미 이미지가 내려받아진 상태:
  - 약 5분 내외

## 0. 저장소 준비

### 0-1. 저장소 루트로 이동

```bash
cd /Users/eric/dev/upstage/woogook/woogook-frontend
pwd
```

기대 결과:

- 현재 경로가 `.../woogook-frontend`로 보인다.

### 0-2. 의존성 설치

```bash
nvm use
npm install
```

기대 결과:

- `added`, `up to date`, `audited` 같은 설치 로그가 보인다.
- 오류 없이 종료된다.

## 1. root `/.env` 준비

### 1-1. `.env.example`를 복사해 `.env` 생성

```bash
test -f .env || cp .env.example .env
```

이미 `/.env`가 있다면 덮어쓰지 말고, `/.env.example`의 observability 관련 항목 전체를 같은 값으로 맞춘다.

설명:

- `/.env.example`는 tracked canonical example(기준 예시 파일)이다.
- `/.env`는 각 개발자 로컬에서만 쓰는 실제 실행 파일이자 single source of truth(단일 기준 원본)다.
- `WOOGOOK_OBSERVABILITY_ENV=local`
  - local 모드로 동작하게 한다.
- `WOOGOOK_OBSERVABILITY_RELEASE=local-dev`
  - release label(릴리스 라벨) 기본값이다.
- `WOOGOOK_OBSERVABILITY_LOCAL_ROOT_DIR=.logs/frontend`
  - 날짜별 `.ndjson` 파일 로그가 쌓일 루트 디렉터리다.
- `WOOGOOK_OBSERVABILITY_WRITE_LOCAL_FILES=true`
  - local 파일 기록을 켠다.
- `WOOGOOK_OBSERVABILITY_ROTATE_BYTES=52428800`
  - 로그 파일 1개의 최대 크기다.
- `WOOGOOK_OBSERVABILITY_RETENTION_DAYS=14`
  - 오래된 날짜별 로그 디렉터리를 정리할 기준 일수다.
- `WOOGOOK_OBSERVABILITY_LOCAL_MIRROR_TO_CLOUD=true`
  - 로컬 파일에만 쓰지 않고 Loki에도 같은 이벤트를 보낸다.
- `WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL`
  - frontend 앱이 Loki로 로그를 보낼 주소다.
- `WOOGOOK_OBSERVABILITY_LOKI_QUERY_URL`
  - analyzer 또는 수동 조회 시 Loki query endpoint로 사용된다.
- `WOOGOOK_OBSERVABILITY_DISCORD_WEBHOOK_URL`, `WOOGOOK_OBSERVABILITY_LLM_WEBHOOK_URL`
  - analyzer outbound(외부 전송)를 따로 검증할 때만 채우면 된다.
- `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD`
  - Grafana 로그인 계정이다.
- `GRAFANA_ALERTS_DISCORD_WEBHOOK_URL`
  - 실제 Discord alert를 받고 싶다면 반드시 진짜 webhook으로 바꿔야 한다.
  - 비워 두면 stack은 올라오지만 Discord 전송은 실패한다.
- `FRONTEND_METRICS_TARGET`
  - Docker 안의 Prometheus가 호스트에서 실행 중인 frontend 앱의 metrics endpoint를 수집할 때 사용한다.

### 1-2. root `/.env` 확인

```bash
cat .env
```

기대 결과:

- `WOOGOOK_OBSERVABILITY_...`와 `GRAFANA_...` 항목이 함께 보인다.

### 1-3. `.env.local`이 남아 있지 않은지 확인

`Next.js`는 `.env.local`이 있으면 `.env`보다 우선 적용한다.
예전 설정이 남아 있으면 이 runbook의 값이 적용되지 않을 수 있다.

```bash
test ! -f .env.local || echo ".env.local exists and overrides .env. Remove it or keep the two files in sync."
```

기대 결과:

- 아무 출력이 없으면 가장 안전하다.
- 경고 문구가 보이면 `.env.local` 값을 확인하거나 파일을 치워야 한다.

## 2. generated stack env 확인

### 2-1. sync helper 실행

```bash
npm run observability:stack:sync-env
```

기대 결과:

- `synced stack env: .../ops/observability/.env (source: .../.env)`
- 또는 root `/.env`가 없을 때는 `source: .../.env.example`

같은 메시지가 보인다.

### 2-2. 생성된 stack env 확인

```bash
cat ops/observability/.env
```

기대 결과:

- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`
- `GRAFANA_ALERTS_DISCORD_WEBHOOK_URL`
- `FRONTEND_METRICS_TARGET`

네 줄만 보인다.

설명:

- `ops/observability/.env`는 사람이 직접 편집하는 파일이 아니다.
- `npm run observability:stack:sync-env`, `observability:stack:config`, `up`, `down`이 실행될 때마다 다시 생성된다.

### 2-3. 임시 실행만 하고 싶을 때

`/.env`를 만들고 싶지 않다면, frontend 실행 시 아래처럼 inline env(인라인 환경변수)로 넣어도 된다.

```bash
env \
  WOOGOOK_OBSERVABILITY_ENV=local \
  WOOGOOK_OBSERVABILITY_LOCAL_MIRROR_TO_CLOUD=true \
  WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL=http://localhost:3100/loki/api/v1/push \
  WOOGOOK_OBSERVABILITY_LOKI_QUERY_URL=http://localhost:3100/loki/api/v1/query_range \
  npm run dev
```

이 runbook에서는 root `/.env` 기준 방식을 설명하고, `ops/observability/.env`는 generated mirror(생성 미러 파일)로 취급한다.

## 3. observability stack 설정 검사

### 3-1. compose 설정이 유효한지 확인

```bash
npm run observability:stack:config
```

기대 결과:

- `docker compose ... config` 결과가 출력된다.
- 마지막에 오류 없이 종료된다.

오류가 난다면 먼저 확인할 항목:

- `ops/observability/.env` 파일이 실제로 존재하는가
- `npm run observability:stack:sync-env`가 먼저 성공했는가
- YAML 문법이 깨지지 않았는가
- Docker Desktop 또는 Docker Engine이 실행 중인가

## 4. observability stack 실행

### 4-1. 터미널 2에서 stack 실행

```bash
npm run observability:stack:up
```

기대 결과:

- `grafana`, `loki`, `prometheus` 컨테이너가 생성되고 시작된다.

### 4-2. 컨테이너 상태 확인

```bash
docker compose -f ops/observability/docker-compose.yml --env-file ops/observability/.env ps
```

기대 결과:

- `grafana`, `loki`, `prometheus`가 모두 `Up` 상태로 보인다.

예시:

```text
NAME                                          STATUS
woogook-frontend-observability-grafana-1      Up ...
woogook-frontend-observability-loki-1         Up ...
woogook-frontend-observability-prometheus-1   Up ...
```

### 4-3. 중단 또는 정리

stack을 완전히 내릴 때는 아래 명령을 쓴다.

```bash
npm run observability:stack:down
```

## 5. frontend 앱 실행

### 5-1. 터미널 1에서 frontend 실행

```bash
npm run dev
```

기대 결과:

- `http://localhost:3000`이 local 주소로 표시된다.
- 오류 없이 개발 서버가 올라온다.

예시:

```text
▲ Next.js ...
- Local:         http://localhost:3000
✓ Ready ...
```

### 5-2. 브라우저에서 앱 열기

- 브라우저에서 `http://localhost:3000`을 연다.
- 메인 페이지가 보이면 일단 frontend 서버는 정상이다.

## 6. 기본 상태 점검

### 6-1. 터미널 3에서 health check 실행

```bash
npm run observability:health-check
```

기대 결과:

- 아래와 비슷한 출력이 보인다.

```text
observability health check ok
- frontend: http://127.0.0.1:3000
- grafana: http://127.0.0.1:3001
- loki: http://127.0.0.1:3100
- prometheus: http://127.0.0.1:9090
```

### 6-2. health check가 실패하면 바로 볼 로그

Grafana 로그:

```bash
docker compose -f ops/observability/docker-compose.yml --env-file ops/observability/.env logs grafana --tail=100
```

Prometheus 로그:

```bash
docker compose -f ops/observability/docker-compose.yml --env-file ops/observability/.env logs prometheus --tail=100
```

Loki 로그:

```bash
docker compose -f ops/observability/docker-compose.yml --env-file ops/observability/.env logs loki --tail=100
```

## 7. Grafana 접속과 기본 화면 확인

### 7-1. Grafana 로그인

- 주소:
  - `http://localhost:3001`
- 계정:
  - root `/.env`에 넣은 `GRAFANA_ADMIN_USER`
  - root `/.env`에 넣은 `GRAFANA_ADMIN_PASSWORD`

### 7-2. dashboard가 보이는지 확인

아래 주소를 브라우저에 직접 열어도 된다.

- `http://localhost:3001/d/frontend-observability/frontend-observability`

확인 항목:

- `Frontend Observability` dashboard가 열린다.
- request total, p95 latency, browser error, server error 관련 패널이 보인다.

### 7-3. datasource(데이터소스)가 provisioning(사전 구성)됐는지 확인

브라우저 대신 CLI로 확인하려면:

```bash
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin

curl -su "${GRAFANA_USER}:${GRAFANA_PASSWORD}" \
  http://127.0.0.1:3001/api/datasources \
  | python3 -m json.tool
```

기대 결과:

- `Prometheus`
- `Loki`

위 두 datasource(데이터소스)가 JSON 배열 안에 보인다.

`python3`가 없다면 마지막 `| python3 -m json.tool`은 생략해도 된다.

## 8. synthetic error로 alert 발화시키기

이 단계부터 실제 observability 데이터가 빠르게 쌓이기 시작한다.

### 8-1. browser error 발생

```bash
npm run observability:emit-browser-error
```

기대 결과:

- 아래와 비슷한 출력이 보인다.

```text
synthetic browser error emitted
- target: http://127.0.0.1:3000/api/observability/browser-events
- attempts: 2
- accepted: 1
- correlation_id (선택적 추적 ID): ...
- 사용 시점: 같은 event를 Grafana, Loki, local log file에서 추적할 때만 사용
```

설명:

- 이 스크립트는 alert rule의 `increase(...[2m])`가 바로 잡히도록 2회 전송한다.
- `correlation_id`는 성공/실패 판단 기준이 아니다.
- 같은 synthetic event를 `Grafana`, `Loki`, `.logs/frontend/.../*.ndjson`에서 역추적할 때만 사용하면 된다.

### 8-2. API 5xx 발생

```bash
npm run observability:emit-api-5xx
```

기대 결과:

- 아래와 비슷한 출력이 보인다.

```text
synthetic api 5xx emitted
- target: http://127.0.0.1:3000/api/observability/dev/fail?status=503...
- attempts: 2
- status: 503
- correlation_id (선택적 추적 ID): ...
- 사용 시점: 같은 event를 Grafana, Loki, local log file에서 추적할 때만 사용
```

설명:

- `correlation_id`는 성공/실패 판단 기준이 아니다.
- API 5xx alert를 `server.ndjson`, `Loki`, `Grafana alert`와 연결해 보고 싶을 때만 사용하면 된다.

### 8-3. alert evaluation(평가) 시간 기다리기

Grafana rule interval이 짧게 잡혀 있지만, 안정적으로 보려면 20초 정도 기다린다.

```bash
sleep 20
```

## 9. 로컬 파일 로그 확인

### 9-1. 로그 파일이 생성됐는지 확인

```bash
LOG_DAY=$(date +%F)

find .logs/frontend -maxdepth 2 -type f | sort
```

기대 결과:

- `.logs/frontend/YYYY-MM-DD/browser.ndjson`
- `.logs/frontend/YYYY-MM-DD/server.ndjson`

같은 파일이 보인다.

### 9-2. browser 로그 확인

```bash
tail -n 5 ".logs/frontend/${LOG_DAY}/browser.ndjson"
```

기대 결과:

- `signalType":"browser_error"`
- `component":"browser"`

같은 필드가 포함된 JSON line이 보인다.

### 9-3. server 로그 확인

```bash
tail -n 5 ".logs/frontend/${LOG_DAY}/server.ndjson"
```

기대 결과:

- `signalType":"server_error"`
- `route":"observability/dev/fail"`
- `httpStatus":503`

같은 필드가 포함된 JSON line이 보인다.

## 10. Prometheus에서 메트릭 확인

### 10-1. raw metrics endpoint 확인

```bash
curl -s http://127.0.0.1:3000/api/observability/metrics \
  | grep -E 'woogook_frontend_(request_total|browser_event_total)'
```

기대 결과:

- `woogook_frontend_request_total`
- `woogook_frontend_browser_event_total`

두 metric 이름이 보인다.

### 10-2. browser error 증가량 확인

```bash
curl -s 'http://127.0.0.1:9090/api/v1/query?query=sum(increase(woogook_frontend_browser_event_total%7Bsignal_type%3D%22browser_error%22%7D%5B2m%5D))' \
  | python3 -m json.tool
```

기대 결과:

- `result` 배열 안에 값이 들어 있다.
- 값이 `0`보다 크면 synthetic browser error가 수집된 것이다.

### 10-3. API 5xx 증가량 확인

```bash
curl -s 'http://127.0.0.1:9090/api/v1/query?query=sum(increase(woogook_frontend_request_total%7Bstatus%3D~%225..%22%7D%5B2m%5D))' \
  | python3 -m json.tool
```

기대 결과:

- `result` 배열 안에 값이 들어 있다.
- 값이 `0`보다 크면 synthetic API 5xx가 수집된 것이다.

### 10-4. Prometheus UI에서 직접 보기

- 주소:
  - `http://localhost:9090/graph`

붙여 넣을 쿼리:

```promql
sum(increase(woogook_frontend_browser_event_total{signal_type="browser_error"}[2m]))
```

```promql
sum(increase(woogook_frontend_request_total{status=~"5.."}[2m]))
```

## 11. Loki에서 로그 확인

### 11-1. Grafana Explore에서 확인하는 방법

- Grafana 왼쪽 메뉴에서 `Explore`로 이동한다.
- datasource로 `Loki`를 선택한다.
- 아래 쿼리를 실행한다.

```logql
{service="woogook-frontend"}
```

더 좁혀서 보려면:

```logql
{service="woogook-frontend", signal_type="browser_error"}
```

```logql
{service="woogook-frontend", signal_type="server_error"}
```

기대 결과:

- synthetic browser error 로그
- `observability/dev/fail` 503 서버 오류 로그

가 보인다.

### 11-2. CLI로 확인하는 방법

최근 10분 로그를 CLI로 보려면:

```bash
START_NS=$(python3 - <<'PY'
import time
print(int((time.time() - 600) * 1_000_000_000))
PY
)

curl -Gs 'http://127.0.0.1:3100/loki/api/v1/query_range' \
  --data-urlencode 'query={service="woogook-frontend"}' \
  --data-urlencode "start=${START_NS}" \
  --data-urlencode 'limit=20' \
  | python3 -m json.tool
```

기대 결과:

- `browser`
- `next-api`
- `browser_error`
- `server_error`

같은 label(라벨)이나 로그 line이 보인다.

## 12. Grafana alert 상태 확인

### 12-1. UI에서 확인

Grafana에서 아래 메뉴를 본다.

- `Alerts & IRM`
- `Alert rules`

기대 결과:

- `FrontendBrowserErrorDetected`
- `FrontendApi5xxDetected`

두 rule이 보인다.

synthetic error 직후에는 `Firing` 상태가 되는 것이 정상이다.

### 12-2. CLI에서 확인

```bash
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin

curl -su "${GRAFANA_USER}:${GRAFANA_PASSWORD}" \
  http://127.0.0.1:3001/api/prometheus/grafana/api/v1/rules \
  | python3 -m json.tool
```

기대 결과:

- `FrontendBrowserErrorDetected`
- `FrontendApi5xxDetected`
- `state: "firing"`

같은 값이 JSON 안에 보인다.

## 13. Discord alert 확인

### 13-1. 실제 webhook을 넣은 경우

확인 항목:

- Discord 채널에 alert 메시지가 도착하는가
- browser error와 API 5xx가 각각 별도 alert로 보이는가

### 13-2. placeholder(예시값)를 넣은 경우

현재 값이 아래와 비슷하다면:

```text
https://discord.invalid/replace-me
```

예상 결과:

- Grafana는 notifier(알림 전송기) 호출을 시도한다.
- 실제 Discord 채널 전송은 실패한다.

실패 로그 확인:

```bash
docker compose -f ops/observability/docker-compose.yml --env-file ops/observability/.env logs grafana --tail=200 \
  | grep -E 'Notify for alerts failed|discord'
```

기대 결과:

- `Notify for alerts failed`
- `discord.invalid`

같은 문자열이 보이면 placeholder(예시값) 때문에 실패한 것이다.

## 14. 빠른 문제 해결

### 14-1. `npm run observability:health-check`가 실패함

확인 순서:

1. frontend 앱이 실제로 떠 있는지 확인

```bash
curl -i http://127.0.0.1:3000/api/observability/metrics
```

2. Grafana 상태 확인

```bash
curl -i http://127.0.0.1:3001/api/health
```

3. Prometheus readiness 확인

```bash
curl -i http://127.0.0.1:9090/-/ready
```

4. Loki readiness 확인

```bash
curl -i http://127.0.0.1:3100/ready
```

### 14-2. Grafana dashboard가 비어 있음

확인 순서:

1. frontend env가 실제로 적용됐는지 확인

```bash
cat .env
```

추가 확인:

```bash
test ! -f .env.local || echo ".env.local exists and may override .env"
```

2. metrics endpoint에 값이 있는지 확인

```bash
curl -s http://127.0.0.1:3000/api/observability/metrics \
  | grep woogook_frontend
```

3. Prometheus target이 `up`인지 확인

```bash
curl -s http://127.0.0.1:9090/api/v1/targets | python3 -m json.tool
```

### 14-3. Prometheus target이 `down`임

확인 순서:

- frontend 앱이 `3000` 포트에서 실행 중인가
- Docker에서 `host.docker.internal`이 해석되는가
- root `/.env`의 `FRONTEND_METRICS_TARGET` 값이 맞는가
- generated `ops/observability/.env`에도 같은 값이 들어갔는가

Prometheus 로그 확인:

```bash
docker compose -f ops/observability/docker-compose.yml --env-file ops/observability/.env logs prometheus --tail=200
```

### 14-4. Loki에는 로그가 없고 파일 로그만 남음

확인 순서:

1. `.env`에 아래 값이 있는지 확인

```text
WOOGOOK_OBSERVABILITY_LOCAL_MIRROR_TO_CLOUD=true
WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL=http://localhost:3100/loki/api/v1/push
```

2. `.env.local`이 남아 있다면 같은 값으로 맞췄는지 확인
3. frontend를 재시작했는지 확인
4. synthetic error를 다시 발생시켰는지 확인

### 14-5. Discord alert가 오지 않음

확인 순서:

- `GRAFANA_ALERTS_DISCORD_WEBHOOK_URL`이 placeholder가 아닌가
- synthetic error 후 최소 20초 이상 기다렸는가
- Grafana alert rule이 `Firing` 상태까지 올라왔는가
- Grafana 로그에 notifier 실패가 찍히는가

## 15. 정리와 종료

### 15-1. frontend 종료

- frontend를 띄운 터미널에서 `Ctrl+C`

### 15-2. observability stack 종료

```bash
npm run observability:stack:down
```

### 15-3. 생성된 로컬 로그만 다시 보고 싶을 때

```bash
find .logs/frontend -maxdepth 2 -type f | sort
```

이렇게 하면 오늘 남은 `browser.ndjson`, `server.ndjson`, `analyzer.ndjson`를 다시 확인할 수 있다.
