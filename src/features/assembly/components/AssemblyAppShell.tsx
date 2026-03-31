"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type AssemblyAppShellProps = {
  children: React.ReactNode;
  /** 설정 시 메인 네비 아래에 뒤로가기 줄을 붙입니다. */
  backHref?: string;
  backLabel?: string;
};

/**
 * 국회(assembly) 도메인 공통 상단 네비 + 본문 영역.
 */
export function AssemblyAppShell({ children, backHref, backLabel = "이전" }: AssemblyAppShellProps) {
  const rootStyle: CSSProperties = {
    background: "var(--background)",
    ["--nav-height" as string]: "60px",
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
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{
                background: "var(--amber-bg)",
                border: "1px solid var(--border)",
                color: "var(--amber)",
              }}
              aria-hidden="true"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v18" />
                <path d="M5 21h14" />
                <path d="M7 21V10.5L12 7l5 3.5V21" />
                <path d="M9 14h2v4H9zM13 14h2v4h-2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p
                className="truncate text-[13px] font-bold leading-tight"
                style={{ color: "var(--navy)" }}
              >
                공약 이행률
              </p>
              <p
                className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-snug"
                style={{ color: "var(--text-secondary)" }}
              >
                국회 서비스
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-sm">
            <Link
              href="/"
              className="rounded-full border px-3 py-1.5"
              style={{ borderColor: "var(--border)" }}
            >
              서비스 허브
            </Link>
            <Link
              href="/local-election"
              className="rounded-full border px-3 py-1.5"
              style={{ borderColor: "var(--border)" }}
            >
              지방선거
            </Link>
          </div>
        </div>
      </div>

      {backHref ? (
        <div
          className="sticky z-40 flex items-center border-b px-5 py-3"
          style={{
            top: "var(--nav-height)",
            background: "rgba(249,248,245,0.92)",
            borderColor: "var(--border)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <Link
            href={backHref}
            className="flex min-h-[36px] items-center gap-1 active:opacity-60"
            style={{ color: "var(--navy)" }}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" style={{ color: "var(--amber)" }} aria-hidden />
            <span className="text-[14px] font-bold">{backLabel}</span>
          </Link>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
