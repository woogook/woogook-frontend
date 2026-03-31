"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { getAssemblyCategoryTop5Mock } from "@/features/assembly/assemblyCategoryTopMock";
import { assemblyPledgeContextParams } from "@/features/assembly/assemblyPledgeQuery";
import { AssemblyAppShell } from "@/features/assembly/components/AssemblyAppShell";
import { PledgeProgressBadge } from "@/features/assembly/components/PledgeProgressBadge";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * 카테고리별 이행 우수 공약 TOP 5 — 목업 데이터 표시. API 연동 시 동일 레이아웃에 데이터만 교체.
 */
export function AssemblyPledgeCategoryTopPage() {
  const searchParams = useSearchParams();
  const city = searchParams.get("city");
  const sigungu = searchParams.get("sigungu");
  const member = searchParams.get("member");
  const categoryRaw = searchParams.get("category");
  const categoryLabel = categoryRaw ? safeDecodeURIComponent(categoryRaw) : null;

  const pledges = getAssemblyCategoryTop5Mock(categoryLabel);

  /** 공약별 판단 근거 펼침 — 기본 접어 두어 한 화면에 5건이 보이도록 함 */
  const [rationaleOpenById, setRationaleOpenById] = useState<Record<string, boolean>>({});

  const toggleRationale = useCallback((promiseId: string) => {
    setRationaleOpenById((prev) => ({
      ...prev,
      [promiseId]: !prev[promiseId],
    }));
  }, []);

  const backParams = assemblyPledgeContextParams(city, sigungu, member);
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
              <p
                className="text-[12px] font-semibold tracking-widest"
                style={{ color: "var(--amber)" }}
              >
                TOP 5
              </p>
              <h1
                className="mt-2 text-[1.25rem] font-bold leading-snug tracking-tight sm:text-[1.45rem]"
                style={{
                  color: "var(--navy)",
                  fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif",
                }}
              >
                {categoryLabel}
              </h1>
              <p className="mt-2 text-[15px] sm:text-base" style={{ color: "var(--text-secondary)" }}>
                이행 평가 상위 공약 (목업)
              </p>
              <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                진행도·판단 근거는 데모용입니다. 실제 파이프라인 연동 후 갱신됩니다.
              </p>
            </header>

            <ol className="space-y-2">
              {pledges.map((item, index) => {
                const rationaleOpen = Boolean(rationaleOpenById[item.promise_id]);
                return (
                  <li
                    key={item.promise_id}
                    className="rounded-[18px] border px-3 py-2.5"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border)",
                    }}
                  >
                    {/* 순위 · 진행도 · 공약 제목 — 한 줄(제목은 말줄임) */}
                    <div className="flex min-h-[40px] min-w-0 flex-nowrap items-center gap-2">
                      <span
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                        style={{
                          background: "var(--amber-bg)",
                          color: "var(--amber)",
                          border: "1px solid var(--border)",
                        }}
                        aria-hidden
                      >
                        {index + 1}
                      </span>
                      <div className="shrink-0">
                        <PledgeProgressBadge progress={item.progress} />
                      </div>
                      <p
                        className="min-w-0 flex-1 truncate text-left text-[14px] font-bold leading-tight sm:text-[15px]"
                        style={{
                          color: "var(--navy)",
                          fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif",
                        }}
                        title={item.promise_text}
                      >
                        {item.promise_text}
                      </p>
                    </div>

                    <div className="mt-1.5 border-t pt-1.5" style={{ borderColor: "var(--border)" }}>
                      <button
                        type="button"
                        onClick={() => toggleRationale(item.promise_id)}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg py-1 text-left active:opacity-70"
                        aria-expanded={rationaleOpen}
                        aria-controls={`rationale-${item.promise_id}`}
                        id={`rationale-toggle-${item.promise_id}`}
                      >
                        <span
                          className="text-[12px] font-semibold tracking-wide"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          판단 근거
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${rationaleOpen ? "rotate-180" : ""}`}
                          style={{ color: "var(--text-tertiary)" }}
                          aria-hidden
                        />
                      </button>
                      {rationaleOpen ? (
                        <div
                          id={`rationale-${item.promise_id}`}
                          role="region"
                          aria-labelledby={`rationale-toggle-${item.promise_id}`}
                          className="mt-2 pt-1"
                        >
                          <p className="mb-2 text-[10px] tabular-nums" style={{ color: "var(--text-tertiary)" }}>
                            ID {item.promise_id}
                          </p>
                          <ul
                            className="list-disc space-y-1.5 pl-4 text-[12px] leading-relaxed"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {item.rationale_lines.map((line, i) => (
                              <li key={i}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
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
