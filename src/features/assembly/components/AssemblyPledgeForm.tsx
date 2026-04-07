"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CITIES } from "@/app/data";
import {
  ApiError,
  assemblyMembersQueryOptions,
  sigunguQueryOptions,
} from "@/lib/api-client";

/** 현재 국회 공약 서비스는 서울특별시·강동구만 지원(API·데이터 명칭과 동일). */
const ASSEMBLY_FIXED_CITY = "서울특별시";
const ASSEMBLY_ALLOWED_SIGUNGU = "강동구";

type SelectOption =
  | string
  | { value: string; label: string; disabled?: boolean };

/** API 응답·캐시와 무관하게 선거구(갑→을) 순으로 맞춤 */
function compareAssemblyMembersByDistrictThenName(
  a: { district: string; member_name: string },
  b: { district: string; member_name: string },
): number {
  const byDistrict = a.district.localeCompare(b.district, "ko", {
    sensitivity: "base",
  });
  if (byDistrict !== 0) {
    return byDistrict;
  }
  return a.member_name.localeCompare(b.member_name, "ko", {
    sensitivity: "base",
  });
}

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
  includeEmptyOption = true,
}: {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder: string;
  options: SelectOption[];
  /** false면 빈 value 옵션을 넣지 않음(시·도처럼 항상 값이 고정될 때). */
  includeEmptyOption?: boolean;
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
          className="h-[48px] w-full cursor-pointer appearance-none rounded px-3 pr-9 text-[14px] disabled:opacity-40 [&_option:disabled]:text-slate-300 [&_option]:bg-white [&_option]:text-neutral-950"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: value ? "var(--foreground)" : "var(--text-tertiary)",
            /* 네이티브 드롭다운이 다크/시스템 톤으로 회색 글씨가 되는 경우 완화 */
            colorScheme: "light",
          }}
        >
          {includeEmptyOption ? (
            <option value="" style={{ color: "var(--text-tertiary)" }}>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) =>
            typeof option === "string" ? (
              <option
                key={option}
                value={option}
                style={{ color: "#0a0a0a", backgroundColor: "#ffffff" }}
              >
                {option}
              </option>
            ) : (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled === true}
                style={
                  option.disabled === true
                    ? undefined
                    : { color: "#0a0a0a", backgroundColor: "#ffffff" }
                }
              >
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
  /** 선택한 국회의원 — API mona_cd와 동일한 값을 value로 둠. */
  const [monaCd, setMonaCd] = useState("");

  const districtsQuery = useQuery(sigunguQueryOptions(ASSEMBLY_FIXED_CITY));

  const districts = districtsQuery.data?.items ?? [];

  /** 서비스 범위: 강동구만 실제 선택값으로 사용(.pen·기획과 동일). */
  const districtValue =
    districts.length > 0 && districts.includes(ASSEMBLY_ALLOWED_SIGUNGU)
      ? ASSEMBLY_ALLOWED_SIGUNGU
      : "";

  const membersQuery = useQuery(
    assemblyMembersQueryOptions(ASSEMBLY_FIXED_CITY, districtValue),
  );

  const isDistrictLoading = districtsQuery.isPending || districtsQuery.isFetching;
  const isMembersLoading =
    Boolean(districtValue) &&
    (membersQuery.isPending || membersQuery.isFetching);

  const membersFetchErrorMessage =
    membersQuery.isError && membersQuery.error instanceof ApiError
      ? membersQuery.error.message
      : membersQuery.isError
        ? "의원 목록을 불러오지 못했습니다."
        : null;

  const memberOptions: SelectOption[] = districtValue
    ? [...(membersQuery.data?.items ?? [])]
        .sort(compareAssemblyMembersByDistrictThenName)
        .map((item) => ({
          value: item.mona_cd,
          label: item.display_label,
        }))
    : [];

  const sidoOptions: SelectOption[] = CITIES.map((name) => ({
    value: name,
    label: name,
    disabled: name !== ASSEMBLY_FIXED_CITY,
  }));

  const sigunguOptions: SelectOption[] = districts.map((name) => ({
    value: name,
    label: name,
    disabled: name !== ASSEMBLY_ALLOWED_SIGUNGU,
  }));

  const handleSubmit = () => {
    if (!districtValue || !monaCd) {
      return;
    }
    const params = new URLSearchParams({
      city: ASSEMBLY_FIXED_CITY,
      sigungu: districtValue,
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
          시·도와 구·군·시를 고른 뒤 국회의원을 선택하면 공약 이행률을 확인할 수
          있습니다. 현재는 서울특별시·강동구만 선택 가능합니다.
        </p>

        <div className="stagger-3 mb-5 animate-fade-in-up space-y-3">
          <SelectField
            label="시/도"
            value={ASSEMBLY_FIXED_CITY}
            onChange={() => {}}
            disabled={false}
            placeholder="시/도 선택"
            options={sidoOptions}
            includeEmptyOption={false}
          />

          <SelectField
            label="구/군/시"
            value={districtValue}
            onChange={() => {}}
            disabled={isDistrictLoading || districts.length === 0}
            placeholder={
              isDistrictLoading
                ? "불러오는 중..."
                : districts.length === 0
                  ? "데이터 준비 중"
                  : "구/군/시 선택"
            }
            options={sigunguOptions}
            includeEmptyOption={districtValue === ""}
          />

          <SelectField
            label="국회의원 선택"
            value={monaCd}
            onChange={setMonaCd}
            disabled={
              !districtValue || isMembersLoading || Boolean(membersFetchErrorMessage)
            }
            placeholder={
              !districtValue
                ? "구·군·시를 먼저 선택하세요"
                : membersFetchErrorMessage
                  ? membersFetchErrorMessage
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
          disabled={!districtValue || !monaCd}
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
