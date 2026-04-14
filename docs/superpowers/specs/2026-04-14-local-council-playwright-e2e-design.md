# 현직 지방의원 Playwright E2E 도입 설계

- 작성일: `2026-04-14`
- 소유 도메인: `local-council`
- 상태: `draft`
- 관련 문서:
  - [현직 지방의원 도메인 LLM 진입 문서](/Users/eric/dev/upstage/woogook/woogook-frontend/docs/local-council/canonical/llm-entry.md)
  - [현직 지방의원 주소 기반 명단·상세 화면 설계](./2026-04-11-local-council-member-address-roster-detail-design.md)
  - [woogook-backend README](</Users/eric/dev/upstage/woogook/woogook-backend/README.md>)
  - [woogook-backend 실행 치트시트](</Users/eric/dev/upstage/woogook/woogook-backend/docs/evidence/EXECUTION_CHEATSHEET_BACKEND.md>)

## 배경

현재 frontend는 `vitest` 기반 단위 테스트와 route/API 수준 테스트를 이미 갖고 있다. `local-council` 도메인도 sample fixture, API fallback, roster/detail 렌더링 검증이 준비되어 있어 브라우저 레벨 자동화를 붙일 수 있는 토대는 있다.

하지만 아직 실제 브라우저에서 `/local-council` 주소 선택, roster 전이, 상세 진입, 뒤로가기, 오류 표시를 한 번에 검증하는 회귀 테스트는 없다. 또한 agent가 브라우저를 직접 탐색하면서 locator를 잡고 실패를 재현하는 도구와, 저장소에 남는 테스트 자산이 구분되어 있지 않다.

이번 설계의 목적은 두 요구를 동시에 만족하는 것이다.

- 저장소에 남는 자동 회귀 테스트를 만든다.
- LLM agent가 브라우저를 실제로 조작하며 테스트를 작성·디버깅할 수 있게 한다.

## 목표

- `Playwright Test`를 저장소의 브라우저 회귀 테스트 기준 도구로 도입한다.
- `Playwright CLI`를 agent의 탐색·디버깅·locator 수집 보조 도구로 도입한다.
- `local-council` 기능에 대해 두 계층의 E2E를 제공한다.
  - 빠르고 결정론적인 `smoke-e2e`
  - backend와 DB를 포함한 실제 `integration-e2e`
- 로컬과 CI의 Node 버전을 `24.x`로 통일한다.
- 첫 번째 검증 대상은 `/local-council`의 주소 선택 → roster → detail 흐름으로 한정한다.

## 비목표

- 브라우저 자동화 도입과 동시에 전 도메인 E2E를 한 번에 구축하지 않는다.
- `MCP`를 브라우저 자동화의 주 경로로 채택하지 않는다.
- `Playwright CLI`만으로 테스트를 운영하지 않는다.
- visual regression, mobile matrix, cross-browser matrix를 1차 범위에 넣지 않는다.
- backend seed 체계를 이번 frontend 저장소에서 새로 설계하지 않는다.

## 선택지 비교

### 선택지 A. `Playwright Test`만 도입

- 장점:
  - 가장 단순하다.
  - CI 회귀 테스트 자산을 바로 확보할 수 있다.
  - 팀이 익숙한 `npm run` 중심 워크플로에 자연스럽게 들어간다.
- 단점:
  - agent가 브라우저를 탐색하며 locator와 실패 상황을 빠르게 확인하는 루프는 상대적으로 답답하다.
  - 테스트 작성 초기에 실제 DOM 상태를 확인하는 비용이 커진다.

### 선택지 B. `Playwright CLI`만 사용

- 장점:
  - agent가 실제 브라우저를 즉시 조작하면서 탐색하기 쉽다.
  - 실패 재현과 locator 확인이 빠르다.
- 단점:
  - 결과가 저장소 자산으로 남지 않기 쉽다.
  - CI 회귀 테스트 체계로 바로 연결되지 않는다.
  - 팀 표준 테스트 실행 명령으로 정착시키기 어렵다.

### 선택지 C. `Playwright Test` + `Playwright CLI`

- 장점:
  - 저장소에 남는 회귀 테스트와 agent 탐색 루프를 동시에 확보할 수 있다.
  - CLI로 시나리오를 탐색한 뒤 spec으로 고정하는 개발 루프가 자연스럽다.
  - 테스트 운영 기준은 `Playwright Test`로 단순하게 유지하면서도 authoring 생산성을 올릴 수 있다.
- 단점:
  - 도구가 하나 더 늘어난다.
  - 팀 문서에 두 역할의 경계를 분명히 적어야 한다.

## 채택안

이번 작업에서는 `선택지 C`를 채택한다.

- 저장소의 기준 검증 자산은 `Playwright Test`다.
- `Playwright CLI`는 사람이 수동 클릭하는 도구가 아니라, agent가 브라우저를 실제로 탐색하고 실패를 디버깅하는 보조 인터페이스로 사용한다.
- 운영 기준은 `spec-first`, 탐색 루프는 `CLI-assisted`로 둔다.

즉, 이번 도입은 `CLI-first`가 아니라 `Test-first, CLI-assisted`다.

## 테스트 계층 설계

### 1. `smoke-e2e`

목적은 빠르고 결정론적인 PR 수준 회귀 검증이다.

- 실행 환경:
  - frontend만 실행
  - backend 미기동 허용
  - DB 미연동 허용
- 데이터 경로:
  - `local-council`의 로컬 sample fallback 사용
- 대상 시나리오:
  - `/local-council` 진입
  - `로컬 미리보기`의 `서울 강동구 천호동` 버튼 클릭
  - `서울특별시 강동구` roster 확인
  - `구청장 1명`, `구의원 2명` 확인
  - 인물 상세 진입
  - 뒤로가기로 roster와 address 단계 복귀
- 기대 효과:
  - backend나 DB 상태와 독립적으로 가장 중요한 UI 흐름을 빠르게 막아준다.

### 2. `integration-e2e`

목적은 실제 데이터 경계와 프로세스 연결을 검증하는 통합 테스트다.

- 실행 환경:
  - frontend
  - backend
  - postgres
  - backend migration 및 최소 seed
- 데이터 경로:
  - frontend 지역 API는 DB 실제 조회 사용
  - frontend `local-council` route는 backend proxy 사용
- 대상 시나리오:
  - `/local-council` 진입
  - `시/도`, `구/군/시`, `읍/면/동` 선택
  - 실제 resolve API 성공
  - roster 확인
  - 실제 person dossier 상세 확인
- 기대 효과:
  - 브라우저, Next route, DB-backed 지역 조회, backend proxy, 실제 응답 shape를 한 번에 검증한다.

두 계층은 대체 관계가 아니라 보완 관계다. `smoke-e2e`는 빠른 방어선이고, `integration-e2e`는 실제 연결 상태를 확인하는 상위 방어선이다.

## 런타임 및 도구 기준

### Node 버전

- 로컬 `.nvmrc`와 CI를 모두 `Node 24.x`로 통일한다.
- patch 고정은 `24.14.1`을 기준으로 시작한다.
- GitHub Actions의 `actions/setup-node`는 최소 `24` major를 사용하고, 로컬 문서와 `.nvmrc`는 같은 major로 맞춘다.

선정 이유는 다음과 같다.

- 현재 CI가 이미 `24`를 사용한다.
- `Playwright`는 `20.x`, `22.x`, `24.x`를 지원한다.
- `Next.js` 최소 요구사항을 넉넉하게 만족한다.
- `2026-04-14` 기준 `24.x`는 Active LTS이고 `22.x`는 Maintenance LTS다.

### Playwright 도입 범위

1차 도입 범위:

- `@playwright/test`
- `playwright` CLI
- Chromium project
- trace / screenshot / video 아티팩트

이번 slice에서는 Firefox/WebKit, device matrix, visual diff 도입은 보류한다.

## 저장소 구조

예상 파일 구조:

- `playwright.config.ts`
- `e2e/local-council/local-sample.spec.ts`
- `e2e/local-council/integration.spec.ts`
- `e2e/helpers/local-council.ts`
- `docs/local-council/runbooks/playwright-e2e.md`

`e2e/local-council` 아래에 도메인별 spec을 모으고, 공통 이동/선택 helper만 `e2e/helpers`로 분리한다. helper는 과도한 추상화보다 실제 시나리오를 읽기 쉬운 수준으로 제한한다.

## 브라우저 선택자 원칙

Playwright는 `getByRole`, `getByLabel`, `getByText` 같은 사용자 지향 locator를 우선 사용한다. 따라서 이번 도입에서는 테스트 코드를 억지 selector에 의존시키지 않도록 접근성 연결을 일부 보강한다.

필요한 보강:

- `RegionAddressInput`의 `label`과 `select`에 `htmlFor`/`id`를 연결한다.
- sample button, roster section, detail section에서 정말 필요한 곳에만 `data-testid`를 추가한다.
- 기존 텍스트 기반 선택이 충분히 안정적이면 추가 test id를 남발하지 않는다.

우선순위는 아래와 같다.

1. role/label 기반 locator
2. 명확한 텍스트 locator
3. 최소한의 `data-testid`

## 실행 모델

### `Playwright Test`

기본 실행 명령은 아래 형태로 둔다.

- `npm run e2e`
- `npm run e2e:smoke`
- `npm run e2e:integration`

`playwright.config.ts`에서는 아래를 공통으로 둔다.

- `webServer`로 frontend 실행
- `baseURL` 설정
- `trace: "on-first-retry"`
- `screenshot: "only-on-failure"`
- `video: "retain-on-failure"`

`integration-e2e`는 backend와 postgres 준비가 선행되어야 하므로 별도 명령이나 사전 준비 스크립트를 둔다.

### `Playwright CLI`

CLI는 아래 목적에만 사용한다.

- 새 시나리오 탐색
- locator 확인
- 실패 재현
- flaky 원인 조사
- spec 작성 전 브라우저 상태 확인

CLI는 테스트의 기준 산출물이 아니다. CLI로 확인한 사실은 결국 `Playwright Test` spec으로 고정해야 한다.

## 환경 구성

### `smoke-e2e`

- frontend 실행만 필요하다.
- `WOOGOOK_BACKEND_BASE_URL`가 없어도 된다.
- `local-council`의 sample fallback과 sample button을 기준 경로로 사용한다.

### `integration-e2e`

아래 순서를 기준으로 한다.

1. `woogook-backend`에서 postgres 실행
2. backend dependency 설치 및 migration 적용
3. 최소 seed 또는 fixture 적재
4. backend API 실행
5. frontend에서 `WOOGOOK_BACKEND_BASE_URL`를 backend 주소로 지정
6. Playwright integration spec 실행

이 계층은 같은 머신의 sibling repo를 활용하는 로컬 통합 테스트를 기준으로 한다.

## CI 전략

### 기본 CI

기본 CI는 `smoke-e2e`를 우선 채택한다.

- 이유:
  - setup 비용이 작다.
  - runtime이 짧다.
  - 외부 프로세스 의존이 적다.

### 확장 CI

`integration-e2e`는 두 번째 단계로 붙인다.

권장 운영 방식:

- 선택 실행(`workflow_dispatch`)
- nightly 또는 수동 검증
- 또는 별도 job으로 분리해 실패 범위를 명확히 구분

이 계층은 backend compose, migration, seed 비용이 있어 항상-on PR gate로 바로 두지 않는다.

## 단계별 롤아웃

### 단계 1. 기반 도입

- Node 24 통일
- `@playwright/test` 및 CLI 도입
- 기본 config와 npm script 추가

### 단계 2. smoke spec 추가

- `local-council` sample happy path spec 작성
- 필요한 locator 안정화 반영
- trace/screenshot artifact 경로 검증

### 단계 3. integration harness 추가

- backend + postgres 기동 경로 문서화
- migration/seed 최소 절차 정리
- 실제 지역 선택 select 기반 spec 작성

### 단계 4. CI 연결

- frontend CI에 smoke job 추가
- integration job은 분리된 조건부 실행으로 추가

## 리스크와 대응

### 리스크 1. integration-e2e의 준비 비용이 크다

- 대응:
  - smoke와 integration을 분리한다.
  - integration은 처음부터 PR 필수 gate로 두지 않는다.

### 리스크 2. locator가 불안정하다

- 대응:
  - role/label 기반 선택을 우선한다.
  - 필요한 최소 범위에서만 `data-testid`를 추가한다.

### 리스크 3. 지역 API와 backend proxy가 동시에 변동하면 실패 원인 파악이 어렵다

- 대응:
  - smoke와 integration spec을 분리해 계층별 원인 분리를 쉽게 만든다.
  - CLI로 실패 시 실제 브라우저 상태를 먼저 재현한 뒤 spec을 수정한다.

### 리스크 4. 로컬과 CI의 Node 차이로 재현이 갈린다

- 대응:
  - `.nvmrc`, 문서, CI를 모두 `24.x`로 정렬한다.

## 검증 전략

도입 후 최소 검증은 아래 순서를 따른다.

1. `npm run lint`
2. `npm run test`
3. `npm run e2e:smoke`
4. 가능하면 `npm run build`
5. integration harness가 준비된 뒤 `npm run e2e:integration`

또한 agent가 CLI로 실제 브라우저를 탐색해 spec의 selector와 화면 전이가 문서와 일치하는지 교차 확인한다.

## 구현 원칙

- 첫 브라우저 테스트의 기준 도메인은 `local-council`로 한정한다.
- 첫 smoke spec은 sample 기반 happy path 하나만 만든다.
- 첫 integration spec은 강동구 기준 실제 select 경로 하나만 만든다.
- 테스트 인프라 도입과 동시에 기존 `vitest` 체계를 흔들지 않는다.
- 문서와 스크립트 이름은 사람이 읽기 쉽게 한글 설명을 유지하되, 명령어와 코드 식별자는 원문을 유지한다.

## 후속 구현 순서

1. Node 24 기준으로 로컬/CI 런타임을 정렬한다.
2. `Playwright Test`와 CLI 의존성, config, script를 추가한다.
3. `RegionAddressInput`의 접근성 연결을 보강한다.
4. `local-council` smoke spec을 sample 기반으로 추가한다.
5. Playwright CLI 사용 runbook을 추가한다.
6. backend + postgres 기반 integration harness와 spec을 추가한다.
7. CI에 smoke job을 연결하고 integration job은 분리한다.
