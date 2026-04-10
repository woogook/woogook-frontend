# Local Election Front Compare Seed And Autoprompt First Slice Design

## Goal

`woogook-frontend`의 compare 진입에서 empty issue profile seed와 issue-first auto prompt를 분리해, no-issue 상태에서는 nullable `issue_profile_snapshot=null` 계약을 유지하고 active issue가 있을 때만 issue-first assistant flow를 시작시킨다.

## Background

- 현재 `LocalElectionPage`는 저장된 관심 이슈가 없어도 `makeEmptyIssueProfile(...)`를 만들어 compare 관련 뷰에 넘긴다.
- 현재 `CompareView`는 assistant drawer를 처음 열면 active issue 유무와 무관하게 `내 관심 이슈 기준으로 다시 요약해줘`를 자동 전송한다.
- backend는 `issue_profile_snapshot`이 없는 snapshot-dependent 질문을 fail-closed하도록 이미 계약화되어 있지만, frontend가 empty object를 non-null로 보내면 이 보호막이 의미적으로 우회된다.

## Decision

### 1. Issue editing draft와 runtime snapshot을 분리한다

- `IssueStep` 초기 렌더에는 계속 non-null `makeEmptyIssueProfile(...)`을 사용한다.
- compare, candidate, compare scope, detail처럼 runtime compare context를 소비하는 경로에는 active issue가 실제로 있을 때만 non-null snapshot을 전달한다.

### 2. Issue-first auto prompt는 active issue가 있을 때만 1회 보낸다

- assistant drawer open 시 active issue가 있으면 기존 기본 질문을 자동 전송한다.
- active issue가 없으면 auto prompt를 보내지 않고, 사용자가 generic prompt chip 또는 자유 입력으로 시작하게 둔다.

### 3. Compare chat cache signature는 snapshot 존재 여부를 포함한다

- 기존 signature는 empty snapshot과 null snapshot이 모두 빈 배열로 직렬화돼 같은 session storage key를 공유한다.
- `hasIssueProfileSnapshot` 신호를 포함해 stale empty-snapshot conversation 재사용을 끊는다.

## Scope

### In

- `src/app/data.ts`
- `src/features/local-election/LocalElectionPage.tsx`
- `src/app/components/CompareView.tsx`

### Out

- backend route/evidence 수정
- compare assistant 전면 UX 개편
- 새 테스트 인프라 도입
- recommendation logic 추가

## Verification

- `npm run lint`
- no-issue compare에서 assistant open 시 자동 메시지 미전송
- active issue compare에서 첫 open 시 issue-first 메시지 1회 전송
- no-issue/active-issue 전환 시 compare chat cache가 다른 key로 분리
