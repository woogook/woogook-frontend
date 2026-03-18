# woogook-frontend

`2026 지방선거` 유권자 지원을 위한 Next.js 프런트엔드입니다.
주소를 입력하면 해당 지역의 투표용지와 후보자 정보를 확인하고 비교할 수 있습니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다.

## 현재 스택

- `Next.js 16` + `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Zod`
- `@tanstack/react-query`
- `shadcn/ui` 최소 구성 (`Button`, `Tabs`, `Alert`)
- `pg`

## 이번 구조 정리

- API 라우트 입력/응답 검증은 `src/lib/schemas.ts`에서 관리합니다.
- 클라이언트 fetch와 캐시는 `src/lib/api-client.ts`와 `React Query`를 사용합니다.
- UI 공용 컴포넌트는 `src/components/ui` 아래에 둡니다.

## 주요 화면

- 주소 선택: `src/app/components/AddressInput.tsx`
- 투표지 조회: `src/app/api/ballots/route.ts`
- 메인 화면: `src/app/page.tsx`
