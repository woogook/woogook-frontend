"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { assemblyPledgeContextParams } from "@/features/assembly/assemblyPledgeQuery";
import { AssemblyAppShell } from "@/features/assembly/components/AssemblyAppShell";
import { PledgeProgressBadge } from "@/features/assembly/components/PledgeProgressBadge";
import { assemblyMemberPledgesQueryOptions } from "@/lib/api-client";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
      limit: 5,
    }),
  );
  const pledges = pledgeResponse?.items ?? null;

  /** 와이어 pagination_footer — API 연동 전 안내용 */
  const [loadMoreAcknowledged, setLoadMoreAcknowledged] = useState(false);
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
  const backHref =
    backParams.toString().length > 0
      ? `/assembly/pledge?${backParams.toString()}`
      : "/assembly/pledge";

  return (
    <AssemblyAppShell backHref={backHref} backLabel="이행률 요약">
      <main className="mx-auto w-full max-w-[480px] px-5 py-6">
        {pledges && categoryLabel ? (
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
              <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                평가 {pledgeResponse.meta.evaluated_in_category}건 / 전체{" "}
                {pledgeResponse.meta.total_in_category}건
              </p>
            </header>

            <ol className="space-y-2">
              {pledges.map((item, index) => {
                const isFlashing = flashRowId === item.promise_id;
                return (
                  <li
                    key={item.promise_id}
                    id={`assembly-pledge-row-${item.promise_id}`}
                    ref={(el) => {
                      pledgeRowRefs.current[item.promise_id] = el;
                    }}
                    className="rounded-[18px] border px-3 py-2.5 transition-[box-shadow] duration-300"
                    style={{
                      background: "var(--surface)",
                      borderColor: isFlashing ? "var(--amber)" : "var(--border)",
                      boxShadow: isFlashing ? "0 0 0 2px var(--amber-light)" : undefined,
                    }}
                  >
                    <div className="flex min-h-[40px] min-w-0 flex-nowrap items-start gap-2">
                      <span
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                        style={{
                          // background: "var(--amber-bg)",
                          color: "var(--amber)",
                          border: "1px solid var(--border)",
                        }}
                        aria-hidden
                      >
                        {index + 1}
                      </span>
                      <div className="shrink-0">
                        <PledgeProgressBadge progress={item.progress_label} />
                      </div>
                      <p
                        className="min-w-0 flex-1 break-keep text-left text-[14px] font-bold leading-snug sm:text-[15px]"
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
                      <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
                        <span
                          className="text-[12px] font-semibold"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          판단 근거
                        </span>
                        <p
                          className="mt-1 text-[12px] leading-relaxed"
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

            <footer className="mt-5 flex flex-col items-center gap-2 px-0 pb-2 pt-5">
              <button
                type="button"
                onClick={() => setLoadMoreAcknowledged(true)}
                className="cursor-pointer text-[13px] font-semibold active:opacity-70"
                style={{ color: "#2563eb" }}
              >
                더보기
              </button>
              {loadMoreAcknowledged ? (
                <p className="max-w-[320px] text-center text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  현재 화면은 상위 5건만 표시합니다.
                </p>
              ) : null}
            </footer>
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
