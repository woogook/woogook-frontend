"use client";

import type { CSSProperties } from "react";
import { ChevronRight, FileText, User } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  ASSEMBLY_CATEGORY_RATE_PERCENT_MOCK,
  assemblyOverallRatePercentMock,
} from "@/features/assembly/assemblyPledgeRateDemo";
import { getAssembly22CampaignBookletPublicPdfUrl } from "@/features/assembly/assemblyCampaignBookletUrl";
import { assemblyPledgeContextParams } from "@/features/assembly/assemblyPledgeQuery";
import { AssemblyAppShell } from "@/features/assembly/components/AssemblyAppShell";
import { ASSEMBLY_PLEDGE_CATEGORY_LABELS } from "@/features/assembly/pledgeCategories";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * 공약 이행률 상세(프로필 + 전체 요약 + 카테고리별 표) — 모바일 우선.
 * 수치·소속은 스케치 기준 예시 데이터이며 API 연동 시 교체합니다.
 */
export function AssemblyPledgeRatePage() {
  const searchParams = useSearchParams();
  const city = searchParams.get("city");
  const sigungu = searchParams.get("sigungu");
  const monaCdRaw = searchParams.get("mona_cd");

  /** 스케치와 동일한 예시 프로필. API 연동 후 실제 의원 데이터로 교체. */
  const demoName = "배현진";
  const demoTerms = "제 21·22대 국회의원";
  const demoAffiliation = "국민의힘 · 서울 송파구 을";

  const overallRateLabel = `${assemblyOverallRatePercentMock()}%`;
  const categoryRates = ASSEMBLY_PLEDGE_CATEGORY_LABELS.map((label) => ({
    label,
    rate: `${ASSEMBLY_CATEGORY_RATE_PERCENT_MOCK[label]}%`,
  }));

  const selectionNote =
    city && sigungu
      ? monaCdRaw
        ? `선택: ${city} ${sigungu} · ${safeDecodeURIComponent(monaCdRaw)}`
        : `선택 지역: ${city} ${sigungu}`
      : null;

  const contextParams = assemblyPledgeContextParams(city, sigungu, monaCdRaw);

  const campaignBookletPdfUrl = getAssembly22CampaignBookletPublicPdfUrl();

  /** 프로필 카드 우측: 스케치와 동일한 알약형 선거공보 버튼 (URL 없으면 클릭 시 알림) */
  const campaignBookletButtonClass =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold leading-none shadow-sm transition-[opacity,filter] hover:brightness-[0.97] active:opacity-85";

  const campaignBookletButtonStyle: CSSProperties = {
    background: "#dbeafe",
    color: "var(--navy)",
    border: "1px solid rgba(37, 99, 235, 0.22)",
  };

  return (
    <AssemblyAppShell backHref="/assembly" backLabel="지역·의원 선택">
      <main className="mx-auto w-full max-w-[480px] px-5 py-6">
        {/* 프로필 카드: 아바타 · 텍스트 · 선거공보(PDF) */}
        <section
          className="mb-8 flex items-center gap-3 border-b pb-8"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl"
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              color: "var(--text-tertiary)",
            }}
            aria-hidden
          >
            <User className="h-9 w-9" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p
              className="text-[1.35rem] font-bold leading-tight tracking-tight"
              style={{
                color: "var(--navy)",
                fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif",
              }}
            >
              {demoName}
            </p>
            <p className="mt-1 text-[13px] leading-snug" style={{ color: "var(--foreground)" }}>
              {demoTerms}
            </p>
            <p className="mt-0.5 text-[12px] leading-snug" style={{ color: "var(--foreground)" }}>
              {demoAffiliation}
            </p>
            {selectionNote ? (
              <p className="mt-2 text-[11px] leading-snug" style={{ color: "var(--foreground)" }}>
                {selectionNote}
              </p>
            ) : null}
          </div>
          {campaignBookletPdfUrl ? (
            <a
              href={campaignBookletPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={campaignBookletButtonClass}
              style={campaignBookletButtonStyle}
              aria-label={`${demoName} 의원 선거공보 PDF 열기`}
            >
              <FileText className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
              선거공보 (PDF)
            </a>
          ) : (
            <button
              type="button"
              className={campaignBookletButtonClass}
              style={campaignBookletButtonStyle}
              aria-label={`${demoName} 의원 선거공보 PDF — 미등록 시 안내`}
              onClick={() => {
                window.alert("등록된 선거공보 PDF가 없습니다.");
              }}
            >
              <FileText className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
              선거공보 (PDF)
            </button>
          )}
        </section>

        {/* 전체 이행률 */}
        <section className="mb-6 text-center">
          <p
            className="text-[1.35rem] font-bold leading-snug sm:text-[1.5rem]"
            style={{
              color: "var(--navy)",
              fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif",
            }}
          >
            전체 공약 이행률 {overallRateLabel}
          </p>
          <p className="mt-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            데모 수치입니다. 실제 집계는 API 연동 후 표시됩니다.
          </p>
        </section>

        {/* 카테고리별 */}
        <section
          className="rounded-[28px] border p-5 sm:p-6"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <h2
            className="mb-4 border-b pb-3 text-center text-[17px] font-bold sm:text-[18px]"
            style={{
              borderColor: "var(--border)",
              color: "var(--navy)",
              fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif",
            }}
          >
            카테고리 별 이행률
          </h2>
          <ul>
            {categoryRates.map((row, index) => {
              const categoryHrefParams = new URLSearchParams(contextParams.toString());
              categoryHrefParams.set("category", row.label);
              const categoryHref = `/assembly/pledge/category?${categoryHrefParams.toString()}`;
              return (
                <li
                  key={row.label}
                  style={
                    index > 0 ? { borderTop: "1px solid var(--border)" } : undefined
                  }
                >
                  <Link
                    href={categoryHref}
                    className="-mx-1 flex min-h-[56px] items-center justify-between gap-3 rounded-xl px-1 py-2.5 active:opacity-65"
                    style={{ color: "inherit" }}
                    aria-label={`${row.label} 이행 우수 공약 보기`}
                  >
                    <span
                      className="min-w-0 flex-1 pr-2 text-[15px] font-medium leading-snug sm:text-[16px]"
                      style={{ color: "var(--foreground)" }}
                    >
                      {row.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className="tabular-nums text-[16px] font-bold sm:text-[17px]"
                        style={{ color: "var(--navy)" }}
                      >
                        {row.rate}
                      </span>
                      <ChevronRight
                        className="h-5 w-5 shrink-0"
                        style={{ color: "var(--text-tertiary)" }}
                        aria-hidden
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </AssemblyAppShell>
  );
}
