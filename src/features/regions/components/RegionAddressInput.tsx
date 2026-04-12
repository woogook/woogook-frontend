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
import { sortRegionOptions } from "@/features/regions/sortOptions";

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

  const cities = sortRegionOptions(citiesQuery.data?.items || []);
  const districts = sortRegionOptions(districtsQuery.data?.items || []);
  const dongs = sortRegionOptions(dongsQuery.data?.items || []);
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
