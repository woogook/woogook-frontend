# feat/1 머지 충돌 해소

## 배경

- `feat/1` 브랜치에서 지방선거 통합 흐름 작업을 진행하던 중, `main`에 React Query, 공용 Zod 스키마, shadcn/ui 기반 최소 스택이 먼저 반영됐다.
- 이후 `main`을 `feat/1`에 머지하는 과정에서 지역 조회 API, 투표지 API, 주소 입력, 페이지 상태 흐름, 공용 타입 파일에서 충돌이 발생했다.
- 목표는 `main`의 새 프론트 인프라를 유지하면서, 지방선거 주소 입력, 관심 이슈 입력, 후보 비교 흐름과 DB 미기동 fallback 처리까지 보존하는 것이었다.

## 변경 사항

- `src/lib/schemas.ts`
  - 후보 브리프, 이슈 매칭, 비교 엔트리, 선거 메타, 사용자 이슈 프로필 타입/스키마를 추가했다.
  - `ballotResponseSchema`에 `meta`, `candidateRecordSchema`에 `brief`, `issue_matches`, `compare_entry`를 반영했다.
- `src/lib/api-client.ts`
  - API 오류 응답의 `message` 필드를 우선 사용하도록 바꿨다.
  - 지역 fallback 시 공통 문구 대신 실제 오류 메시지를 노출하도록 조정했다.
- `src/app/api/ballots/route.ts`
  - `main`의 `ballotsSearchParamsSchema`, `ballotResponseSchema` 검증 흐름을 유지했다.
  - DB 미기동 감지, 샘플 지역 fallback, `local_election_candidacy + member` 조회, 후보 브리프 생성, `meta` 응답을 통합했다.
- `src/app/api/regions/*/route.ts`
  - `main`의 응답 스키마 검증을 유지하면서 DB 미기동 응답을 함께 유지했다.
- `src/app/components/AddressInput.tsx`
  - `main`의 React Query 기반 지역 조회 구조를 유지했다.
  - fallback 공지, 샘플 주소 바로가기, 오류 표시를 함께 살렸다.
- `src/app/data.ts`
  - `main`의 공용 스키마 import 구조 위에 지방선거 이슈 정의, 후보 브리프 헬퍼, 선거 메타 헬퍼를 얹었다.
- `src/app/page.tsx`
  - `main`의 React Query 조회와 탭 UI를 유지했다.
  - `feat/1`의 `address -> ballot -> issues -> candidates -> compare -> detail` 흐름과 로컬 이슈 프로필 저장을 유지했다.

## 검증

- `npm run lint`
  - 에러 없이 통과
  - 기존 `src/app/components/CandidateCards.tsx`의 `<img>` warning 1건 유지
- `npm exec tsc --noEmit --pretty false`
  - 기존 프로젝트 이슈인 `TS2688: Cannot find type definition file for 'request'`로 실패
  - 이번 머지 충돌 해소 작업으로 새로 생긴 타입 오류는 확인되지 않음

## 후속 메모

- 현재 머지 충돌은 코드상 해소했지만, merge commit 자체는 아직 만들지 않았다.
- `git add` 후 merge commit만 남겨두는 방식으로 정리하는 것이 적절하다.
- `request` 타입 정의 이슈는 이번 머지와 무관한 기존 문제라 별도 정리 대상이다.

## 기타

- git
  - 브랜치 이름 후보 1: `codex/resolve-frontend-main-merge`
  - 브랜치 이름 후보 2: `codex/fix-local-election-merge-conflict`
  - 브랜치 이름 후보 3: `codex/merge-main-into-feat-1`
  - 커밋 메시지: `fix: resolve feat/1 merge conflicts with main frontend stack`
  - PR 제목: `fix: feat/1과 main 프론트 스택 머지 충돌 해소`
  - PR 본문:
    - 배경
      - `main`에 React Query, 공용 스키마, UI 라이브러리 도입 후 `feat/1`과 충돌이 발생했습니다.
    - 변경 사항
      - `main`의 프론트 스택을 유지하면서 지방선거 통합 흐름과 지역 fallback 처리를 병합했습니다.
      - `ballotResponse`/`candidateRecord` 공용 스키마에 메타와 비교 필드를 추가했습니다.
      - 지역/투표지 라우트에 스키마 검증과 DB 미기동 대응을 함께 반영했습니다.
    - 검증
      - `npm run lint`
      - `npm exec tsc --noEmit --pretty false` (`request` 타입 정의 이슈로 기존 실패 유지)
