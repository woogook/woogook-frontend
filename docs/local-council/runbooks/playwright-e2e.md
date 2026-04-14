# 현직 지방의원 Playwright E2E Runbook

## 1. 목적

- 이 문서는 `woogook-frontend`를 처음 보는 사람도 `local-council` 자동 테스트를 실행할 수 있도록 돕는 실행 가이드다.
- 테스트 범위는 두 단계로 나뉜다.
  - `Smoke E2E(빠른 회귀 테스트)`
    - frontend 단독 실행 환경에서도 돌아가는 브라우저 레벨 회귀 테스트다.
    - sample fallback(샘플 데이터 대체 경로)과 기본 사용자 흐름이 깨지지 않았는지 확인한다.
  - `Integration E2E(백엔드 연동 통합 테스트)`
    - 실제 backend, Postgres, Next API route, Playwright browser flow를 함께 검증한다.
    - `지역 선택 -> 명단 조회 -> 상세 진입`이 실데이터 계약과 호환되는지 확인한다.

## 2. 이 문서가 전제하는 것

- 저장소 구성
  - 현재 문서는 `woogook-frontend`와 `woogook-backend`가 같은 부모 디렉터리 아래에 있다고 가정한다.
  - 예시
    - `/path/to/woogook-frontend`
    - `/path/to/woogook-backend`
- 실행 환경
  - 로컬 macOS 또는 Linux shell 기준 설명이다.
  - Windows에서도 동작 가능하게 스크립트를 작성했지만, 본 문서의 예시는 `zsh` 또는 `bash` 기준이다.

## 3. 빠른 시작

### 3.1 처음 보는 사람용 최소 절차

- 1회만 준비하면 되는 것
  - Node.js를 `.nvmrc`와 같은 `24.14.1`로 맞춘다.
  - frontend 의존성을 설치한다.
  - Playwright browser asset(브라우저 실행 자산)을 설치한다.
  - Docker Desktop과 `uv`가 실행 가능해야 한다.
- 가장 빠른 실행 순서

```bash
cd /path/to/woogook-frontend
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use
npm ci
npm run e2e:install
npm run e2e:smoke
npm run e2e:integration
```

### 3.2 성공 기준

- `npm run e2e:smoke`
  - `2 passed`가 보이면 정상이다.
- `npm run e2e:integration`
  - `1 passed`가 보이면 정상이다.
  - 실행 중 backend를 자동으로 띄웠다면 마지막에 backend 종료 로그가 보인다.

## 4. 사전 준비

### 4.1 필수 도구

- Node.js
  - `.nvmrc` 기준 `24.14.1`
  - 권장 이유
    - frontend 로컬 실행 버전과 CI 버전을 맞춘다.
    - Playwright와 Next.js 실행 차이를 줄인다.
- npm
  - `npm ci`가 가능한 상태여야 한다.
- Docker Desktop
  - Integration E2E는 backend 쪽 Postgres container(컨테이너)를 사용한다.
- `uv`
  - backend의 Python dependency 실행과 Alembic migration(데이터베이스 마이그레이션)에 필요하다.

### 4.2 frontend 준비

- 의존성 설치

```bash
npm ci
```

- Playwright browser asset 설치

```bash
npm run e2e:install
```

### 4.3 backend 위치 확인

- 기본 탐색 경로
  - integration harness(통합 실행 하네스)는 아래 순서로 `woogook-backend`를 찾는다.
    - `../woogook-backend`
    - `../../woogook-backend`
    - `../../../woogook-backend`
- 기본 경로에 없으면 환경 변수로 직접 지정한다.

```bash
export PLAYWRIGHT_LOCAL_COUNCIL_BACKEND_REPO=/abs/path/to/woogook-backend
```

## 5. 테스트 종류

### 5.1 Smoke E2E

- 목적
  - backend 없이도 브라우저 주요 동선이 깨지지 않았는지 빠르게 확인한다.
- 검증 범위
  - `/local-council` 진입
  - sample button 클릭
  - roster 표시
  - detail 진입
  - browser back navigation(브라우저 뒤로가기) 확인
  - accessible label(접근 가능한 label) 기반 locator 확인
- 실행 명령

```bash
npm run e2e:smoke
```

### 5.2 Integration E2E

- 목적
  - frontend, Next API route, backend, Postgres 사이의 실제 연결이 살아 있는지 확인한다.
- 검증 범위
  - `지역 select`가 Postgres 기반 API로 채워지는지 확인
  - `local-council resolve API`가 backend proxy를 통해 응답하는지 확인
  - `공식 근거 데이터` 배지가 보이는지 확인
  - roster와 person detail이 backend fixture 기준으로 렌더링되는지 확인
- 실행 명령

```bash
npm run e2e:integration
```

## 6. Integration E2E가 자동으로 해주는 일

### 6.1 자동 bootstrap(초기 구동) 순서

- `npm run e2e:integration`은 내부적으로 아래를 자동 수행한다.
  - backend 저장소를 찾는다.
  - `docker compose up -d postgres`를 실행한다.
  - dedicated integration database(격리된 integration 전용 데이터베이스)를 재생성한다.
  - Postgres readiness(기동 완료 상태)를 확인한다.
  - `uv run alembic upgrade head`를 실행한다.
  - `local_election_contest`, `local_election_contest_emd`, `gu`, `local_council_*` 최소 fixture seed(테스트용 고정 데이터 입력)를 넣는다.
  - backend를 전용 포트에서 띄운다.
  - backend `/health`를 확인한다.
  - Playwright integration spec을 실행한다.
  - 테스트가 끝나면 backend와 integration database를 정리한다.

### 6.2 자동으로 잡는 기본 포트

- backend
  - `127.0.0.1:18000`
- Postgres
  - `127.0.0.1:5433`
- integration database
  - 기본값은 `woogook_local_council_e2e`
  - 기존 개발용 `woogook` 데이터베이스를 덮어쓰지 않도록 격리해서 사용한다.
- frontend dev server
  - `http://localhost:3000`

### 6.3 필요한 경우 바꿀 수 있는 환경 변수

- backend repo 경로
  - `PLAYWRIGHT_LOCAL_COUNCIL_BACKEND_REPO`
- integration database 이름
  - `PLAYWRIGHT_LOCAL_COUNCIL_PGDATABASE`
- integration database 접속 target
  - harness는 `PLAYWRIGHT_LOCAL_COUNCIL_PG*` 값으로 내부 `WOOGOOK_DATABASE_URL`을 조립한다.
  - shell에 기존 `WOOGOOK_DATABASE_URL`이 export되어 있어도 integration E2E 대상은 오염되지 않는다.
- integration database 보존
  - `PLAYWRIGHT_LOCAL_COUNCIL_PRESERVE_DATABASE=1`
  - 실패 상태를 직접 확인해야 할 때만 사용한다.

### 6.4 이 동작이 중요한 이유

- 처음 보는 사람은 backend를 수동으로 띄우는 절차를 몰라도 된다.
- smoke E2E와 integration E2E의 차이가 명확해진다.
  - smoke는 샘플 경로를 본다.
  - integration은 실제 backend 계약을 본다.
- 개발용 데이터베이스를 덮어쓰지 않고, 매번 깨끗한 integration 전용 데이터베이스로 시작할 수 있다.

## 7. 권장 실행 순서

### 7.1 전체 자동 검증

```bash
npm run lint
npm run test
npm run e2e:smoke
npm run e2e:integration
npm run build
```

### 7.2 변경 범위별 권장 순서

- UI나 locator만 건드렸을 때
  - `npm run e2e:smoke`
  - 필요하면 `npm run e2e:integration`
- `local-council` API route, region query, backend proxy 계약을 건드렸을 때
  - `npm run test`
  - `npm run e2e:smoke`
  - `npm run e2e:integration`
- Next route나 build 설정을 건드렸을 때
  - `npm run lint`
  - `npm run test`
  - `npm run e2e:smoke`
  - `npm run e2e:integration`
  - `npm run build`

## 8. Playwright CLI 사용 원칙

### 8.1 언제 Playwright CLI를 쓰는가

- Playwright CLI는 exploratory debugging(탐색형 디버깅) 용도다.
- 대표 사례
  - 새 locator 탐색
  - flaky test(간헐 실패 테스트) 원인 조사
  - 실제 DOM 상태 확인
  - 브라우저에서 어떤 텍스트와 role이 보이는지 즉석 확인

### 8.2 언제 Playwright Test spec으로 남겨야 하는가

- 최종 회귀 테스트는 반드시 `Playwright Test spec`으로 고정한다.
- 즉
  - CLI는 조사 도구
  - spec은 회귀 방지 장치

## 9. 디버깅 가이드

### 9.1 raw spec만 직접 돌리고 싶을 때

- 아래 명령은 backend와 Postgres가 이미 준비된 경우에만 직접 실행한다.

```bash
PLAYWRIGHT_LOCAL_COUNCIL_INTEGRATION=1 npm run e2e:integration:spec
```

- 이런 경우에 유용하다.
  - harness는 이미 성공하는데 spec만 빠르게 재실행하고 싶을 때
  - backend를 수동으로 띄운 상태에서 Playwright만 반복 실행하고 싶을 때

### 9.2 Playwright artifact(결과 산출물) 확인

- 실패 시 확인할 것
  - `playwright-report/`
    - HTML report(HTML 리포트)
  - `test-results/`
    - screenshot
    - video
    - error-context.md

### 9.3 backend 로그 확인

- integration harness는 backend stdout/stderr를 그대로 보여준다.
- 아래가 보이면 정상에 가깝다.
  - `Uvicorn running on http://127.0.0.1:18000`
  - `GET /health 200 OK`
  - `GET /api/local-council/v1/resolve ... 200 OK`

## 10. 자주 만나는 실패와 대응

### 10.1 `woogook-backend 저장소를 찾지 못했습니다`

- 의미
  - integration harness가 backend checkout 경로를 찾지 못했다.
- 대응
  - backend가 실제로 있는지 확인한다.
  - 경로가 기본 탐색 범위 밖이면 아래를 설정한다.

```bash
export PLAYWRIGHT_LOCAL_COUNCIL_BACKEND_REPO=/abs/path/to/woogook-backend
```

### 10.2 `uv: command not found`

- 의미
  - backend migration과 server 실행에 필요한 `uv`가 없다.
- 대응
  - `uv`를 설치한 뒤 다시 실행한다.

### 10.3 Postgres 연결 실패

- 의미
  - Docker Desktop이 꺼져 있거나 backend 쪽 Postgres container가 제대로 뜨지 않았다.
- 대응
  - Docker Desktop을 켠다.
  - backend 저장소에서 `docker compose ps`로 상태를 확인한다.
  - 포트 `5433` 충돌 여부를 확인한다.

### 10.4 backend `/health` 실패

- 의미
  - migration은 됐지만 backend 실행 또는 DB 연결이 정상적으로 끝나지 않았다.
- 대응
  - backend 로그에서 startup error를 본다.
  - `WOOGOOK_DATABASE_URL` override가 필요한 환경인지 확인한다.

### 10.5 `로컬 미리보기 데이터`가 보인다

- 의미
  - integration이 아니라 sample fallback 경로로 빠졌을 가능성이 높다.
- 대응
  - `npm run e2e:integration`으로 돌렸는지 확인한다.
  - backend `/health`가 실제로 살아 있었는지 로그를 본다.
  - integration spec에서는 `공식 근거 데이터`가 보여야 정상이다.

## 11. FAQ

### 11.1 backend 저장소 위치가 팀원마다 다르면 어떻게 하나

- 문제 없다.
- 각자 아래 환경 변수만 맞추면 된다.

```bash
export PLAYWRIGHT_LOCAL_COUNCIL_BACKEND_REPO=/abs/path/to/woogook-backend
```

### 11.2 다른 팀원이 backend를 변경하면 내 integration E2E가 무조건 깨지나

- 무조건 그렇지는 않다.
- 실제 영향은 두 가지로 갈린다.
  - backend 위치 변경
    - 경로만 맞게 다시 지정하면 된다.
  - backend 계약 변경
    - `/health`, DB schema, `local-council` API 응답 shape가 바뀌면 integration E2E가 실패할 수 있다.
- 이 실패는 대개 “테스트가 쓸모없다”가 아니라 “통합 계약이 바뀌었다”는 신호다.

### 11.3 smoke는 통과하는데 integration만 실패하면 어디를 먼저 봐야 하나

- 아래 순서로 보는 게 가장 빠르다.
  - backend repo 경로 탐색 성공 여부
  - Docker / Postgres 상태
  - Alembic migration 성공 여부
  - backend `/health`
  - Playwright artifact

## 12. 현재 한계

- 이 integration E2E는 local sibling repo(같은 부모 경로의 로컬 backend 저장소) 전제를 둔다.
- 즉, frontend 저장소 단독 CI에서 backend checkout 없이 바로 돌리는 구조는 아직 아니다.
- 이후 확장 방향
  - frontend CI에서 backend checkout까지 포함한 job 추가
  - backend 쪽에 fixture bootstrap command(테스트 fixture 초기화 명령) 제공
  - frontend가 backend schema 세부사항을 직접 seed하지 않도록 결합도 축소
