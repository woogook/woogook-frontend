# Assembly 공약 이행률 — 의원 메타 카드 API 연동 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/assembly/pledge?city=…&sigungu=…&mona_cd=…` 화면에서 프로필(이름·당·선거구·위원회·선거공보 PDF 등)을 채우기 위해 `GET /api/assembly/v1/members/{mona_cd}/card` 백엔드 API를 연동한다.

**Architecture:** 브라우저는 백엔드에 직접 붙지 않고 Next API 라우트를 거친다. `proxyToBackend`로 FastAPI(`WOOGOOK_BACKEND_BASE_URL`)에 전달한다. 프론트는 Zod 스키마 + React Query로 `mona_cd`가 있을 때만 카드 API를 호출한다. 기존 목록용(`GET …/members/{id}`)과는 별도 엔드포인트다.

**Tech Stack:** Next.js App Router, React Query(`@tanstack/react-query`), Zod, 공통 `fetchJson` / `api-client` 패턴.

---

## 범위 표

| 구분 | 경로 | 역할 |
|------|------|------|
| Next 라우트 (신규) | `src/app/api/assembly/v1/members/[mona_cd]/card/route.ts` | `GET` → `{BACKEND}/api/assembly/v1/members/{mona_cd}/card` |
| 스키마 | `src/lib/schemas.ts` | `assemblyMemberMetaCardSchema` + 타입 export |
| API 클라이언트 | `src/lib/api-client.ts` | `fetchAssemblyMemberMetaCard`, `assemblyMemberMetaCardQueryOptions` |
| 페이지 | `src/features/assembly/AssemblyPledgeRatePage.tsx` | 카드 조회, 로딩·에러·폴백 UI 반영 |
| (선택) | `src/features/assembly/AssemblyPledgeCategoryTopPage.tsx` | 동일 카드 데이터가 필요하면 재사용 또는 후속 |

참고: 목록용 프록시는 `src/app/api/assembly/v1/members/route.ts`에 이미 있다.

---

## API·필드 매핑

응답 `AssemblyMemberMetaCard` 필드와 UI 매핑:

- `name` → 표시 이름(기존 `demoName` 대체)
- `election_count_text` → “제 N선 …” 등(기존 `demoTerms`)
- `party_name` + `district_label` → `"{party} · {district}"` 한 줄(기존 `demoAffiliation`; `null`이면 `—` 등 처리)
- `profile_image_url` → 외부 `<img>`, 실패 시 플레이스홀더 `User` 아이콘
- `campaign_booklet_pdf_url` → 있으면 링크 우선. 없을 때만 `getAssembly22CampaignBookletPublicPdfUrl()` 등 폴백(주의: **API 우선**, env는 보조/개발용)
- `current_committee_name` → 있으면 위원회 한 줄 표시

`selectionNote`는 `mona_cd`와 함께 **선택 지역 문구만** 유지해도 되고, 카드와 중복되면 정리한다(선택 사항).

---

### Task 1: Next 카드 프록시

**Files:**

- Create: `src/app/api/assembly/v1/members/[mona_cd]/card/route.ts`

- [ ] **Step 1:** `members/route.ts`와 동일하게 `proxyToBackend` 사용.
- [ ] **Step 2:** `GET`에서 `params.mona_cd`를 `encodeURIComponent`로 이스케이프한 뒤
  `pathWithQuery = `/api/assembly/v1/members/${encoded}/card`` 로 전달.
- [ ] **Step 3:** 로콜에서 `curl http://localhost:3000/api/assembly/v1/members/68P7228G/card` (`WOOGOOK_BACKEND_BASE_URL` 가정)으로 200/JSON 확인.

---

### Task 2: Zod 스키마

**Files:**

- Modify: `src/lib/schemas.ts`

- [ ] **Step 1:** 필드: `member_mona_cd`, `name`, `party_name`, `profile_image_url`, `district_label`, `current_committee_name`, `election_count_text`, `campaign_booklet_pdf_url` (백엔드 계약에 맞쳐 null 허용, optional은 실제 응답에 맞게).
- [ ] **Step 2:** `export type AssemblyMemberMetaCard = z.infer<typeof assemblyMemberMetaCardSchema>`.

---

### Task 3: API 클라이언트 + React Query

**Files:**

- Modify: `src/lib/api-client.ts`

- [ ] **Step 1:** `fetchAssemblyMemberMetaCard(monaCd: string)` → `fetchJson(\`/api/assembly/v1/members/${encodeURIComponent(monaCd)}/card\`, schema)`.
- [ ] **Step 2:** `assemblyMemberMetaCardQueryOptions(monaCd: string)` — `queryKey: ["assembly", "member", "card", monaCd]`, `enabled: monaCd.trim().length > 0`, `staleTime`은 짧게(예: 5분).
- [ ] **Step 3:** `retry: 0` 등 assembly 카드 호출 정책 정리.

---

### Task 4: `AssemblyPledgeRatePage` 반영

**Files:**

- Modify: `src/features/assembly/AssemblyPledgeRatePage.tsx`

- [ ] **Step 1:** `useQuery(assemblyMemberMetaCardQueryOptions(monaCdRaw ?? ""))` — `mona_cd` 없으면 enabled false, 스켈레톤·폴백 UX 유지.
- [ ] **Step 2:** 성공 시: 카드 필드로 프로필 영역 + 공보 버튼 갱신.
- [ ] **Step 3:** 에러/404: 사용자 메시지(“의원 정보를 불러오지 못했습니다” 등).
- [ ] **Step 4:** 접근성: 프로필·공보·`aria-label`에 `name` 반영 등.
- [ ] **Step 5:** 수동 검증
  `http://localhost:3000/assembly/pledge?city=서울특별시&sigungu=강동구&mona_cd=68P7228G`
  에서 이름·이미지·공보 링크 확인.

---

### Task 5 (선택): 카테고리 상세 헤더

**Files:**

- Modify: `src/features/assembly/AssemblyPledgeCategoryTopPage.tsx` 또는 공통 `AssemblyMemberProfileHeader.tsx` 추출

- [ ] **Step 1:** 동일 `mona_cd`로 카드 쿼리를 공유해 상단에 의원 요약이 필요하면 연동.

---

## 에지·운영 체크리스트

- [ ] `mona_cd` 빈 값: 요청 없이 폴백(데모 이름 등).
- [ ] 백엔드 503(`WOOGOOK_BACKEND_BASE_URL` 오류): 사용자 안내 문구.
- [ ] 프로필 이미지 URL: Next `next.config` `images.remotePatterns` 필요 시 설정(현재는 `<img>` 직접 사용 시 CORS/도메인 주의).

---

## 환경 변수

- **백엔드(서버):** `WOOGOOK_BACKEND_BASE_URL` — Next API가 호출하는 FastAPI 베이스 URL(로컬 예: `http://127.0.0.1:8000`).
- **선택:** `NEXT_PUBLIC_ASSEMBLY22_CAMPAIGN_BOOKLET_PDF_URL` — API에 `campaign_booklet_pdf_url`이 없을 때만 쓰는 폴백 PDF.

---

## `/write-plan` 안내

Cursor에서 **`/write-plan` 커맨드는 deprecated**일 수 있으므로, 본 작업은 superpowers **`writing-plans` 스킬**로 구현 계획을 쪽개는 흐름을 권장한다.
