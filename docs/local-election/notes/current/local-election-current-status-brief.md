# 지방선거 frontend 현재 현황

- 문서 유형: `notes`
- 소유 도메인: `local-election`
- 문서 surface: `shared`
- 주요 독자: `human, LLM agent`
- 상태: `active`
- 관련 PR: `#17`
- 정본 여부: `아니오`
- 연결된 정본 문서: `docs/local-election/canonical/llm-entry.md`
- 최종 갱신일: `2026-04-15`

## 이 문서의 역할

- 이 문서는 `woogook-frontend`의 `local-election` 도메인에서 지금 구현된 사용자 흐름과 데이터 경계를 사람이 빠르게 파악하기 위한 current status brief다.
- 현재 frontend는 `주소 입력 화면`만 있는 상태가 아니라, compare flow(후보 비교 흐름)와 compare assistant(비교 도우미)까지 포함한 하나의 상호작용 surface를 가진다.
- 다만 backend와 직접 연결되는 부분과 frontend 저장소 내부 Node route(노드 라우트)에서 해결하는 부분이 섞여 있으므로, 데이터 경계를 같이 봐야 한다.

## 한눈에 보는 현재 상태

- 현재 사용자 흐름은 아래 단계로 이어진다.
  - `address`
  - `ballot`
  - `issues`
  - `candidates`
  - `compare_scope`
  - `compare`
  - `detail`
- 현재 데이터 경계는 둘로 나뉜다.
  - ballot read(투표지 조회)
    - frontend 저장소의 `GET /api/ballots`가 직접 처리한다.
  - compare assistant(비교 도우미)
    - same-origin proxy(동일 출처 프록시)로 backend `local-election chat API`를 호출한다.
- 현재 기본 active dataset(활성 데이터셋)은 `2026 지방선거`다.
  - `src/lib/local-election-config.ts` 기준 기본값은 `le2026_precandidate`
  - `WOOGOOK_LOCAL_ELECTION_ACTIVE_DATASET=le2022_candidate_local`일 때만 2022 local candidate(2022 로컬 후보) 경로를 일부 따라간다.

## 현재 구현된 기능

### 1. 메인 화면 흐름(`/local-election`)

- 메인 page는 `src/app/local-election/page.tsx`와 `src/features/local-election/LocalElectionPage.tsx`가 담당한다.
- 현재 흐름은 아래처럼 읽으면 된다.
  - 주소 입력
    - 시·도, 구·군·시, 읍·면·동을 선택한다.
  - ballot 화면
    - address 기준으로 contest 목록과 후보 목록을 본다.
  - issues 화면
    - 사용자 관심 이슈(issue profile(이슈 프로필))를 만든다.
  - candidates 화면
    - 후보 카드와 핵심 요약을 본다.
  - compare_scope 화면
    - 후보가 많을 때 비교 범위를 고른다.
  - compare 화면
    - 후보 비교 표와 compare assistant를 사용한다.
  - detail 화면
    - 후보 1명의 상세 정보를 본다.
- 후보 수가 적을 때와 많을 때의 흐름이 다르다.
  - 후보가 3명 이하이면
    - `compare`로 바로 들어간다.
  - 후보가 4명 이상이면
    - `compare_scope`를 거쳐 비교 범위를 정한다.

### 2. Ballot read 경계(`/api/ballots`)

- ballot read는 backend proxy가 아니라 frontend 저장소 내부 route가 직접 담당한다.
- 현재 관련 구현 경계는 아래다.
  - route
    - `src/app/api/ballots/route.ts`
  - client fetch
    - `src/lib/api-client.ts`
    - `fetchBallots(...)`
    - `ballotsQueryOptions(...)`
- 현재 `/api/ballots` route는 아래 일을 한 번에 한다.
  - local Postgres에서 contest/candidate를 읽는다.
  - candidate artifact(후보 보강 정보)를 붙인다.
    - promise overlay(공약 보강)
    - news overlay(뉴스 보강)
  - DB가 unavailable(접속 불가)일 때는 일부 sample payload로 fallback(대체)한다.
- 현재 sample fallback은 일반적인 전체 주소 범위가 아니라 일부 고정 주소만 지원한다.
  - `서울특별시 / 강남구 / 개포1동`
    - resolved sample
  - `제주특별자치도 / 제주시 / 노형동`
    - partially ambiguous sample

### 3. Issue draft와 runtime snapshot(실행 시점 스냅샷) 분리

- 현재 `LocalElectionPage`는 issue editing draft(이슈 편집 draft)와 runtime snapshot을 분리한다.
- 의미는 아래와 같다.
  - issue draft
    - `IssueStep` 편집 화면에서는 항상 non-null draft를 쓸 수 있다.
  - active issue snapshot
    - compare, candidate, detail 같은 runtime surface에는 실제 active issue(선택된 이슈)가 있을 때만 non-null snapshot을 넘긴다.
- 이 분리가 중요한 이유는 아래와 같다.
  - issue가 없는 사용자를 억지로 `empty issue profile` 흐름으로 보지 않기 위해
  - compare assistant가 no-issue 상태를 generic compare(일반 비교)로 읽게 하기 위해

### 4. Compare surface와 compare assistant

- compare 화면의 핵심 구현은 `src/app/components/CompareView.tsx`다.
- 현재 compare surface는 아래를 제공한다.
  - scope banner(비교 범위 배너)
  - issue context(관심 이슈 문맥) 요약
  - compare overview(한눈 요약)
  - section-based compare table(섹션 기반 비교 표)
  - difference-first toggle(차이 먼저 보기)
  - floating compare assistant(플로팅 비교 도우미)
- compare assistant는 아래 경로를 사용한다.
  - `POST /api/local-election/v1/chat/conversations`
  - `GET /api/local-election/v1/chat/conversations/{conversationId}`
  - `POST /api/local-election/v1/chat/conversations/{conversationId}/messages`
- 이 경로들은 frontend에서 proxy만 담당한다.
  - 실제 backend base URL(백엔드 기준 URL)은 `WOOGOOK_BACKEND_BASE_URL`이다.
- 현재 compare assistant 동작에서 중요한 현재 규칙은 아래다.
  - active issue가 있을 때만 issue-first auto prompt(이슈 우선 자동 질문)를 1회 보낸다.
  - active issue가 없으면 사용자가 직접 prompt chip(프롬프트 칩)이나 자유 입력으로 시작한다.
  - compare chat cache signature(대화 캐시 시그니처)에는 issue snapshot 존재 여부가 포함된다.

### 5. Candidate detail surface

- 후보 상세 화면 본체는 `src/app/components/DetailView.tsx`다.
- 현재 detail surface는 아래 정보를 보여 준다.
  - 기본 인적 정보
    - 이름
    - 정당
    - 생년월일/나이
    - 성별
    - 직업
    - 학력
    - 주소
  - issue 기준 요약
    - active issue가 있을 때만 보인다.
  - 빠른 판단 메모
    - `summary_lines`
    - `evidence_status`
    - `promise_source_status`
    - `info_gap_flags`
  - 세부 탭
    - `career`
    - `info`
- 즉, detail 화면은 단순 원문 dump(원문 나열)가 아니라 compare와 같은 issue-aware surface(이슈 인지형 화면)다.

## 현재 팀이 이 문서를 어떻게 읽어야 하는가

- address -> ballot -> issue flow를 바꾸는 작업이면 아래 순서로 읽는다.
  - `src/features/local-election/LocalElectionPage.tsx`
  - `src/lib/api-client.ts`
  - `src/app/api/ballots/route.ts`
- compare assistant나 대화 cache(캐시)를 바꾸는 작업이면 아래 순서로 읽는다.
  - `src/app/components/CompareView.tsx`
  - `src/lib/api-client.ts`
  - backend의 `app/api/local_election/v1/chat.py`
- candidate detail과 issue summary를 바꾸는 작업이면 아래 순서로 읽는다.
  - `src/app/components/DetailView.tsx`
  - `src/features/local-election/data.ts`
  - `src/lib/schemas.ts`

## 확인한 사실

- 현재 frontend는 compare flow 전반을 하나의 client state machine(클라이언트 상태 전이)처럼 관리한다.
- ballot read는 backend proxy가 아니라 frontend 저장소 내부 route가 직접 처리한다.
- compare assistant는 반대로 backend chat API에 의존한다.
- `issue draft`와 `active issue snapshot` 분리가 이미 구현돼 있다.
- active issue가 없을 때 compare assistant auto prompt를 막는 규칙이 이미 코드에 반영돼 있다.
- 현재 저장소 안에는 `local-election` 전용 자동 회귀 테스트가 두껍게 마련돼 있지는 않다.
  - 따라서 이 도메인은 수동 smoke(수동 스모크) 비중이 아직 큰 편이다.

## 아직 아닌 것

- compare assistant에 sample fallback(샘플 대체 경로)은 없다.
  - `WOOGOOK_BACKEND_BASE_URL`이 없으면 chat API는 503으로 실패한다.
- ballot read와 compare chat이 같은 backend surface를 쓰는 구조는 아니다.
  - ballot은 frontend Node route
  - chat은 backend proxy
  를 사용한다.
- 후보 비교 결과가 특정 후보 추천(recommendation)으로 읽히는 UX는 아직 허용하지 않는다.
- 전국 단위 전면 운영이나 완전한 E2E automation(종단 자동화)은 아직 아니다.

## 현재 검증 기준

- route 또는 client contract(계약)를 바꾸면 아래를 기본으로 본다.
  - `npm run lint`
  - 필요하면 `npm run build`
- 현재 도메인은 자동 테스트가 얇으므로 아래 수동 확인이 중요하다.
  - 주소 입력 -> ballot 로딩
  - issue 저장/수정
  - 후보 비교 범위 선택
  - compare assistant open(도우미 열기)
  - no-issue / active-issue 상태별 auto prompt 차이
  - detail 화면의 issue summary / quick memo 표시

## 참고 경로

- `docs/local-election/canonical/llm-entry.md`
- `docs/local-election/specs/2026-04-10-local-election-front-compare-seed-autoprompt-first-slice-design.md`
- `src/app/local-election/page.tsx`
- `src/features/local-election/LocalElectionPage.tsx`
- `src/app/api/ballots/route.ts`
- `src/app/api/local-election/v1/chat/conversations/route.ts`
- `src/app/api/local-election/v1/chat/conversations/[conversationId]/route.ts`
- `src/app/api/local-election/v1/chat/conversations/[conversationId]/messages/route.ts`
- `src/app/components/CompareView.tsx`
- `src/app/components/DetailView.tsx`
- `src/lib/api-client.ts`
- `src/lib/local-election-config.ts`
