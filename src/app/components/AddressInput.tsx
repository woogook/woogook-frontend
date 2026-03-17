"use client";

import { useState, useEffect } from "react";
import { CITIES, DISTRICTS, DONGS } from "../data";

interface Props {
  onSubmit: (city: string, district: string, dong: string) => void;
  loading?: boolean;
  error?: string | null;
}

// Custom select wrapper with dropdown arrow
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
      <label className="block text-[11px] font-semibold tracking-wide mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {label}
        {sublabel && <span style={{ color: "var(--text-tertiary)" }}> {sublabel}</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-[48px] px-3 pr-9 text-[14px] rounded appearance-none cursor-pointer disabled:opacity-40"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: value ? "var(--foreground)" : "var(--text-tertiary)",
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {/* Dropdown arrow */}
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: disabled ? "var(--text-tertiary)" : "var(--text-secondary)" }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
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

  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [dongs, setDongs] = useState<string[]>([]);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [regionLoading, setRegionLoading] = useState({ city: false, district: false, dong: false });

  useEffect(() => {
    const loadCities = async () => {
      setRegionLoading((prev) => ({ ...prev, city: true }));
      setRegionError(null);
      try {
        const res = await fetch("/api/regions/cities");
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { cities: string[] };
        setCities(data.cities);
      } catch (e) {
        console.error(e);
        setCities([...CITIES]);
        setRegionError("지역 목록을 불러오지 못해 기본 목록을 사용합니다.");
      } finally {
        setRegionLoading((prev) => ({ ...prev, city: false }));
      }
    };
    loadCities();
  }, []);

  useEffect(() => {
    const loadSigungu = async () => {
      if (!city) {
        setDistricts([]);
        setDongs([]);
        setDistrict("");
        setDong("");
        return;
      }
      setRegionLoading((prev) => ({ ...prev, district: true }));
      setRegionError(null);
      try {
        const res = await fetch(`/api/regions/sigungu?city=${encodeURIComponent(city)}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { sigungu: string[] };
        setDistricts(data.sigungu);
      } catch (e) {
        console.error(e);
        setDistricts(DISTRICTS[city] || []);
        setRegionError("구/군 목록을 불러오지 못해 기본 목록을 사용합니다.");
      } finally {
        setDistrict("");
        setDong("");
        setDongs([]);
        setRegionLoading((prev) => ({ ...prev, district: false }));
      }
    };
    loadSigungu();
  }, [city]);

  useEffect(() => {
    const loadDongs = async () => {
      if (!city || !district) {
        setDongs([]);
        setDong("");
        return;
      }
      setRegionLoading((prev) => ({ ...prev, dong: true }));
      setRegionError(null);
      try {
        const res = await fetch(`/api/regions/emd?city=${encodeURIComponent(city)}&sigungu=${encodeURIComponent(district)}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { emd: string[] };
        setDongs(data.emd);
      } catch (e) {
        console.error(e);
        setDongs(DONGS[district] || []);
        setRegionError("동 목록을 불러오지 못해 기본 목록을 사용합니다.");
      } finally {
        setDong("");
        setRegionLoading((prev) => ({ ...prev, dong: false }));
      }
    };
    loadDongs();
  }, [city, district]);

  const handleSubmit = () => {
    if (city && district) {
      onSubmit(city, district, dong || "");
    }
  };

  return (
    <section className="min-h-[100dvh] flex flex-col justify-center px-5 py-12">
      <div className="w-full max-w-[400px] mx-auto">
        {/* Badge */}
        <div className="animate-fade-in-up mb-5">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase"
            style={{ color: "var(--amber)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--amber)" }} aria-hidden="true" />
            2026 지방선거
          </span>
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-in-up stagger-1 text-[1.75rem] leading-[1.25] font-bold tracking-tight mb-2"
          style={{ color: "var(--navy)" }}
        >
          내 선거 안내서
        </h1>
        <p
          className="animate-fade-in-up stagger-2 text-[14px] leading-relaxed mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          지역을 선택하면, 이번 선거에서 받게 되는<br />
          투표용지와 후보자 정보를 확인할 수 있습니다.
        </p>

        {/* Select inputs */}
        <div className="animate-fade-in-up stagger-3 space-y-3 mb-5">
          <SelectField
            label="시/도"
            value={city}
            onChange={(v) => { setCity(v); setDistrict(""); setDong(""); }}
            placeholder={regionLoading.city ? "불러오는 중..." : "시/도 선택"}
            options={cities}
          />

          <SelectField
            label="구/군/시"
            value={district}
            onChange={(v) => { setDistrict(v); setDong(""); }}
            disabled={!city || regionLoading.district}
            placeholder={
              !city
                ? "시/도를 먼저 선택하세요"
                : regionLoading.district
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
            disabled={!district || regionLoading.dong}
            placeholder={
              !district
                ? "구/군/시를 먼저 선택하세요"
                : regionLoading.dong
                  ? "불러오는 중..."
                  : dongs.length === 0
                    ? "데이터 준비 중"
                    : "읍/면/동 선택"
            }
            options={dongs}
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!city || !district || loading}
          className="animate-fade-in-up stagger-4 w-full h-[52px] text-[15px] font-semibold rounded transition-all disabled:opacity-35 cursor-pointer text-white active:scale-[0.98]"
          style={{ background: "var(--navy)" }}
        >
          {loading ? "불러오는 중..." : "내 선거 확인하기"}
        </button>

        {error && (
          <p className="animate-fade-in-up stagger-5 text-[12px] mt-3 leading-relaxed" style={{ color: "var(--warning-text)" }}>
            {error}
          </p>
        )}
        {regionError && (
          <p className="animate-fade-in-up stagger-5 text-[12px] mt-2 leading-relaxed" style={{ color: "var(--warning-text)" }}>
            {regionError}
          </p>
        )}

        {/* Quick access */}
        <div className="animate-fade-in-up stagger-6 mt-6">
          <p className="text-[11px] font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
            샘플 데이터로 미리보기
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onSubmit("서울특별시", "강남구", "개포1동")}
              className="flex-1 h-[44px] text-[12px] font-medium rounded cursor-pointer transition-colors active:scale-[0.98]"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              서울 강남구 개포1동
            </button>
            <button
              onClick={() => onSubmit("제주특별자치도", "제주시", "노형동")}
              className="flex-1 h-[44px] text-[12px] font-medium rounded cursor-pointer transition-colors active:scale-[0.98]"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              제주 제주시 노형동
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p
          className="animate-fade-in-up stagger-7 text-[10px] mt-8 leading-relaxed"
          style={{ color: "var(--text-tertiary)" }}
        >
          입력한 주소 정보는 선거구 매핑에만 사용됩니다.<br />
          출처: 중앙선거관리위원회 (2026.05.15 기준)
        </p>
      </div>
    </section>
  );
}
