# Next.js 최소 스택 도입

## 배경

- 현재 프로젝트는 `Next.js + React + TypeScript + Tailwind + pg` 중심의 최소 구성으로 운영되고 있었다.
- 주소 선택 화면은 `useEffect + fetch`로 시/도, 구/군, 읍/면/동 목록을 직접 불러왔고, 메인 화면도 투표지 조회를 수동 `fetch`로 처리하고 있었다.
- API 입력과 응답 타입은 TypeScript 타입에만 의존하고 있어 런타임 검증 지점이 없었다.
- UI는 커스텀 구현이 잘 되어 있었지만 공용 상호작용 컴포넌트 계층은 아직 없었다.

## 변경 사항

- `zod`를 추가하고 `src/lib/schemas.ts`에 주소 조회 파라미터, 지역 목록 응답, 투표지 응답 스키마를 정의했다.
- 지역/투표지 API 라우트에서 `safeParse`와 응답 스키마 검증을 적용했다.
- `@tanstack/react-query`를 추가하고 `src/app/providers.tsx`에서 전역 `QueryClientProvider`를 연결했다.
- `src/lib/api-client.ts`를 추가해 지역 목록/투표지 조회를 공통 fetch 함수와 query option으로 분리했다.
- 주소 입력 화면을 `useQuery` 기반 의존 쿼리 구조로 바꾸고, 네트워크 실패 시 기본 목록 fallback을 캐시 가능한 형태로 정리했다.
- `shadcn/ui` 최소 기반으로 `Button`, `Tabs`, `Alert`, `cn` 유틸을 추가하고, 메인 탭/버튼/알림 UI에 연결했다.
- `README.md`를 기본 템플릿에서 현재 프로젝트 구조에 맞는 설명으로 교체했다.

## 검증

- `npm run lint`
  - 성공
  - 기존 `src/app/components/CandidateCards.tsx`의 `img` 사용 경고 1건은 유지
- `npx tsc --noEmit`
  - 실행 후 결과 확인 예정

## 후속 메모

- `react-hook-form`은 아직 도입하지 않았다. 현재 폼 복잡도에서는 `useState`가 충분하다.
- `shadcn/ui`는 전체 UI 교체가 아니라 상호작용 계층만 최소 도입했다.
- 주소 선택 `select`는 모바일 친화성과 현재 디자인을 고려해 네이티브 `select`를 유지했다.
- 이후 후보 비교 필터, 검색, 공유 URL 상태가 늘어나면 `nuqs` 또는 `react-hook-form` 도입을 재검토할 수 있다.

## 기타

### git

- git convention을 준수한 브랜치 이름 후보 3개
  - `codex/feat/minimal-next-stack`
  - `codex/feat/react-query-zod-foundation`
  - `codex/feat/shadcn-query-validation`
- git convention을 준수한 구체적인 커밋 메시지 (prefix 포함)
  - `feat(frontend): add zod schemas react-query data flow and shadcn ui foundation`
- git convention을 준수한 구체적인 PR 본문 내용 (title 포함)
  - Title: `feat(frontend): apply zod, react-query, and shadcn/ui minimal stack`
  - Body:
    - `## 배경`
    - `주소 선택과 투표지 조회가 수동 fetch 중심으로 구성되어 있어 입력 검증, 캐시, 공용 UI 계층이 부족했습니다.`
    - `## 변경 사항`
    - `- zod 기반 공용 스키마 추가`
    - `- 지역/투표지 API 입력 및 응답 검증 연결`
    - `- React Query provider 및 query option 추가`
    - `- 주소 선택 화면을 의존 쿼리 구조로 전환`
    - `- shadcn/ui Button, Tabs, Alert 최소 도입`
    - `- README 프로젝트 구조 기준으로 갱신`
    - `## 검증`
    - `- npm run lint`
    - `- npx tsc --noEmit`
