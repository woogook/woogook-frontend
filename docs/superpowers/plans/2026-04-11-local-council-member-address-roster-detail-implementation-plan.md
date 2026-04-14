# 현직 지방의원 주소 기반 명단·상세 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/local-council`에서 지방선거와 같은 주소 선택 UX로 강동구 현직자 roster를 보고, 인물별 dossier 상세까지 확인한다.

**Architecture:** 주소 선택 UI는 `src/features/regions`의 공통 컴포넌트로 추출하고 `local-election`과 `local-council`이 문구만 다르게 사용한다. local-council 데이터는 Next API proxy를 우선 호출하고, backend가 없을 때는 강동구 sample fixture를 API client에서 `{ data, dataSource }` envelope로 감싸 화면에 넘긴다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, TanStack Query, Zod, Tailwind CSS utility classes.

---

## File Map

- `src/features/regions/components/RegionAddressInput.tsx`: 시/도, 구/군/시, 읍/면/동 선택 UI를 담당하는 도메인 중립 컴포넌트.
- `src/app/components/AddressInput.tsx`: 기존 지방선거 주소 화면 문구와 sample button을 유지하는 wrapper.
- `src/features/local-election/components/AddressInput.tsx`: 기존 re-export 유지.
- `src/lib/schemas.ts`: local-council resolve, roster, person dossier 응답 schema와 type 추가.
- `src/data/samples/sample_local_council_gangdong_resolve.json`: backend 없이 roster 화면을 확인할 강동구 resolve sample.
- `src/data/samples/sample_local_council_gangdong_person_dossiers.json`: backend 없이 detail 화면을 확인할 강동구 person dossier sample index.
- `scripts/validate-local-council-samples.ts`: sample fixture가 zod schema를 통과하는지 검증하는 로컬 스크립트.
- `package.json`: `test:local-council-samples` script 추가.
- `src/lib/api-client.ts`: local-council fetch 함수, address builder, local sample fallback, React Query option 추가.
- `src/app/api/local-council/v1/_shared.ts`: local-council 전용 backend proxy helper.
- `src/app/api/local-council/v1/resolve/route.ts`: resolve proxy route.
- `src/app/api/local-council/v1/persons/[personKey]/route.ts`: person dossier proxy route.
- `src/features/local-council/data.ts`: 직위, 출처, 날짜, payload 표시 helper.
- `src/features/local-council/components/LocalCouncilAddressStep.tsx`: local-council용 주소 step wrapper.
- `src/features/local-council/components/LocalCouncilRosterView.tsx`: district roster 결과 화면.
- `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`: person dossier 상세 화면.
- `src/features/local-council/LocalCouncilPage.tsx`: `address -> roster -> detail` 상태 흐름과 local-council shell.
- `src/app/local-council/page.tsx`: `/local-council` App Router entry.
- `src/app/page.tsx`: 서비스 허브에 현직 지방의원 카드 추가.

## Preflight

- [ ] **Step 1: 작업 격리 확인**

Run:

```bash
git status --short
git branch --show-current
```

Expected:

```text
 M .gitignore
?? .superpowers/
main
```

The `.gitignore` and `.superpowers/` entries are not part of this implementation. Do not stage them. If implementing in a separate worktree, create a branch named `codex/local-council-member-screen` from the current `main` head before editing code.

---

### Task 1: Extract Shared Region Address Input

**Files:**
- Create: `src/features/regions/components/RegionAddressInput.tsx`
- Modify: `src/app/components/AddressInput.tsx`
- Read only: `src/features/local-election/components/AddressInput.tsx`

- [ ] **Step 1: Make the local-election wrapper depend on the shared component**

Replace `src/app/components/AddressInput.tsx` with this content first. This intentionally references a component that does not exist yet.

```tsx
"use client";

import RegionAddressInput, {
  type RegionAddressInputSample,
} from "@/features/regions/components/RegionAddressInput";

interface Props {
  onSubmit: (city: string, district: string, dong: string) => void;
  loading?: boolean;
  error?: string | null;
}

const localElectionSamples: RegionAddressInputSample[] = [
  {
    label: "서울 강남구 개포1동",
    city: "서울특별시",
    district: "강남구",
    dong: "개포1동",
  },
  {
    label: "제주 제주시 노형동",
    city: "제주특별자치도",
    district: "제주시",
    dong: "노형동",
  },
];

export default function AddressInput({ onSubmit, loading, error }: Props) {
  return (
    <RegionAddressInput
      eyebrow="2026 지방선거"
      title="내 선거 안내서"
      description={
        <>
          지역을 선택하면, 이번 선거에서 받게 되는
          <br />
          투표용지와 후보자 정보를 확인할 수 있습니다.
        </>
      }
      submitLabel="내 선거 확인하기"
      samplesLabel="샘플 데이터로 미리보기"
      samples={localElectionSamples}
      footerNote={
        <>
          입력한 주소 정보는 선거구 매핑에만 사용됩니다.
          <br />
          출처: 중앙선거관리위원회 (2026.05.15 기준)
        </>
      }
      onSubmit={onSubmit}
      loading={loading}
      error={error}
      errorTitle="조회 오류"
    />
  );
}
```

- [ ] **Step 2: Run compile check and confirm the expected failure**

Run:

```bash
npm run lint
```

Expected: FAIL with a module resolution error mentioning `@/features/regions/components/RegionAddressInput`.

- [ ] **Step 3: Create the shared component**

Create `src/features/regions/components/RegionAddressInput.tsx` with this content.

```tsx
"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, LoaderCircle, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  citiesQueryOptions,
  emdQueryOptions,
  sigunguQueryOptions,
} from "@/lib/api-client";

export interface RegionAddressInputSample {
  label: string;
  city: string;
  district: string;
  dong?: string;
}

interface RegionAddressInputProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
  submitLabel: string;
  samplesLabel?: string;
  samples?: RegionAddressInputSample[];
  footerNote: ReactNode;
  onSubmit: (city: string, district: string, dong: string) => void;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
}

function SelectField({
  label,
  sublabel,
  value,
  onChange,
  disabled,
  placeholder,
  options,
}: {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
  options: string[];
}) {
  return (
    <div>
      <label
        className="mb-1.5 block text-[11px] font-semibold tracking-wide"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
        {sublabel && (
          <span style={{ color: "var(--text-tertiary)" }}> {sublabel}</span>
        )}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-[48px] w-full cursor-pointer appearance-none rounded px-3 pr-9 text-[14px] disabled:opacity-40"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: value ? "var(--foreground)" : "var(--text-tertiary)",
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          style={{
            color: disabled ? "var(--text-tertiary)" : "var(--text-secondary)",
          }}
        >
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function RegionAddressInput({
  eyebrow,
  title,
  description,
  submitLabel,
  samplesLabel,
  samples = [],
  footerNote,
  onSubmit,
  loading,
  error,
  errorTitle = "조회 오류",
}: RegionAddressInputProps) {
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [dong, setDong] = useState("");

  const citiesQuery = useQuery(citiesQueryOptions);
  const districtsQuery = useQuery({
    ...sigunguQueryOptions(city),
    enabled: Boolean(city),
  });
  const dongsQuery = useQuery({
    ...emdQueryOptions(city, district),
    enabled: Boolean(city) && Boolean(district),
  });

  const cities = citiesQuery.data?.items || [];
  const districts = districtsQuery.data?.items || [];
  const dongs = dongsQuery.data?.items || [];
  const regionNotice =
    dongsQuery.data?.fallbackMessage ||
    districtsQuery.data?.fallbackMessage ||
    citiesQuery.data?.fallbackMessage ||
    null;

  const isCityLoading = citiesQuery.isPending;
  const isDistrictLoading = Boolean(city) && districtsQuery.isFetching;
  const isDongLoading = Boolean(city) && Boolean(district) && dongsQuery.isFetching;

  const handleSubmit = () => {
    if (city && district) {
      onSubmit(city, district, dong || "");
    }
  };

  const handleCityChange = (nextCity: string) => {
    setCity(nextCity);
    setDistrict("");
    setDong("");
  };

  const handleDistrictChange = (nextDistrict: string) => {
    setDistrict(nextDistrict);
    setDong("");
  };

  return (
    <section className="flex min-h-[100dvh] flex-col justify-center px-5 py-12">
      <div className="mx-auto w-full max-w-[400px]">
        <div className="mb-5 animate-fade-in-up">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--amber)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--amber)" }}
              aria-hidden="true"
            />
            {eyebrow}
          </span>
        </div>

        <h1
          className="stagger-1 mb-2 animate-fade-in-up text-[1.75rem] font-bold leading-[1.25] tracking-tight"
          style={{ color: "var(--navy)" }}
        >
          {title}
        </h1>
        <p
          className="stagger-2 mb-8 animate-fade-in-up text-[14px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {description}
        </p>

        <div className="stagger-3 mb-5 animate-fade-in-up space-y-3">
          <SelectField
            label="시/도"
            value={city}
            onChange={handleCityChange}
            placeholder={isCityLoading ? "불러오는 중..." : "시/도 선택"}
            options={cities}
          />

          <SelectField
            label="구/군/시"
            value={district}
            onChange={handleDistrictChange}
            disabled={!city || isDistrictLoading}
            placeholder={
              !city
                ? "시/도를 먼저 선택하세요"
                : isDistrictLoading
                  ? "불러오는 중..."
                  : districts.length === 0
                    ? "데이터 준비 중"
                    : "구/군/시 선택"
            }
            options={districts}
          />

          <SelectField
            label="읍/면/동"
            sublabel="(선택)"
            value={dong}
            onChange={setDong}
            disabled={!district || isDongLoading}
            placeholder={
              !district
                ? "구/군/시를 먼저 선택하세요"
                : isDongLoading
                  ? "불러오는 중..."
                  : dongs.length === 0
                    ? "데이터 준비 중"
                    : "읍/면/동 선택"
            }
            options={dongs}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!city || !district || loading}
          variant="primary"
          size="lg"
          className="stagger-4 w-full animate-fade-in-up"
        >
          {loading && (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {loading ? "불러오는 중..." : submitLabel}
        </Button>

        {error && (
          <Alert variant="warning" className="stagger-5 mt-3 animate-fade-in-up">
            <div className="flex items-start gap-2">
              <TriangleAlert
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div>
                <AlertTitle>{errorTitle}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {regionNotice && (
          <Alert variant="info" className="stagger-5 mt-2 animate-fade-in-up">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <AlertTitle>기본 목록 사용</AlertTitle>
                <AlertDescription>{regionNotice}</AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {samples.length > 0 && (
          <div className="stagger-6 mt-6 animate-fade-in-up">
            {samplesLabel && (
              <p
                className="mb-2 text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                {samplesLabel}
              </p>
            )}
            <div className="flex gap-2">
              {samples.map((sample) => (
                <Button
                  key={`${sample.city}:${sample.district}:${sample.dong || ""}`}
                  onClick={() =>
                    onSubmit(sample.city, sample.district, sample.dong || "")
                  }
                  variant="secondary"
                  className="h-[44px] flex-1 text-[12px] font-medium"
                >
                  {sample.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <p
          className="stagger-7 mt-8 animate-fade-in-up text-[10px] leading-relaxed"
          style={{ color: "var(--text-tertiary)" }}
        >
          {footerNote}
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Verify local-election still compiles**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/regions/components/RegionAddressInput.tsx src/app/components/AddressInput.tsx
git commit -m "refactor(regions): 주소 선택 컴포넌트 공통화"
```

---

### Task 2: Add Local-Council Schemas, Samples, And Fixture Validation

**Files:**
- Modify: `src/lib/schemas.ts`
- Create: `src/data/samples/sample_local_council_gangdong_resolve.json`
- Create: `src/data/samples/sample_local_council_gangdong_person_dossiers.json`
- Create: `scripts/validate-local-council-samples.ts`
- Modify: `package.json`

- [ ] **Step 1: Add the failing fixture validation script**

Create `scripts/validate-local-council-samples.ts` with this content.

```ts
import resolveSample from "../src/data/samples/sample_local_council_gangdong_resolve.json";
import personSamples from "../src/data/samples/sample_local_council_gangdong_person_dossiers.json";
import {
  localCouncilPersonDossierResponseSchema,
  localCouncilResolveResponseSchema,
} from "../src/lib/schemas";

localCouncilResolveResponseSchema.parse(resolveSample);

const dossiers = Object.values(personSamples);
if (dossiers.length < 2) {
  throw new Error("expected at least two local council person dossier samples");
}

for (const dossier of dossiers) {
  localCouncilPersonDossierResponseSchema.parse(dossier);
}

console.log(`validated ${dossiers.length} local council person dossier samples`);
```

Modify `package.json` scripts by adding `test:local-council-samples` after `agents:validate`.

```json
"agents:validate": "python3 scripts/validate_agents_harness.py",
"test:local-council-samples": "rm -rf tmp/local-council-validation && tsc scripts/validate-local-council-samples.ts --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --resolveJsonModule --outDir tmp/local-council-validation --rootDir . --skipLibCheck && node tmp/local-council-validation/scripts/validate-local-council-samples.js"
```

- [ ] **Step 2: Run validation and confirm the expected failure**

Run:

```bash
npm run test:local-council-samples
```

Expected: FAIL because the sample JSON files and local-council schemas do not exist yet.

- [ ] **Step 3: Add local-council schemas**

In `src/lib/schemas.ts`, add this block after `assemblyMemberListResponseSchema`.

```ts
const localCouncilPayloadObjectSchema = z.record(z.string(), z.unknown());

export const localCouncilDataSourceSchema = z.enum(["backend", "local_sample"]);

export const localCouncilDistrictRefSchema = z.object({
  gu_code: z.string(),
  district_slug: z.string(),
  district_name: z.string().nullable().optional(),
});

export const localCouncilRosterPersonSchema = z
  .object({
    person_key: z.string(),
    office_type: z.string(),
    person_name: z.string(),
    party_name: z.string().nullable().optional(),
    profile_image_url: z.string().nullable().optional(),
  })
  .catchall(z.unknown());

export const localCouncilDistrictRosterResponseSchema = z.object({
  district_head: localCouncilRosterPersonSchema.or(localCouncilPayloadObjectSchema),
  council_members: z.array(localCouncilRosterPersonSchema),
  source_coverage: localCouncilPayloadObjectSchema,
  freshness: localCouncilPayloadObjectSchema,
});

export const localCouncilResolveResponseSchema = z.object({
  resolution_status: z.literal("resolved"),
  district: localCouncilDistrictRefSchema,
  roster: localCouncilDistrictRosterResponseSchema,
});

export const localCouncilPersonSummarySchema = z
  .object({
    headline: z.string(),
    grounded_summary: z.string(),
    summary_mode: z.enum(["agentic", "fallback", "none"]),
    summary_basis: localCouncilPayloadObjectSchema,
  })
  .catchall(z.unknown());

export const localCouncilPersonDossierResponseSchema = z.object({
  person_name: z.string(),
  office_type: z.string(),
  summary: localCouncilPersonSummarySchema,
  official_profile: localCouncilPayloadObjectSchema,
  committees: z.array(localCouncilPayloadObjectSchema),
  bills: z.array(localCouncilPayloadObjectSchema),
  meeting_activity: z.array(localCouncilPayloadObjectSchema),
  finance_activity: z.array(localCouncilPayloadObjectSchema),
  elected_basis: localCouncilPayloadObjectSchema,
  source_refs: z.array(localCouncilPayloadObjectSchema),
  freshness: localCouncilPayloadObjectSchema,
});
```

At the bottom of `src/lib/schemas.ts`, add these exported types after the existing assembly types.

```ts
export type LocalCouncilDataSource = z.infer<typeof localCouncilDataSourceSchema>;
export type LocalCouncilDistrictRef = z.infer<typeof localCouncilDistrictRefSchema>;
export type LocalCouncilRosterPerson = z.infer<typeof localCouncilRosterPersonSchema>;
export type LocalCouncilDistrictRosterResponse = z.infer<
  typeof localCouncilDistrictRosterResponseSchema
>;
export type LocalCouncilResolveResponse = z.infer<
  typeof localCouncilResolveResponseSchema
>;
export type LocalCouncilPersonSummary = z.infer<typeof localCouncilPersonSummarySchema>;
export type LocalCouncilPersonDossierResponse = z.infer<
  typeof localCouncilPersonDossierResponseSchema
>;
```

- [ ] **Step 4: Add the resolve sample fixture**

Create `src/data/samples/sample_local_council_gangdong_resolve.json` with this content.

```json
{
  "resolution_status": "resolved",
  "district": {
    "gu_code": "11740",
    "district_slug": "seoul-gangdong",
    "district_name": "서울특별시 강동구"
  },
  "roster": {
    "district_head": {
      "person_key": "seoul-gangdong:district-head",
      "office_type": "basic_head",
      "person_name": "이수희",
      "party_name": "국민의힘",
      "profile_image_url": null
    },
    "council_members": [
      {
        "person_key": "seoul-gangdong:council-member:600000001",
        "office_type": "basic_council",
        "person_name": "김가동",
        "party_name": "예시정당",
        "profile_image_url": "/photos/member-001.jpg"
      },
      {
        "person_key": "seoul-gangdong:council-member:600000002",
        "office_type": "basic_council",
        "person_name": "이나리",
        "party_name": "다른정당",
        "profile_image_url": null
      }
    ],
    "source_coverage": {
      "district_head_official_profile": "present",
      "district_head_official_activity": "present",
      "district_head_finance_activity": "present",
      "council_member_elected_basis": "present",
      "council_member_official_activity": "present"
    },
    "freshness": {
      "basis_kind": "source_fetched_at",
      "basis_timestamp": "2026-04-08T10:10:00+09:00"
    }
  }
}
```

- [ ] **Step 5: Add the person dossier sample fixture**

Create `src/data/samples/sample_local_council_gangdong_person_dossiers.json` with this content.

```json
{
  "seoul-gangdong:district-head": {
    "person_name": "이수희",
    "office_type": "basic_head",
    "summary": {
      "headline": "이수희 공식 근거 요약",
      "grounded_summary": "공식 프로필, 의안, 회의록, 재정 활동 근거를 바탕으로 요약했다.",
      "summary_mode": "agentic",
      "summary_basis": {
        "source_kinds": [
          "nec_current_holder",
          "gangdong_district_head_official_profile",
          "gangdong_council_official_activity",
          "local_finance_365"
        ]
      }
    },
    "official_profile": {
      "office_label": "강동구청장",
      "official_profile_sections": [
        {
          "section_title": "인사말",
          "headline": "힘찬 변화, 자랑스러운 강동"
        }
      ]
    },
    "committees": [],
    "bills": [
      {
        "bill_title": "서울특별시 강동구립도서관 설치 및 운영 조례 일부개정조례안",
        "proposed_at": "2026-04-07"
      }
    ],
    "meeting_activity": [
      {
        "session_label": "제322회 임시회",
        "meeting_date": "2026-03-25(수)"
      }
    ],
    "finance_activity": [
      {
        "title": "강동구 예산 집행 내역",
        "amount": 1250000
      }
    ],
    "elected_basis": {
      "election_id": "0020220601"
    },
    "source_refs": [
      {
        "source_kind": "nec_current_holder",
        "role": "elected_basis"
      },
      {
        "source_kind": "gangdong_district_head_official_profile",
        "role": "official_profile"
      },
      {
        "source_kind": "gangdong_council_official_activity",
        "role": "official_activity"
      },
      {
        "source_kind": "local_sample",
        "role": "local_preview"
      }
    ],
    "freshness": {
      "basis_timestamp": "2026-04-08T10:10:00+09:00"
    }
  },
  "seoul-gangdong:council-member:600000001": {
    "person_name": "김가동",
    "office_type": "basic_council",
    "summary": {
      "headline": "김가동 공식 근거 요약",
      "grounded_summary": "공식 프로필과 의안, 회의 활동 근거를 바탕으로 요약했다.",
      "summary_mode": "fallback",
      "summary_basis": {
        "source_kinds": [
          "local_council_portal_members",
          "nec_council_elected_basis",
          "gangdong_council_official_activity"
        ]
      }
    },
    "official_profile": {
      "office_label": "강동구의원"
    },
    "committees": [
      {
        "committee_name": "행정복지위원회"
      }
    ],
    "bills": [
      {
        "bill_name": "서울특별시 강동구 예시 조례안",
        "bill_date": "2026-04-01"
      },
      {
        "bill_name": "서울특별시 강동구 청년 지원 조례안",
        "bill_date": "2026-03-20",
        "source_kind": "gangdong_council_official_activity"
      }
    ],
    "meeting_activity": [
      {
        "meeting_name": "제320회 임시회 본회의",
        "meeting_date": "2026-04-03"
      }
    ],
    "finance_activity": [],
    "elected_basis": {
      "huboid": "600000001",
      "sgTypecode": "6"
    },
    "source_refs": [
      {
        "source_kind": "local_council_portal_members",
        "role": "profile"
      },
      {
        "source_kind": "nec_council_elected_basis",
        "role": "elected_basis"
      },
      {
        "source_kind": "gangdong_council_official_activity",
        "role": "official_activity"
      },
      {
        "source_kind": "local_sample",
        "role": "local_preview"
      }
    ],
    "freshness": {
      "basis_timestamp": "2026-04-08T10:05:00+09:00"
    }
  },
  "seoul-gangdong:council-member:600000002": {
    "person_name": "이나리",
    "office_type": "basic_council",
    "summary": {
      "headline": "이나리 공식 근거 요약",
      "grounded_summary": "당선 근거와 의회 공식 활동 근거를 기준으로 확인 가능한 정보를 요약했다.",
      "summary_mode": "fallback",
      "summary_basis": {
        "source_kinds": [
          "local_council_portal_members",
          "nec_council_elected_basis"
        ]
      }
    },
    "official_profile": {
      "office_label": "강동구의원"
    },
    "committees": [],
    "bills": [],
    "meeting_activity": [],
    "finance_activity": [],
    "elected_basis": {
      "huboid": "600000002",
      "sgTypecode": "6"
    },
    "source_refs": [
      {
        "source_kind": "local_council_portal_members",
        "role": "profile"
      },
      {
        "source_kind": "nec_council_elected_basis",
        "role": "elected_basis"
      },
      {
        "source_kind": "local_sample",
        "role": "local_preview"
      }
    ],
    "freshness": {
      "basis_timestamp": "2026-04-08T10:05:00+09:00"
    }
  }
}
```

- [ ] **Step 6: Run fixture validation**

Run:

```bash
npm run test:local-council-samples
```

Expected:

```text
validated 3 local council person dossier samples
```

- [ ] **Step 7: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json src/lib/schemas.ts src/data/samples/sample_local_council_gangdong_resolve.json src/data/samples/sample_local_council_gangdong_person_dossiers.json scripts/validate-local-council-samples.ts
git commit -m "test(local-council): 강동구 샘플 fixture 검증 추가"
```

---

### Task 3: Add Local-Council API Client With Local Sample Fallback

**Files:**
- Modify: `src/lib/api-client.ts`

- [ ] **Step 1: Add imports**

In `src/lib/api-client.ts`, add these imports near the existing sample and schema imports.

```ts
import sampleLocalCouncilGangdongResolve from "@/data/samples/sample_local_council_gangdong_resolve.json";
import sampleLocalCouncilGangdongPersonDossiers from "@/data/samples/sample_local_council_gangdong_person_dossiers.json";
```

Change the zod import at the top of `src/lib/api-client.ts` from:

```ts
import type { ZodType } from "zod";
```

to:

```ts
import { z, type ZodType } from "zod";
```

Add these schema and type imports to the existing `@/lib/schemas` import list.

```ts
  localCouncilPersonDossierResponseSchema,
  localCouncilResolveResponseSchema,
  type LocalCouncilDataSource,
  type LocalCouncilPersonDossierResponse,
  type LocalCouncilResolveResponse,
```

- [ ] **Step 2: Add fallback-aware local-council functions**

Append this block before `createLocalElectionChatConversation`.

```ts
export type LocalCouncilResult<T> = {
  data: T;
  dataSource: LocalCouncilDataSource;
};

type LocalCouncilAddressSelection = {
  city: string;
  district: string;
  dong?: string;
};

const sampleLocalCouncilPersonDossierIndex = z
  .record(z.string(), localCouncilPersonDossierResponseSchema)
  .parse(sampleLocalCouncilGangdongPersonDossiers);

export function buildLocalCouncilAddress({
  city,
  district,
  dong,
}: LocalCouncilAddressSelection) {
  return [city, district, dong].map((part) => part?.trim()).filter(Boolean).join(" ");
}

function isGangdongSelection({ city, district }: LocalCouncilAddressSelection) {
  return city.trim() === "서울특별시" && district.trim() === "강동구";
}

function isBackendUnavailableError(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === 503;
  }
  return error instanceof TypeError;
}

export async function fetchLocalCouncilResolve(
  selection: LocalCouncilAddressSelection,
): Promise<LocalCouncilResult<LocalCouncilResolveResponse>> {
  const address = buildLocalCouncilAddress(selection);
  const query = new URLSearchParams({ address });

  try {
    const data = await fetchJson(
      `/api/local-council/v1/resolve?${query.toString()}`,
      localCouncilResolveResponseSchema,
    );
    return { data, dataSource: "backend" };
  } catch (error) {
    if (isBackendUnavailableError(error) && isGangdongSelection(selection)) {
      return {
        data: localCouncilResolveResponseSchema.parse(sampleLocalCouncilGangdongResolve),
        dataSource: "local_sample",
      };
    }

    if (isBackendUnavailableError(error)) {
      throw new ApiError(
        503,
        "현재 로컬 미리보기는 서울특별시 강동구만 준비되어 있습니다.",
      );
    }

    throw error;
  }
}

export async function fetchLocalCouncilPerson(
  personKey: string,
): Promise<LocalCouncilResult<LocalCouncilPersonDossierResponse>> {
  try {
    const data = await fetchJson(
      `/api/local-council/v1/persons/${encodeURIComponent(personKey)}`,
      localCouncilPersonDossierResponseSchema,
    );
    return { data, dataSource: "backend" };
  } catch (error) {
    const sample = sampleLocalCouncilPersonDossierIndex[personKey];
    if (isBackendUnavailableError(error) && sample) {
      return {
        data: sample,
        dataSource: "local_sample",
      };
    }
    throw error;
  }
}

export function localCouncilResolveQueryOptions(selection: LocalCouncilAddressSelection) {
  return queryOptions({
    queryKey: [
      "local-council",
      "resolve",
      selection.city,
      selection.district,
      selection.dong ?? "",
    ],
    queryFn: () => fetchLocalCouncilResolve(selection),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export function localCouncilPersonQueryOptions(personKey: string) {
  return queryOptions({
    queryKey: ["local-council", "person", personKey],
    queryFn: () => fetchLocalCouncilPerson(personKey),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}
```

- [ ] **Step 3: Run checks**

Run:

```bash
npm run test:local-council-samples
npm run lint
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "feat(local-council): 로컬 샘플 fallback API client 추가"
```

---

### Task 4: Add Local-Council Next Proxy Routes

**Files:**
- Create: `src/app/api/local-council/v1/_shared.ts`
- Create: `src/app/api/local-council/v1/resolve/route.ts`
- Create: `src/app/api/local-council/v1/persons/[personKey]/route.ts`

- [ ] **Step 1: Create the proxy helper**

Create `src/app/api/local-council/v1/_shared.ts` with this content.

```ts
import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.WOOGOOK_BACKEND_BASE_URL?.trim().replace(
  /\/$/,
  "",
);

export function buildMissingLocalCouncilBackendResponse() {
  return NextResponse.json(
    {
      error: "Missing WOOGOOK_BACKEND_BASE_URL",
      message: "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    },
    { status: 503 },
  );
}

export async function proxyLocalCouncilToBackend(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (!BACKEND_BASE_URL) {
    return buildMissingLocalCouncilBackendResponse();
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
    });

    const body = await response.text();
    const headers = new Headers();
    headers.set(
      "content-type",
      response.headers.get("content-type") || "application/json; charset=utf-8",
    );

    return new Response(body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("[local-council/proxy] error", error);
    return NextResponse.json(
      {
        error: "Local council backend unavailable",
        message: "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 503 },
    );
  }
}
```

- [ ] **Step 2: Create the resolve route**

Create `src/app/api/local-council/v1/resolve/route.ts` with this content.

```ts
import { NextResponse } from "next/server";

import { proxyLocalCouncilToBackend } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address")?.trim();

  if (!address) {
    return NextResponse.json(
      {
        error: "address is required",
        message: "지역 정보가 필요합니다.",
      },
      { status: 400 },
    );
  }

  const query = new URLSearchParams({ address });
  return proxyLocalCouncilToBackend(`/api/local-council/v1/resolve?${query.toString()}`);
}
```

- [ ] **Step 3: Create the person route**

Create `src/app/api/local-council/v1/persons/[personKey]/route.ts` with this content.

```ts
import { proxyLocalCouncilToBackend } from "../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ personKey: string }> },
) {
  const { personKey } = await context.params;

  return proxyLocalCouncilToBackend(
    `/api/local-council/v1/persons/${encodeURIComponent(personKey)}`,
  );
}
```

- [ ] **Step 4: Run checks**

Run:

```bash
npm run lint
npm run build
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/local-council/v1/_shared.ts src/app/api/local-council/v1/resolve/route.ts 'src/app/api/local-council/v1/persons/[personKey]/route.ts'
git commit -m "feat(local-council): backend proxy route 추가"
```

---

### Task 5: Add Local-Council Data Helpers And Roster View

**Files:**
- Create: `src/features/local-council/data.ts`
- Create: `src/features/local-council/components/LocalCouncilAddressStep.tsx`
- Create: `src/features/local-council/components/LocalCouncilRosterView.tsx`

- [ ] **Step 1: Create data helpers**

Create `src/features/local-council/data.ts` with this content.

```ts
import type {
  LocalCouncilDataSource,
  LocalCouncilPersonDossierResponse,
  LocalCouncilRosterPerson,
} from "@/lib/schemas";

export function getLocalCouncilOfficeLabel(officeType: string) {
  const labels: Record<string, string> = {
    basic_head: "구청장",
    basic_council: "구의원",
    metro_council: "시·도의원",
  };
  return labels[officeType] || officeType;
}

export function getLocalCouncilSummaryModeLabel(
  summaryMode: LocalCouncilPersonDossierResponse["summary"]["summary_mode"],
) {
  const labels: Record<
    LocalCouncilPersonDossierResponse["summary"]["summary_mode"],
    string
  > = {
    agentic: "근거 요약",
    fallback: "기본 요약",
    none: "요약 없음",
  };
  return labels[summaryMode];
}

export function getLocalCouncilDataSourceLabel(dataSource: LocalCouncilDataSource) {
  return dataSource === "local_sample" ? "로컬 미리보기 데이터" : "공식 근거 데이터";
}

export function getLocalCouncilSourceLabel(sourceKind: string) {
  const labels: Record<string, string> = {
    nec_current_holder: "중앙선거관리위원회 현직자 근거",
    nec_council_elected_basis: "중앙선거관리위원회 당선 근거",
    local_council_portal_members: "지방의정포털 의원 정보",
    gangdong_district_head_official_profile: "강동구청장실 공식 프로필",
    gangdong_council_official_activity: "강동구의회 공식 활동",
    local_finance_365: "지방재정365",
    local_sample: "로컬 미리보기 샘플",
  };
  return labels[sourceKind] || sourceKind;
}

export function getLocalCouncilFreshnessLabel(freshness: Record<string, unknown>) {
  const timestamp = freshness.basis_timestamp;
  if (typeof timestamp !== "string" || !timestamp.trim()) {
    return "기준 시각 확인 필요";
  }
  return `기준 ${timestamp}`;
}

export function getRosterPersonInitial(person: LocalCouncilRosterPerson) {
  return person.person_name.slice(0, 1) || "?";
}

export function getPayloadText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (typeof value === "number") {
      return value.toLocaleString("ko-KR");
    }
  }
  return null;
}
```

- [ ] **Step 2: Create the address step wrapper**

Create `src/features/local-council/components/LocalCouncilAddressStep.tsx` with this content.

```tsx
"use client";

import RegionAddressInput, {
  type RegionAddressInputSample,
} from "@/features/regions/components/RegionAddressInput";

interface LocalCouncilAddressStepProps {
  onSubmit: (city: string, district: string, dong: string) => void;
  loading?: boolean;
  error?: string | null;
}

const localCouncilSamples: RegionAddressInputSample[] = [
  {
    label: "서울 강동구 천호동",
    city: "서울특별시",
    district: "강동구",
    dong: "천호동",
  },
];

export default function LocalCouncilAddressStep({
  onSubmit,
  loading,
  error,
}: LocalCouncilAddressStepProps) {
  return (
    <RegionAddressInput
      eyebrow="지방의원"
      title="우리동네 지방의원을 확인하세요"
      description="지역을 선택하면 구청장과 구의원의 공식 근거 요약을 확인할 수 있습니다."
      submitLabel="지방의원 확인하기"
      samplesLabel="로컬 미리보기"
      samples={localCouncilSamples}
      footerNote="입력한 지역 정보는 현직자 조회에만 사용됩니다."
      onSubmit={onSubmit}
      loading={loading}
      error={error}
      errorTitle="조회 오류"
    />
  );
}
```

- [ ] **Step 3: Create the roster view**

Create `src/features/local-council/components/LocalCouncilRosterView.tsx` with this content.

```tsx
"use client";

import type {
  LocalCouncilDataSource,
  LocalCouncilResolveResponse,
  LocalCouncilRosterPerson,
} from "@/lib/schemas";
import {
  getLocalCouncilDataSourceLabel,
  getLocalCouncilFreshnessLabel,
  getLocalCouncilOfficeLabel,
  getRosterPersonInitial,
} from "@/features/local-council/data";

interface LocalCouncilRosterViewProps {
  resolveData: LocalCouncilResolveResponse;
  dataSource: LocalCouncilDataSource;
  onSelectPerson: (person: LocalCouncilRosterPerson) => void;
  onBack: () => void;
}

function PersonCard({
  person,
  onSelect,
}: {
  person: LocalCouncilRosterPerson;
  onSelect: (person: LocalCouncilRosterPerson) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(person)}
      className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 text-left active:opacity-70"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-lg text-sm font-bold"
        style={{
          background: "var(--amber-bg)",
          color: "var(--amber)",
          border: "1px solid var(--border)",
        }}
      >
        {person.profile_image_url ? (
          <span className="sr-only">{person.person_name}</span>
        ) : (
          getRosterPersonInitial(person)
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[16px] font-bold" style={{ color: "var(--navy)" }}>
          {person.person_name}
        </p>
        <p className="mt-1 truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>
          {getLocalCouncilOfficeLabel(person.office_type)}
          {person.party_name ? ` · ${person.party_name}` : ""}
        </p>
      </div>
      <span
        className="rounded-full border px-2.5 py-1 text-[12px] font-semibold"
        style={{ borderColor: "var(--border)", color: "var(--navy)" }}
      >
        상세
      </span>
    </button>
  );
}

export default function LocalCouncilRosterView({
  resolveData,
  dataSource,
  onSelectPerson,
  onBack,
}: LocalCouncilRosterViewProps) {
  const districtHead =
    "person_key" in resolveData.roster.district_head
      ? (resolveData.roster.district_head as LocalCouncilRosterPerson)
      : null;
  const members = resolveData.roster.council_members;

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 rounded-lg border px-3 py-2 text-sm font-semibold"
        style={{ borderColor: "var(--border)", color: "var(--navy)" }}
      >
        지역 다시 선택
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--amber)" }}>
            {getLocalCouncilDataSourceLabel(dataSource)}
          </p>
          <h1 className="mt-2 text-3xl font-bold" style={{ color: "var(--navy)" }}>
            {resolveData.district.district_name || "서울특별시 강동구"}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            {getLocalCouncilFreshnessLabel(resolveData.roster.freshness)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-xl font-bold" style={{ color: "var(--navy)" }}>
              {districtHead ? 1 : 0}
            </p>
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              구청장
            </p>
          </div>
          <div className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-xl font-bold" style={{ color: "var(--navy)" }}>
              {members.length}
            </p>
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              구의원
            </p>
          </div>
        </div>
      </div>

      {dataSource === "local_sample" && (
        <p
          className="mt-5 rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--amber-bg)", color: "var(--navy)" }}
        >
          backend 없이 frontend만 실행 중이라 강동구 샘플 데이터로 미리보기합니다.
        </p>
      )}

      <div className="mt-8 grid gap-6">
        <section>
          <h2 className="mb-3 text-xl font-bold" style={{ color: "var(--navy)" }}>
            구청장
          </h2>
          {districtHead ? (
            <PersonCard person={districtHead} onSelect={onSelectPerson} />
          ) : (
            <p className="rounded-lg border p-4 text-sm" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              구청장 정보가 아직 준비되지 않았습니다.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold" style={{ color: "var(--navy)" }}>
            구의원
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((member) => (
              <PersonCard key={member.person_key} person={member} onSelect={onSelectPerson} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run checks**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/local-council/data.ts src/features/local-council/components/LocalCouncilAddressStep.tsx src/features/local-council/components/LocalCouncilRosterView.tsx
git commit -m "feat(local-council): 주소 입력과 roster 화면 추가"
```

---

### Task 6: Add Detail View, LocalCouncilPage, And Route

**Files:**
- Create: `src/features/local-council/components/LocalCouncilPersonDetailView.tsx`
- Create: `src/features/local-council/LocalCouncilPage.tsx`
- Create: `src/app/local-council/page.tsx`

- [ ] **Step 1: Create the detail view**

Create `src/features/local-council/components/LocalCouncilPersonDetailView.tsx` with this content.

```tsx
"use client";

import type {
  LocalCouncilDataSource,
  LocalCouncilPersonDossierResponse,
} from "@/lib/schemas";
import {
  getLocalCouncilDataSourceLabel,
  getLocalCouncilFreshnessLabel,
  getLocalCouncilOfficeLabel,
  getLocalCouncilSourceLabel,
  getLocalCouncilSummaryModeLabel,
  getPayloadText,
} from "@/features/local-council/data";

interface LocalCouncilPersonDetailViewProps {
  person: LocalCouncilPersonDossierResponse;
  dataSource: LocalCouncilDataSource;
  onBack: () => void;
}

function EmptyState() {
  return (
    <p className="rounded-lg border p-4 text-sm" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
      공식 근거가 아직 준비되지 않았습니다.
    </p>
  );
}

function RecordList({
  title,
  records,
  titleKeys,
  metaKeys,
}: {
  title: string;
  records: Record<string, unknown>[];
  titleKeys: string[];
  metaKeys: string[];
}) {
  return (
    <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <h2 className="mb-3 text-xl font-bold" style={{ color: "var(--navy)" }}>
        {title}
      </h2>
      {records.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3">
          {records.map((record, index) => (
            <div key={`${title}:${index}`} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
              <p className="font-bold" style={{ color: "var(--navy)" }}>
                {getPayloadText(record, titleKeys) || "제목 확인 필요"}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {getPayloadText(record, metaKeys) || "세부 정보 확인 필요"}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function LocalCouncilPersonDetailView({
  person,
  dataSource,
  onBack,
}: LocalCouncilPersonDetailViewProps) {
  const profileSections = Array.isArray(person.official_profile.official_profile_sections)
    ? person.official_profile.official_profile_sections.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 rounded-lg border px-3 py-2 text-sm font-semibold"
        style={{ borderColor: "var(--border)", color: "var(--navy)" }}
      >
        명단으로 돌아가기
      </button>

      <div className="rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border px-2.5 py-1 text-[12px] font-semibold" style={{ borderColor: "var(--border)", color: "var(--amber)" }}>
            {getLocalCouncilDataSourceLabel(dataSource)}
          </span>
          <span className="rounded-full border px-2.5 py-1 text-[12px] font-semibold" style={{ borderColor: "var(--border)", color: "var(--navy)" }}>
            {getLocalCouncilSummaryModeLabel(person.summary.summary_mode)}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-bold" style={{ color: "var(--navy)" }}>
          {person.person_name}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          {getLocalCouncilOfficeLabel(person.office_type)}
        </p>
        <h2 className="mt-6 text-xl font-bold" style={{ color: "var(--navy)" }}>
          {person.summary.headline}
        </h2>
        <p className="mt-3 text-[15px] leading-7" style={{ color: "var(--foreground)" }}>
          {person.summary.grounded_summary}
        </p>
        <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          {getLocalCouncilFreshnessLabel(person.freshness)}
        </p>
      </div>

      {dataSource === "local_sample" && (
        <p
          className="mt-5 rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--amber-bg)", color: "var(--navy)" }}
        >
          이 상세 정보는 frontend 로컬 작업을 위한 샘플 데이터입니다.
        </p>
      )}

      <div className="mt-6 grid gap-4">
        <RecordList
          title="공식 프로필"
          records={profileSections}
          titleKeys={["headline", "section_title", "office_label"]}
          metaKeys={["section_title", "office_label"]}
        />
        <RecordList
          title="위원회"
          records={person.committees}
          titleKeys={["committee_name", "name"]}
          metaKeys={["role", "term"]}
        />
        <RecordList
          title={person.office_type === "basic_head" ? "공식 활동" : "의안"}
          records={person.bills}
          titleKeys={["bill_title", "bill_name", "title"]}
          metaKeys={["proposed_at", "bill_date", "source_kind"]}
        />
        <RecordList
          title="회의"
          records={person.meeting_activity}
          titleKeys={["session_label", "meeting_name", "title"]}
          metaKeys={["meeting_date", "date"]}
        />
        <RecordList
          title="재정 활동"
          records={person.finance_activity}
          titleKeys={["title", "name"]}
          metaKeys={["amount", "date"]}
        />
        <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="mb-3 text-xl font-bold" style={{ color: "var(--navy)" }}>
            출처
          </h2>
          {person.source_refs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-wrap gap-2">
              {person.source_refs.map((source, index) => {
                const sourceKind =
                  typeof source.source_kind === "string" ? source.source_kind : "unknown";
                return (
                  <span
                    key={`${sourceKind}:${index}`}
                    className="rounded-full border px-3 py-1.5 text-[13px]"
                    style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                  >
                    {getLocalCouncilSourceLabel(sourceKind)}
                  </span>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create the page controller**

Create `src/features/local-council/LocalCouncilPage.tsx` with this content.

```tsx
"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";

import {
  fetchLocalCouncilPerson,
  fetchLocalCouncilResolve,
  type LocalCouncilResult,
} from "@/lib/api-client";
import type {
  LocalCouncilPersonDossierResponse,
  LocalCouncilResolveResponse,
  LocalCouncilRosterPerson,
} from "@/lib/schemas";
import LocalCouncilAddressStep from "@/features/local-council/components/LocalCouncilAddressStep";
import LocalCouncilPersonDetailView from "@/features/local-council/components/LocalCouncilPersonDetailView";
import LocalCouncilRosterView from "@/features/local-council/components/LocalCouncilRosterView";

type View = "address" | "roster" | "detail";

export default function LocalCouncilPage() {
  const [view, setView] = useState<View>("address");
  const [resolveResult, setResolveResult] =
    useState<LocalCouncilResult<LocalCouncilResolveResponse> | null>(null);
  const [personResult, setPersonResult] =
    useState<LocalCouncilResult<LocalCouncilPersonDossierResponse> | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const rootStyle: CSSProperties = {
    background: "var(--background)",
    ["--nav-height" as string]: "60px",
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [view]);

  const navigate = (nextView: View) => {
    setView(nextView);
    window.history.pushState({ view: nextView }, "");
  };

  useEffect(() => {
    window.history.replaceState({ view: "address" }, "");
    const handlePopState = (event: PopStateEvent) => {
      const targetView = event.state?.view as View | undefined;
      setView(targetView || "address");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleAddressSubmit = async (city: string, district: string, dong: string) => {
    setLoading(true);
    setError(null);
    setDetailError(null);
    setResolveResult(null);
    setPersonResult(null);

    try {
      const result = await fetchLocalCouncilResolve({ city, district, dong });
      setResolveResult(result);
      navigate("roster");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "현직자 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPerson = async (person: LocalCouncilRosterPerson) => {
    setDetailLoading(true);
    setDetailError(null);
    setPersonResult(null);

    try {
      const result = await fetchLocalCouncilPerson(person.person_key);
      setPersonResult(result);
      navigate("detail");
    } catch (err) {
      console.error(err);
      setDetailError(
        err instanceof Error ? err.message : "선택한 인물 정보를 찾지 못했습니다.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col" style={rootStyle}>
      <div
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(249,248,245,0.94)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div
          className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5"
          style={{ height: "var(--nav-height)" }}
        >
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight" style={{ color: "var(--navy)" }}>
              우리동네 지방의원
            </p>
            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-snug" style={{ color: "var(--text-secondary)" }}>
              현직 지방의원 서비스
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <Link href="/" className="rounded-lg border px-3 py-1.5" style={{ borderColor: "var(--border)" }}>
              서비스 허브
            </Link>
            <Link href="/local-election" className="rounded-lg border px-3 py-1.5" style={{ borderColor: "var(--border)" }}>
              지방선거
            </Link>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {view === "address" && (
          <LocalCouncilAddressStep
            onSubmit={handleAddressSubmit}
            loading={loading}
            error={error}
          />
        )}
        {view === "roster" && resolveResult && (
          <>
            <LocalCouncilRosterView
              resolveData={resolveResult.data}
              dataSource={resolveResult.dataSource}
              onSelectPerson={handleSelectPerson}
              onBack={() => navigate("address")}
            />
            {detailLoading && (
              <p className="mx-auto max-w-5xl px-5 pb-8 text-sm" style={{ color: "var(--text-secondary)" }}>
                인물 정보를 불러오는 중입니다.
              </p>
            )}
            {detailError && (
              <p className="mx-auto max-w-5xl px-5 pb-8 text-sm" style={{ color: "var(--warning-text)" }}>
                {detailError}
              </p>
            )}
          </>
        )}
        {view === "detail" && personResult && (
          <LocalCouncilPersonDetailView
            person={personResult.data}
            dataSource={personResult.dataSource}
            onBack={() => navigate("roster")}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the route**

Create `src/app/local-council/page.tsx` with this content.

```tsx
import type { Metadata } from "next";

import LocalCouncilPage from "@/features/local-council/LocalCouncilPage";

export const metadata: Metadata = {
  title: "우리동네 지방의원",
  description: "주소 기반 현직 지방의원 명단과 공식 근거 요약",
};

export default function LocalCouncilRoutePage() {
  return <LocalCouncilPage />;
}
```

- [ ] **Step 4: Run checks**

Run:

```bash
npm run lint
npm run build
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/local-council/components/LocalCouncilPersonDetailView.tsx src/features/local-council/LocalCouncilPage.tsx src/app/local-council/page.tsx
git commit -m "feat(local-council): dossier 상세 화면 추가"
```

---

### Task 7: Add Service Hub Entry And Final Verification

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add the service card**

In `src/app/page.tsx`, add this object to `serviceCards` after the local-election card.

```ts
  {
    href: "/local-council",
    label: "현직 지방의원",
    title: "우리동네 지방의원",
    description: "주소 기반으로 구청장과 구의원의 공식 근거 요약을 확인합니다.",
  },
```

Change the grid class from `md:grid-cols-2` to `md:grid-cols-3`.

- [ ] **Step 2: Run final static verification**

Run:

```bash
npm run test:local-council-samples
npm run lint
npm run build
```

Expected:

```text
validated 3 local council person dossier samples
```

`npm run lint` and `npm run build` should exit with code 0.

- [ ] **Step 3: Run local frontend smoke check**

Run:

```bash
npm run dev
```

Expected: Next prints a local URL, usually `http://localhost:3000`.

Open `/local-council`, click `서울 강동구 천호동`, confirm:

- roster 화면으로 이동한다.
- `로컬 미리보기 데이터` 배지가 보인다 when `WOOGOOK_BACKEND_BASE_URL` is unset.
- 구청장 1명과 구의원 2명이 보인다.
- `김가동`을 클릭하면 dossier 상세 화면으로 이동한다.
- 상세 화면에 `공식 프로필`, `위원회`, `의안`, `회의`, `재정 활동`, `출처` 섹션이 보인다.

Stop the dev server before finishing the task.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(local-council): 서비스 허브 진입점 추가"
```

---

## Self-Review Checklist

- [ ] Spec coverage: 공통 주소 UX, 강동구 roster, person detail, local sample fallback, source badge, 강동구 외 fallback 안내, local-election 회귀 검증이 각각 Task 1-7에 매핑된다.
- [ ] Placeholder scan: plan contains no forbidden placeholder terms or unspecified file paths.
- [ ] Type consistency: `LocalCouncilResult<T>`, `LocalCouncilDataSource`, `LocalCouncilResolveResponse`, `LocalCouncilPersonDossierResponse`, `LocalCouncilRosterPerson` are defined before UI tasks use them.
- [ ] Verification: each implementation task has at least one command with expected outcome and a commit step.
