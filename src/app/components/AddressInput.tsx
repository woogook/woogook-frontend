"use client";

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

interface Props {
  onSubmit: (city: string, district: string, dong: string) => void;
  loading?: boolean;
  error?: string | null;
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

export default function AddressInput({ onSubmit, loading, error }: Props) {
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
            2026 지방선거
          </span>
        </div>

        <h1
          className="stagger-1 mb-2 animate-fade-in-up text-[1.75rem] font-bold leading-[1.25] tracking-tight"
          style={{ color: "var(--navy)" }}
        >
          내 선거 안내서
        </h1>
        <p
          className="stagger-2 mb-8 animate-fade-in-up text-[14px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          지역을 선택하면, 이번 선거에서 받게 되는
          <br />
          투표용지와 후보자 정보를 확인할 수 있습니다.
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
          {loading ? "불러오는 중..." : "내 선거 확인하기"}
        </Button>

        {error && (
          <Alert variant="warning" className="stagger-5 mt-3 animate-fade-in-up">
            <div className="flex items-start gap-2">
              <TriangleAlert
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div>
                <AlertTitle>조회 오류</AlertTitle>
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

        <div className="stagger-6 mt-6 animate-fade-in-up">
          <p
            className="mb-2 text-[11px] font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            샘플 데이터로 미리보기
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => onSubmit("서울특별시", "강남구", "개포1동")}
              variant="secondary"
              className="h-[44px] flex-1 text-[12px] font-medium"
            >
              서울 강남구 개포1동
            </Button>
            <Button
              onClick={() => onSubmit("제주특별자치도", "제주시", "노형동")}
              variant="secondary"
              className="h-[44px] flex-1 text-[12px] font-medium"
            >
              제주 제주시 노형동
            </Button>
          </div>
        </div>

        <p
          className="stagger-7 mt-8 animate-fade-in-up text-[10px] leading-relaxed"
          style={{ color: "var(--text-tertiary)" }}
        >
          입력한 주소 정보는 선거구 매핑에만 사용됩니다.
          <br />
          출처: 중앙선거관리위원회 (2026.05.15 기준)
        </p>
      </div>
    </section>
  );
}
