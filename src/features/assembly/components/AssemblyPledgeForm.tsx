"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { assemblyMembersQueryOptions, sigunguQueryOptions } from "@/lib/api-client";

/** 현재 국회 공약 서비스는 서울특별시만 지원(데이터·API 시/도 명과 동일). */
const ASSEMBLY_FIXED_CITY = "서울특별시";

type SelectOption = string | { value: string; label: string };

/**
 * 지역 선택 폼 — local-election AddressInput과 동일한 셀렉트 스타일(모바일 터치 영역 48px).
 * options: 문자열 목록 또는 { value, label }(의원 선택 시 mona_cd / display_label).
 */
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
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder: string;
  options: SelectOption[];
}) {
  return (
    <div>
      <label
        className="mb-1.5 block text-[11px] font-semibold tracking-wide"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
        {sublabel ? (
          <span style={{ color: "var(--text-tertiary)" }}> {sublabel}</span>
        ) : null}
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
          {options.map((option) =>
            typeof option === "string" ? (
              <option key={option} value={option}>
                {option}
              </option>
            ) : (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ),
          )}
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
            aria-hidden="true"
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

export default function AssemblyPledgeForm() {
  const router = useRouter();
  const [district, setDistrict] = useState("");
  /** 선택한 국회의원 — API mona_cd와 동일한 값을 value로 둠. */
  const [monaCd, setMonaCd] = useState("");

  const districtsQuery = useQuery(sigunguQueryOptions(ASSEMBLY_FIXED_CITY));
  const membersQuery = useQuery(
    assemblyMembersQueryOptions(ASSEMBLY_FIXED_CITY, district),
  );

  const districts = districtsQuery.data?.items ?? [];

  const isDistrictLoading = districtsQuery.isPending || districtsQuery.isFetching;
  const isMembersLoading =
    Boolean(district) && (membersQuery.isPending || membersQuery.isFetching);

  const memberOptions: SelectOption[] = district
    ? (membersQuery.data?.items ?? []).map((item) => ({
        value: item.mona_cd,
        label: item.display_label,
      }))
    : [];

  const handleDistrictChange = (nextDistrict: string) => {
    setDistrict(nextDistrict);
    setMonaCd("");
  };

  const handleSubmit = () => {
    if (!district || !monaCd) {
      return;
    }
    const params = new URLSearchParams({
      city: ASSEMBLY_FIXED_CITY,
      sigungu: district,
      mona_cd: monaCd,
    });
    router.push(`/assembly/pledge?${params.toString()}`);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col justify-center px-5 py-12">
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
            국회·지역
          </span>
        </div>

        <h1
          className="stagger-1 mb-2 animate-fade-in-up text-[1.75rem] font-bold leading-[1.25] tracking-tight"
          style={{ color: "var(--navy)" }}
        >
          우리동네 국회의원 공약 이행률 확인
        </h1>
        <p
          className="stagger-2 mb-8 animate-fade-in-up text-[14px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          현재는 서울특별시만 지원합니다. 구·군·시와 국회의원을 고르면
          <br />
          공약 이행률을 확인할 수 있습니다.
        </p>

        <div className="stagger-3 mb-5 animate-fade-in-up space-y-3">
          <div>
            <label
              className="mb-1.5 block text-[11px] font-semibold tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              시/도
              <span style={{ color: "var(--text-tertiary)" }}> (서비스 지역 고정)</span>
            </label>
            <div
              className="flex h-[48px] items-center rounded border px-3 text-[14px]"
              style={{
                background: "var(--surface-alt)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            >
              {ASSEMBLY_FIXED_CITY}
            </div>
          </div>

          <SelectField
            label="구/군/시"
            value={district}
            onChange={handleDistrictChange}
            disabled={isDistrictLoading || districts.length === 0}
            placeholder={
              isDistrictLoading
                ? "불러오는 중..."
                : districts.length === 0
                  ? "데이터 준비 중"
                  : "구/군/시 선택"
            }
            options={districts}
          />

          <SelectField
            label="국회의원 선택"
            value={monaCd}
            onChange={setMonaCd}
            disabled={!district || isMembersLoading}
            placeholder={
              !district
                ? "구·군·시를 먼저 선택하세요"
                : isMembersLoading
                  ? "불러오는 중..."
                  : memberOptions.length === 0
                    ? "해당 구에 의원 데이터가 없습니다"
                    : "국회의원을 선택하세요"
            }
            options={memberOptions}
          />
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!district || !monaCd}
          variant="primary"
          size="lg"
          className="stagger-4 w-full animate-fade-in-up"
        >
          공약 이행률 보기
        </Button>


        <p
          className="stagger-6 mt-6 animate-fade-in-up text-[10px] leading-relaxed"
          style={{ color: "var(--text-tertiary)" }}
        >
          국회의원 목록은 서버 데이터를 사용합니다.
          <br />
          공약·이행 데이터 출처는 순차 안내 예정입니다. 특정 정당·후보를 지지하지 않습니다.
        </p>
      </div>
    </section>
  );
}
