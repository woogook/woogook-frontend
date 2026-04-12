# Frontend Observability Local Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `woogook-frontend`에서 로컬 `Grafana + Loki + Prometheus` 스택과 Discord alert 검증 경로를 실제로 실행 가능한 형태로 구현한다.

**Architecture:** frontend 앱은 기존 observability 코드를 유지한 채 Loki direct push와 `/api/observability/metrics` 노출을 계속 수행한다. 저장소에는 `ops/observability` 아래 Docker Compose 기반 스택과 Grafana provisioning, synthetic failure 스크립트, runbook을 추가해 `앱 실행 -> Grafana 조회 -> alert 발화` 루프를 닫는다.

**Tech Stack:** `Docker Compose`, `Grafana`, `Loki`, `Prometheus`, `Next.js 16`, `Vitest`, `Node.js`

---

### Task 1: 스크립트 런타임과 테스트 기반 추가

**Files:**
- Modify: `vitest.config.ts`
- Create: `scripts/observability/runtime.mjs`
- Create: `scripts/observability/runtime.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: 스크립트 helper의 실패 테스트를 먼저 쓴다**

`runtime.test.mjs`에서 아래를 검증한다.

- frontend base URL 기본값은 `http://127.0.0.1:3000`
- Grafana base URL 기본값은 `http://127.0.0.1:3001`
- synthetic fail URL은 status/search params를 유지한다
- browser error payload는 `browser_error` batch 형식으로 만들어진다

- [ ] **Step 2: 테스트 include를 scripts로 넓히고 RED를 확인한다**

Run: `npm run test`
Expected: 새 `runtime.test.mjs`가 실패한다.

- [ ] **Step 3: 최소 helper 구현을 추가한다**

`runtime.mjs`에 URL 해석, JSON POST, browser error payload 생성 helper를 추가한다.

- [ ] **Step 4: GREEN을 확인한다**

Run: `npm run test`
Expected: 새 script test가 통과한다.

- [ ] **Step 5: package.json에 observability 스크립트 entry를 추가한다**

추가 대상:

- `observability:stack:config`
- `observability:stack:up`
- `observability:stack:down`
- `observability:health-check`
- `observability:emit-browser-error`
- `observability:emit-api-5xx`

### Task 2: 로컬 observability stack 파일 구현

**Files:**
- Create: `ops/observability/docker-compose.yml`
- Create: `ops/observability/.env.example`
- Create: `ops/observability/loki/loki-config.yml`
- Create: `ops/observability/prometheus/prometheus.yml`
- Create: `ops/observability/grafana/provisioning/datasources/datasources.yml`
- Create: `ops/observability/grafana/provisioning/dashboards/dashboards.yml`
- Create: `ops/observability/grafana/provisioning/alerting/contact-points.yml`
- Create: `ops/observability/grafana/provisioning/alerting/notification-policies.yml`
- Create: `ops/observability/grafana/provisioning/alerting/rules.yml`
- Create: `ops/observability/grafana/dashboards/frontend-observability.json`
- Modify: `.gitignore`

- [ ] **Step 1: compose와 env 파일을 작성한다**

서비스:

- `grafana` 포트 `3001:3000`
- `loki` 포트 `3100:3100`
- `prometheus` 포트 `9090:9090`

`extra_hosts`로 `host.docker.internal:host-gateway`를 추가하고, `.env`는 gitignore 처리한다.

- [ ] **Step 2: Loki와 Prometheus 설정을 추가한다**

Prometheus는 `host.docker.internal:3000/api/observability/metrics`를 scrape한다.

- [ ] **Step 3: Grafana datasource/dashboard provisioning을 추가한다**

Datasource uid는 코드와 alert rule에서 재사용할 수 있게 고정값으로 둔다.

- [ ] **Step 4: alerting provisioning을 추가한다**

최소 rule:

- `FrontendBrowserErrorDetected`
- `FrontendApi5xxDetected`

Discord contact point는 `${GRAFANA_ALERTS_DISCORD_WEBHOOK_URL}` env 치환을 사용한다.

- [ ] **Step 5: compose 구성을 검증한다**

Run: `docker compose -f ops/observability/docker-compose.yml --env-file ops/observability/.env.example config`
Expected: exit 0

### Task 3: synthetic failure 경로와 health check 구현

**Files:**
- Create: `src/app/api/observability/dev/fail/route.ts`
- Create: `scripts/observability/health-check.mjs`
- Create: `scripts/observability/emit-browser-error.mjs`
- Create: `scripts/observability/emit-api-5xx.mjs`

- [ ] **Step 1: dev fail route의 기대 동작을 정리하고 구현한다**

로컬 환경에서만 동작하는 deterministic `503` route를 추가한다.

- [ ] **Step 2: health-check 스크립트를 구현한다**

확인 대상:

- Loki ready
- Prometheus ready
- Grafana health
- optional frontend metrics endpoint

- [ ] **Step 3: browser error synthetic script를 구현한다**

`/api/observability/browser-events`로 `browser_error` batch를 직접 POST한다.

- [ ] **Step 4: api 5xx synthetic script를 구현한다**

`/api/observability/dev/fail?status=503`를 호출해 request metric을 올린다.

### Task 4: 문서와 사용자 진입 경로 정리

**Files:**
- Modify: `README.md`
- Create: `docs/common/runbooks/frontend-observability-local-runbook.md`
- Modify: `docs/common/runbooks/vercel-deployment-runbook.md`

- [ ] **Step 1: README에 로컬 stack quick start를 추가한다**

포함:

- env 예시
- compose 기동
- health-check
- synthetic alert trigger

- [ ] **Step 2: runbook을 추가한다**

포함:

- 준비
- stack up/down
- Grafana 접근
- Discord webhook 설정
- alert 검증
- 문제 해결

- [ ] **Step 3: Vercel runbook에는 로컬 stack 문서 링크만 최소 반영한다**

### Task 5: 실제 검증과 정리

**Files:**
- Modify: `tmp/adr/260412/260412-211920-frontend-observability-phase-a.md`
- Modify as needed: 관련 구현 파일 전반

- [ ] **Step 1: 앱/테스트 검증을 수행한다**

Run:

- `npm run test`
- `npm run lint`
- `npm run build`

- [ ] **Step 2: observability stack 검증을 수행한다**

Run:

- `docker compose -f ops/observability/docker-compose.yml --env-file ops/observability/.env.example up -d`
- `npm run observability:health-check`
- `npm run observability:emit-browser-error`
- `npm run observability:emit-api-5xx`

가능하면 Grafana/Prometheus/Loki query까지 확인한다.

- [ ] **Step 3: 중요한 구현 사실을 ADR과 issue work-log에 남긴다**

- [ ] **Step 4: pre-push review를 반복해 추가 조치가 없어질 때까지 정리한다**

- [ ] **Step 5: commit / push / PR 상태 갱신을 수행한다**
