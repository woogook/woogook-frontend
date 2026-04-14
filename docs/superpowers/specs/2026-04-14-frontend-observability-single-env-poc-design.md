# 프런트엔드 observability 단일 env PoC 설계

- 작성일: `2026-04-14`
- 소유 도메인: `common`
- 상태: `draft`
- 관련 문서:
  - [/Users/eric/dev/upstage/woogook/woogook-frontend/docs/superpowers/specs/2026-04-12-frontend-observability-local-stack-design.md](/Users/eric/dev/upstage/woogook/woogook-frontend/docs/superpowers/specs/2026-04-12-frontend-observability-local-stack-design.md)
  - [/Users/eric/dev/upstage/woogook/woogook-frontend/docs/common/runbooks/frontend-observability-local-runbook.md](/Users/eric/dev/upstage/woogook/woogook-frontend/docs/common/runbooks/frontend-observability-local-runbook.md)

## 배경

현재 로컬 frontend observability는 두 계층의 설정을 쓴다.

- frontend 앱 런타임:
  - `WOOGOOK_OBSERVABILITY_*`
- local observability stack(`Grafana`, `Prometheus`, `Loki`):
  - `GRAFANA_*`
  - `FRONTEND_METRICS_TARGET`

장기적으로는 두 설정 파일을 분리하는 편이 자연스럽다. 하지만 PoC 단계에서는 처음 실행하는 사람이 수정해야 할 파일 수를 줄이는 것이 더 중요하다. 이번 설계의 목적은 사용자가 root `/.env` 하나만 관리하면서도, 내부적으로는 앱과 stack의 경계를 유지할 수 있게 하는 것이다.

## 목표

- 개발자가 실제로 수정하는 local 설정 파일을 root `/.env` 하나로 통일한다.
- tracked canonical example은 root `/.env.example` 하나로 둔다.
- `docker compose` 기반 local stack은 계속 안정적으로 동작하게 한다.
- 이후 EC2 보조 컴포넌트나 운영 환경 분리 시, 다시 파일을 분리하기 쉽게 만든다.

## 비목표

- preview/production 환경까지 단일 파일로 통합하지 않는다.
- env var 이름 자체를 바꾸지 않는다.
- `docker compose`가 root `/.env`를 직접 읽도록 무리하게 구조를 비틀지 않는다.
- backend observability 설정과 합치지 않는다.

## 선택지 비교

### 선택지 A. 현재처럼 frontend용과 stack용 파일을 분리 유지

- 장점:
  - 책임 경계가 가장 명확하다.
  - 운영 확장 시 구조가 그대로 이어진다.
- 단점:
  - PoC에서는 사용자가 두 파일을 동시에 관리해야 한다.
  - runbook 진입 장벽이 높다.

### 선택지 B. root `/.env` 하나를 사용자가 관리하고, stack 전용 `.env`는 자동 생성한다

- 장점:
  - 사용자는 root `/.env` 하나만 만지면 된다.
  - 앱과 stack의 소비 경계는 유지된다.
  - 나중에 분리할 때 sync 단계만 제거하면 된다.
- 단점:
  - stack 실행 전에 sync step이 하나 필요하다.
  - generated file(생성 파일)이라는 개념을 문서로 분명히 설명해야 한다.

### 선택지 C. 앱과 stack이 root `/.env` 하나를 직접 공용으로 사용한다

- 장점:
  - 겉보기에는 가장 단순하다.
- 단점:
  - 현재 `package.json`과 `docker compose` 흐름을 더 크게 바꿔야 한다.
  - 어떤 값이 어느 프로세스용인지 금방 흐려진다.
  - 추후 재분리 비용이 가장 크다.

## 채택안

이번 PoC에서는 `선택지 B`를 채택한다.

- 사용자가 관리하는 단일 source of truth(기준 설정 원본)는 root `/.env`다.
- tracked example은 root `/.env.example`만 둔다.
- `ops/observability/.env`는 `docker compose`용 generated mirror(생성 미러 파일)로 취급한다.
- `ops/observability/.env.example`는 PoC 동안 제거한다.

핵심은 “사용자는 하나의 파일만 수정하지만, 런타임 경계는 남긴다”이다.

## 구성 모델

### root `/.env.example`

이 파일은 아래 두 섹션을 함께 담는다.

1. frontend observability 섹션
2. local stack 섹션

예시 키는 아래와 같다.

- frontend observability:
  - `WOOGOOK_OBSERVABILITY_ENV`
  - `WOOGOOK_OBSERVABILITY_RELEASE`
  - `WOOGOOK_OBSERVABILITY_LOCAL_ROOT_DIR`
  - `WOOGOOK_OBSERVABILITY_WRITE_LOCAL_FILES`
  - `WOOGOOK_OBSERVABILITY_ROTATE_BYTES`
  - `WOOGOOK_OBSERVABILITY_RETENTION_DAYS`
  - `WOOGOOK_OBSERVABILITY_LOCAL_MIRROR_TO_CLOUD`
  - `WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL`
  - `WOOGOOK_OBSERVABILITY_LOKI_QUERY_URL`
  - `WOOGOOK_OBSERVABILITY_LOKI_USERNAME`
  - `WOOGOOK_OBSERVABILITY_LOKI_PASSWORD`
  - `WOOGOOK_OBSERVABILITY_DISCORD_WEBHOOK_URL`
  - `WOOGOOK_OBSERVABILITY_LLM_WEBHOOK_URL`
  - `WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS`
  - `WOOGOOK_OBSERVABILITY_ANALYZER_LOOKBACK_MINUTES`
- local stack:
  - `GRAFANA_ADMIN_USER`
  - `GRAFANA_ADMIN_PASSWORD`
  - `GRAFANA_ALERTS_DISCORD_WEBHOOK_URL`
  - `FRONTEND_METRICS_TARGET`

### root `/.env`

- 개발자가 실제로 수정하는 로컬 파일이다.
- frontend 앱은 이 파일을 그대로 읽는다.
- stack sync script도 이 파일을 읽는다.

### `ops/observability/.env`

- 개발자가 직접 편집하지 않는다.
- stack 실행 직전에 sync script가 root `/.env`에서 필요한 key만 추출해 생성한다.
- gitignore 유지 대상이다.

## 데이터 흐름

1. 개발자가 `cp .env.example .env`로 root `/.env`를 만든다.
2. 개발자가 root `/.env`에서 frontend 키와 stack 키를 모두 채운다.
3. `npm run observability:stack:config`, `up`, `down` 실행 시 먼저 sync script가 돈다.
4. sync script는 root `/.env`에서 stack용 key만 읽어 `ops/observability/.env`를 생성한다.
5. `docker compose`는 생성된 `ops/observability/.env`를 사용한다.
6. frontend 앱은 계속 root `/.env`를 읽고 실행된다.

## sync 설계

### 책임

새 helper script는 아래 역할만 담당한다.

- root `/.env` 또는 fallback용 root `/.env.example`를 읽는다.
- stack에 필요한 key만 골라 `ops/observability/.env`를 쓴다.
- 누락된 필수값이 있으면 사람이 이해하기 쉬운 오류를 출력한다.

### 입력 우선순위

1. root `/.env`
2. root `/.env.example`

이 우선순위는 아래 이유로 둔다.

- 실제 로컬 실행은 root `/.env`가 기준이다.
- `observability:stack:config` 같은 dry-run(정적 확인)에서는 example만으로도 구성을 미리 점검할 수 있다.

### 출력 범위

sync script가 `ops/observability/.env`에 써야 하는 키는 아래 4개로 제한한다.

- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`
- `GRAFANA_ALERTS_DISCORD_WEBHOOK_URL`
- `FRONTEND_METRICS_TARGET`

이 범위를 고정하면 generated file의 역할이 명확해진다.

## package.json 반영 원칙

아래 stack 관련 스크립트는 모두 `observability:stack:sync-env`를 먼저 실행한다.

- `observability:stack:sync-env`
- `observability:stack:config`
- `observability:stack:up`
- `observability:stack:down`

즉, 사용자는 별도로 `ops/observability/.env`를 만들 필요가 없다.

## runbook 반영 원칙

runbook은 아래 흐름으로 단순화한다.

1. `cp .env.example .env`
2. root `/.env` 수정
3. `npm run observability:stack:up`
4. `npm run dev`
5. health check와 synthetic alert 검증

또한 `Next.js`의 env 우선순위 때문에 `.env.local`이 남아 있으면 root `/.env`보다 우선 적용된다는 경고를 유지한다.

## 마이그레이션 경로

PoC가 끝난 뒤 아래 조건 중 하나가 생기면 파일 분리를 다시 고려한다.

- EC2에서 frontend observability 보조 프로세스를 별도 실행할 때
- local stack이 repo 외부에서 독립 실행돼야 할 때
- stack secret과 앱 secret의 접근 주체를 분리해야 할 때

그 시점에는 아래 순서로 되돌릴 수 있다.

1. sync script를 제거한다.
2. `ops/observability/.env.example`를 다시 canonical example로 복원한다.
3. root `/.env.example`에서는 frontend 키만 남긴다.

env var 이름을 유지하면 이 재분리는 비교적 저비용이다.

## 검증 전략

### 정적 검증

- sync script 단위 테스트
- `docker compose ... --env-file ops/observability/.env config`

### 수동 검증

- root `/.env` 하나만 수정해 stack과 frontend가 함께 뜨는지 확인
- synthetic browser error와 API 5xx alert가 그대로 발화하는지 확인
- local file, Loki, Prometheus, Grafana, Discord 경로가 모두 유지되는지 확인

## 리스크와 대응

### 리스크 1. `.env.local`이 root `/.env`를 덮어씀

- 대응:
  - runbook에 명시적으로 경고한다.
  - troubleshooting에 우선 확인 항목으로 둔다.

### 리스크 2. generated `ops/observability/.env`를 사람이 직접 수정함

- 대응:
  - generated file이라고 문서와 주석에 명시한다.
  - stack 실행 때마다 다시 생성해 수동 수정 의미를 없앤다.

### 리스크 3. root `/.env`가 너무 길어짐

- 대응:
  - section comment로 frontend와 stack 영역을 분리한다.
  - PoC 종료 후 분리 trigger가 오면 즉시 파일을 쪼갠다.

## 결정 요약

- PoC 동안 사용자가 관리하는 파일은 root `/.env` 하나로 통일한다.
- 내부 구현은 단일 물리 파일 직접 공용이 아니라, root `/.env` -> `ops/observability/.env` sync 구조를 쓴다.
- 이 구조는 PoC의 단순성과 이후 재분리 가능성을 동시에 확보하는 절충안이다.
