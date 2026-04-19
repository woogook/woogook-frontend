"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { assemblyPledgeContextParams } from "@/features/assembly/assemblyPledgeQuery";
import { AssemblyBreadcrumb } from "@/features/assembly/components/AssemblyBreadcrumb";
import { AssemblyAppShell } from "@/features/assembly/components/AssemblyAppShell";
import { PledgeHybridProgressBadge } from "@/features/assembly/components/PledgeHybridProgressBadge";
import {
  assemblyMemberMetaCardQueryOptions,
  assemblyMemberPledgesQueryOptions,
} from "@/lib/api-client";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function formatRegionBreadcrumbLabel(
  city: string | null,
  sigungu: string | null,
): string | null {
  const shortCity = city?.replace("특별시", "").replace("광역시", "").trim();
  const parts = [shortCity || "", sigungu?.trim() || ""].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export function formatExcludedUnknownPromiseNotice(count: number): string {
  return `판단불가 ${count}건은 평균 산정에서 제외됩니다.`;
}

/**
 * 카테고리별 이행 우수 공약 목록. 딥링크 promise_id는 해당 행을 강조한다.
 * 딥링크: `?promise_id=<공약ID>` — 해당 행으로 스크롤 후 잠시 강조(피드·뉴스 연동용).
 */
export function AssemblyPledgeCategoryTopPage() {
  const searchParams = useSearchParams();
  const city = searchParams.get("city");
  const sigungu = searchParams.get("sigungu");
  const monaCd = searchParams.get("mona_cd");
  const categoryRaw = searchParams.get("category");
  const categoryLabel = categoryRaw ? safeDecodeURIComponent(categoryRaw) : null;
  /** 피드·뉴스 등에서 `?promise_id=...`로 특정 공약 행으로 스크롤·강조 */
  const focusPromiseId = searchParams.get("promise_id")?.trim() || null;

  const {
    data: pledgeResponse,
    isPending,
    isError,
    error,
  } = useQuery(
    assemblyMemberPledgesQueryOptions({
      monaCd: monaCd ?? "",
      category: categoryLabel ?? "",
    }),
  );
  const { data: memberCard } = useQuery(
    assemblyMemberMetaCardQueryOptions(monaCd ?? ""),
  );
  const listKey = `${monaCd ?? ""}:${categoryLabel ?? ""}`;
  const [expandedListKey, setExpandedListKey] = useState<string | null>(null);
  const pledges = pledgeResponse?.items ?? null;
  const shouldRevealFocusedPledge = Boolean(
    focusPromiseId && pledges?.some((item) => item.promise_id === focusPromiseId),
  );
  const isExpanded = expandedListKey === listKey || shouldRevealFocusedPledge;
  const visiblePledges = pledges
    ? isExpanded
      ? pledges
      : pledges.slice(0, 5)
    : null;
  const hiddenPledgeCount = pledges ? Math.max(pledges.length - 5, 0) : 0;

  /** 딥링크로 들어온 행 잠시 강조 */
  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const pledgeRowRefs = useRef<Record<string, HTMLLIElement | null>>({});

  useEffect(() => {
    if (!pledges || !focusPromiseId) {
      return;
    }
    const row = pledgeRowRefs.current[focusPromiseId];
    if (!row) {
      return;
    }
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    const showTimer = window.setTimeout(() => setFlashRowId(focusPromiseId), 0);
    const hideTimer = window.setTimeout(() => setFlashRowId(null), 2600);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [pledges, focusPromiseId]);

  const backParams = assemblyPledgeContextParams(city, sigungu, monaCd);
  const regionParams = assemblyPledgeContextParams(city, sigungu, null);
  const regionLabel = formatRegionBreadcrumbLabel(city, sigungu);
  const memberLabel = memberCard?.name ?? monaCd ?? null;
  const excludedUnknownPromiseCount = pledgeResponse
    ? Math.max(
        pledgeResponse.meta.total_in_category -
          pledgeResponse.meta.evaluated_in_category,
        0,
      )
    : 0;
  const backHref =
    backParams.toString().length > 0
      ? `/assembly/pledge?${backParams.toString()}`
      : "/assembly/pledge";

  const breadcrumbItems = [
    ...(regionLabel
      ? [
          {
            label: regionLabel,
            href:
              regionParams.toString().length > 0
                ? `/assembly?${regionParams.toString()}`
                : "/assembly",
          },
        ]
      : []),
    ...(memberLabel
      ? [
          {
            label: memberLabel,
            href: `/assembly/pledge?${backParams.toString()}`,
          },
        ]
      : []),
    ...(categoryLabel ? [{ label: "카테고리 이행도" }] : []),
  ];

  return (
    <AssemblyAppShell
      backHref={backHref}
      backLabel="이행률 요약"
      backTrailing={
        <AssemblyBreadcrumb
          items={breadcrumbItems}
          className="mb-0 max-w-full overflow-x-auto px-0 -mx-0"
        />
      }
    >
      <main className="mx-auto w-full max-w-[480px] px-5 py-6">
        {pledges && categoryLabel && pledgeResponse ? (
          <>
            <header className="mb-4">
              <h1
                className="text-[1.25rem] font-bold leading-snug tracking-tight sm:text-[1.45rem]"
                style={{
                  color: "var(--navy)",
                  fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif",
                }}
              >
                {categoryLabel}
              </h1>
              <p className="mt-2 text-[15px] sm:text-base" style={{ color: "var(--text-secondary)" }}>
                이행 평가 상위 공약
              </p>
              <div
                className="mt-3 flex items-end justify-between gap-3 border-b pb-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="min-w-0 text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  <p>
                    전체 {pledgeResponse.meta.total_in_category}건 · 평가{" "}
                    {pledgeResponse.meta.evaluated_in_category}건
                  </p>
                  {excludedUnknownPromiseCount > 0 ? (
                    <p className="mt-1">
                      {formatExcludedUnknownPromiseNotice(
                        excludedUnknownPromiseCount,
                      )}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-right">
                  <span
                    className="block text-[11px] font-semibold leading-snug"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    평균 이행도
                  </span>
                  <span
                    className="mt-0.5 block tabular-nums text-[20px] font-bold leading-tight"
                    style={{ color: "var(--navy)" }}
                  >
                    {pledgeResponse.meta.category_rate_display}
                  </span>
                </p>
              </div>
            </header>

            <ol className="space-y-2">
              {visiblePledges?.map((item, index) => {
                const isFlashing = flashRowId === item.promise_id;
                return (
                  <li
                    key={item.promise_id}
                    id={`assembly-pledge-row-${item.promise_id}`}
                    ref={(el) => {
                      pledgeRowRefs.current[item.promise_id] = el;
                    }}
                    className="rounded-[18px] border px-3 py-3 transition-[box-shadow] duration-300"
                    style={{
                      background: "var(--surface)",
                      borderColor: isFlashing ? "var(--amber)" : "var(--border)",
                      boxShadow: isFlashing ? "0 0 0 2px var(--amber-light)" : undefined,
                    }}
                  >
                    {/* 순번 + 상태는 한 줄(메타), 제목은 그 아래 전체 너비 — 긴 제목·스크롤 시 시선 흐름이 자연스럽게 이어짐 */}
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span
                          className="shrink-0 text-[14px] font-bold leading-none tabular-nums"
                          style={{ color: "var(--amber)" }}
                          aria-hidden
                        >
                          {index + 1}.
                        </span>
                        <PledgeHybridProgressBadge
                          progress={item.progress_label}
                          score={item.score}
                        />
                      </div>
                      <p
                        className="min-w-0 break-keep text-left text-[14px] font-bold leading-snug sm:text-[15px]"
                        style={{
                          color: "var(--navy)",
                          fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif",
                        }}
                        title={item.promise_text}
                      >
                        {item.promise_text}
                      </p>
                    </div>

                    {item.user_summary_line ? (
                      <div
                        className="mt-3 border-t pt-2.5"
                        style={{ borderColor: "var(--border)" }}
                        role="region"
                        aria-label="판단 근거"
                      >
                        <span
                          className="text-[12px] font-semibold"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          판단 근거
                        </span>
                        <p
                          className="mt-1.5 text-[12px] leading-relaxed"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {item.user_summary_line}
                        </p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>

            {hiddenPledgeCount > 0 && !isExpanded ? (
              <footer className="mt-5 flex flex-col items-center gap-2 px-0 pb-2 pt-5">
                <button
                  type="button"
                  onClick={() => setExpandedListKey(listKey)}
                  className="cursor-pointer rounded-lg border px-4 py-2 text-[13px] font-semibold active:opacity-70"
                  style={{ borderColor: "var(--border)", color: "#2563eb" }}
                >
                  더보기 {hiddenPledgeCount}건
                </button>
              </footer>
            ) : null}
          </>
        ) : isPending && monaCd && categoryLabel ? (
          <div className="py-12 text-center">
            <p className="text-[15px] font-bold" style={{ color: "var(--navy)" }}>
              공약 평가를 불러오고 있습니다
            </p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center">
            <p className="text-[15px] font-bold" style={{ color: "var(--navy)" }}>
              공약 평가를 불러오지 못했습니다
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              {error && "message" in error && typeof error.message === "string"
                ? error.message
                : "잠시 후 다시 시도해 주세요."}
            </p>
            <Link
              href={backHref}
              className="mt-6 inline-block rounded-full border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--navy)" }}
            >
              돌아가기
            </Link>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-[15px] font-bold" style={{ color: "var(--navy)" }}>
              카테고리를 찾을 수 없습니다
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              주소가 올바른지 확인하거나 요약 화면에서 다시 선택해 주세요.
            </p>
            <Link
              href={backHref}
              className="mt-6 inline-block rounded-full border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--navy)" }}
            >
              돌아가기
            </Link>
          </div>
        )}
      </main>
    </AssemblyAppShell>
  );
}
