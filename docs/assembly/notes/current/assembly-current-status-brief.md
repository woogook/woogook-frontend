# 국회 frontend 현재 현황

- 문서 유형: `notes`
- 소유 도메인: `assembly`
- 문서 surface: `shared`
- 주요 독자: `human, LLM agent`
- 상태: `active`
- 관련 PR: `없음`
- 정본 여부: `아니오`
- 연결된 정본 문서: `docs/assembly/canonical/llm-entry.md`
- 최종 갱신일: `2026-04-15`

## 이 문서의 역할

- 이 문서는 `woogook-frontend`의 `assembly` 도메인에서 지금 사용자가 실제로 볼 수 있는 화면과 데이터 경로를 빠르게 설명하는 current status brief다.
- 현재 `assembly` frontend는 더 이상 단순 mock(목업) 화면만 있는 상태가 아니다.
- 다만 전국 단위 browse(탐색) 제품으로 완성된 것도 아니다.
  - 현재 사용자 흐름은 `서울특별시·강동구` 한정 selection(선택)과 의원별 공약 이행률 확인에 집중돼 있다.

## 한눈에 보는 현재 상태

- 현재 사용자 흐름은 아래 세 화면으로 정리된다.
  - `/assembly`
    - 시·도, 구·군·시, 국회의원을 고르는 entry 화면
  - `/assembly/pledge`
    - 의원 프로필, 전체 이행률, category breakdown(카테고리별 요약) 화면
  - `/assembly/pledge/category`
    - 카테고리별 공약 목록과 판단 근거를 보는 상세 화면
- 현재 데이터는 브라우저가 backend를 직접 치지 않고, same-origin proxy(동일 출처 프록시)를 거쳐 읽는다.
  - `GET /api/assembly/v1/members`
  - `GET /api/assembly/v1/members/{mona_cd}/card`
  - `GET /api/assembly/v1/members/{mona_cd}/pledge-summary`
  - `GET /api/assembly/v1/members/{mona_cd}/pledges`
- 현재 제품 범위는 `서울특별시·강동구`를 실제 선택 가능 범위로 고정해 둔 상태다.

## 현재 구현된 기능

### 1. Entry 화면(`/assembly`)

- 진입 페이지는 `src/app/assembly/page.tsx`와 `src/features/assembly/AssemblyLandingPage.tsx`가 담당한다.
- 실제 입력 폼은 `src/features/assembly/components/AssemblyPledgeForm.tsx`에 있다.
- 현재 동작은 아래처럼 읽으면 된다.
  - 시·도
    - `서울특별시`가 고정값이다.
    - 다른 시·도 option(옵션)은 비활성화(disabled) 상태다.
  - 구·군·시
    - API로 목록을 읽지만, 실제 선택 가능 값은 현재 `강동구`만 열려 있다.
  - 국회의원 선택
    - `GET /api/assembly/v1/members?region=...&district=...` 결과를 React Query(리액트 쿼리)로 읽는다.
    - value(값)는 `mona_cd`, label(표시값)은 `display_label`을 사용한다.
  - 제출
    - `/assembly/pledge?city=...&sigungu=...&mona_cd=...`로 이동한다.

### 2. 공약 이행률 요약 화면(`/assembly/pledge`)

- 화면 본체는 `src/features/assembly/AssemblyPledgeRatePage.tsx`다.
- 현재 surface는 아래 정보를 보여 준다.
  - 의원 메타 카드(meta card)
    - 이름
    - 정당
    - 지역구
    - 현재 위원회
    - 선수(재선 여부 텍스트)
    - campaign booklet(선거공보 PDF) 링크
  - overall rate(전체 이행률)
  - category rate(카테고리별 이행률)
  - progress breakdown(완료단계/진행중/판단불가 건수)
  - breadcrumb(브레드크럼)과 지역 문맥
- 현재 이 화면은 아래 API 조합을 사용한다.
  - `GET /api/assembly/v1/members/{mona_cd}/card`
  - `GET /api/assembly/v1/members/{mona_cd}/pledge-summary`
- `mona_cd`가 없을 때는 일부 demo copy(데모 문구)가 남아 있지만, 실제 main flow(주 흐름)는 `mona_cd`가 있는 상태를 기준으로 구현돼 있다.

### 3. 카테고리별 공약 상세 화면(`/assembly/pledge/category`)

- 화면 본체는 `src/features/assembly/AssemblyPledgeCategoryTopPage.tsx`다.
- 현재 동작은 아래처럼 읽으면 된다.
  - `category` query string(쿼리 문자열)로 카테고리를 받는다.
  - `GET /api/assembly/v1/members/{mona_cd}/pledges?category=...`를 호출한다.
  - category average(카테고리 평균 이행도), total/evaluated count(전체/평가 완료 건수), 공약 목록을 보여 준다.
  - `promise_id` deep link(딥링크)가 들어오면 해당 공약 행을 scroll + flash highlight(스크롤 및 강조)한다.
- 현재 카테고리 상세는 `판단 근거` 문구를 함께 노출하는 사용자 설명형 surface다.

### 4. Next proxy와 클라이언트 데이터 경계

- 브라우저는 `src/lib/api-client.ts`를 통해 same-origin route(동일 출처 라우트)만 호출한다.
- Next route는 `WOOGOOK_BACKEND_BASE_URL` 기준으로 backend FastAPI로 relay(전달)한다.
- 현재 관련 route file(라우트 파일)은 아래다.
  - `src/app/api/assembly/v1/members/route.ts`
  - `src/app/api/assembly/v1/members/[mona_cd]/card/route.ts`
  - `src/app/api/assembly/v1/members/[mona_cd]/pledge-summary/route.ts`
  - `src/app/api/assembly/v1/members/[mona_cd]/pledges/route.ts`
- 현재 `assembly` frontend에는 local sample fallback(로컬 샘플 대체 경로)이 없다.
  - backend proxy가 열려 있지 않으면 실제 데이터 surface는 실패한다.

## 현재 팀이 이 문서를 어떻게 읽어야 하는가

- entry 폼과 selection UX(선택 UX)를 바꾸는 작업이면 아래 순서로 읽는다.
  - `src/features/assembly/components/AssemblyPledgeForm.tsx`
  - `src/lib/api-client.ts`
  - `docs/assembly/notes/current/assembly-current-status-brief.md`
- 이행률 요약 카드와 category rate 화면을 바꾸는 작업이면 아래 순서로 읽는다.
  - `src/features/assembly/AssemblyPledgeRatePage.tsx`
  - `src/lib/schemas.ts`
  - backend의 `app/schemas/assembly.py`
- 카테고리별 공약 상세를 바꾸는 작업이면 아래 순서로 읽는다.
  - `src/features/assembly/AssemblyPledgeCategoryTopPage.tsx`
  - `src/features/assembly/assemblyPledgeQuery.ts`
  - backend의 `GET /api/assembly/v1/members/{mona_cd}/pledges` 계약

## 확인한 사실

- `assembly` frontend는 현재 backend read API와 실제로 연결돼 있다.
- `tests/assembly_proxy_route.test.ts`는 assembly proxy route가 backend path를 올바르게 전달하는지 확인한다.
- 현재 selection surface(선택 화면)는 `서울특별시·강동구`만 실제 제품 범위로 해석해야 한다.
- `/assembly/pledge/category`는 단순 목록이 아니라 `promise_id` deep link를 통한 특정 공약 강조까지 포함한다.

## 아직 아닌 것

- 전국 단위 browse(전국 탐색) 화면은 아직 아니다.
- 자유 검색(search), 비교(compare), 추천(recommendation) 같은 상위 탐색 기능은 아직 없다.
- backend 없이도 끝까지 체험하는 sample mode(샘플 모드)는 아직 없다.
- `assembly` frontend가 agentic evaluation(에이전틱 평가) runtime을 직접 호출하는 구조는 아직 아니다.
  - 현재는 backend가 정리해 준 read API payload를 소비하는 구조다.

## 현재 검증 기준

- route 또는 화면 contract(계약)를 바꾸면 아래를 기본으로 본다.
  - `npm run lint`
  - 필요하면 `npm run build`
  - `node --test tests/assembly_proxy_route.test.ts`
- 문서만 바꿀 때도 아래는 최소 수동 점검한다.
  - 쿼리 파라미터 이름이 `mona_cd` 기준인지
  - 링크 경로가 `/assembly`, `/assembly/pledge`, `/assembly/pledge/category`와 맞는지
  - `서울특별시·강동구` 현재 범위를 과장해서 쓰지 않았는지

## 참고 경로

- `docs/assembly/canonical/llm-entry.md`
- `docs/assembly/onboarding/assembly-team-onboarding.md`
- `src/app/assembly/page.tsx`
- `src/app/assembly/pledge/page.tsx`
- `src/app/assembly/pledge/category/page.tsx`
- `src/features/assembly/components/AssemblyPledgeForm.tsx`
- `src/features/assembly/AssemblyPledgeRatePage.tsx`
- `src/features/assembly/AssemblyPledgeCategoryTopPage.tsx`
- `src/lib/api-client.ts`
- `tests/assembly_proxy_route.test.ts`
