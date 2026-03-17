"use client";

import { useRef, useEffect, useState } from "react";
import {
  BallotItem,
  CandidateRecord,
  getPartyColor,
  parseBirthAge,
  parseCareer,
  getContestTitle,
} from "../data";
import { CandidatePhoto } from "./CandidateCards";

interface Props {
  ballot: BallotItem;
  onSelectCandidate: (candidate: CandidateRecord) => void;
  onBack: () => void;
}

// ── Comparison row data ─────────────────────────────────

interface CompareRow {
  label: string;
  getValue: (c: CandidateRecord) => string;
  highlight?: (c: CandidateRecord) => boolean;
}

const COMPARE_SECTIONS: { title: string; rows: CompareRow[] }[] = [
  {
    title: "기본 정보",
    rows: [
      { label: "정당", getValue: (c) => c.party_name || "무소속" },
      {
        label: "나이",
        getValue: (c) => {
          const ba = parseBirthAge(c.birthdate_text);
          return ba ? ba.age : "—";
        },
      },
      { label: "성별", getValue: (c) => c.gender },
      { label: "직업", getValue: (c) => c.job || "—" },
    ],
  },
  {
    title: "학력",
    rows: [
      { label: "학력", getValue: (c) => c.education || "—" },
    ],
  },
  {
    title: "주요 경력",
    rows: [
      {
        label: "경력",
        getValue: (c) => {
          const lines = parseCareer(c.career);
          return lines.length > 0 ? lines.join("\n") : "—";
        },
      },
    ],
  },
  {
    title: "공개 정보",
    rows: [
      {
        label: "전과기록",
        getValue: (c) => c.crime_text || "정보 없음",
        highlight: (c) => !!c.crime_text && c.crime_text !== "없음",
      },
      { label: "등록일", getValue: (c) => c.registration_date },
      { label: "주소", getValue: (c) => c.address || "—" },
    ],
  },
];

export default function CompareView({ ballot, onSelectCandidate, onBack }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const [activeCandidate, setActiveCandidate] = useState(0);

  const candidates = ballot.candidates;
  const gridCols = candidates.length <= 2
    ? `repeat(${candidates.length}, 1fr)`
    : `repeat(${candidates.length}, 160px)`;

  // Sync scroll between header and body
  useEffect(() => {
    const body = scrollContainerRef.current;
    const header = headerScrollRef.current;
    if (!body || !header) return;

    const syncScroll = (source: HTMLDivElement, target: HTMLDivElement) => {
      target.scrollLeft = source.scrollLeft;
    };

    const onBodyScroll = () => syncScroll(body, header);
    const onHeaderScroll = () => syncScroll(header, body);

    body.addEventListener("scroll", onBodyScroll);
    header.addEventListener("scroll", onHeaderScroll);

    return () => {
      body.removeEventListener("scroll", onBodyScroll);
      header.removeEventListener("scroll", onHeaderScroll);
    };
  }, []);

  // Track active candidate from scroll position
  useEffect(() => {
    if (candidates.length <= 2) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      const scrollLeft = container.scrollLeft;
      const idx = Math.round(scrollLeft / 160);
      setActiveCandidate(Math.min(idx, candidates.length - 1));
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [candidates.length]);

  return (
    <section className="px-5 pt-4 pb-8">
      <div className="w-full max-w-[400px] mx-auto">
        {/* Back */}
        <button
          onClick={onBack}
          className="animate-fade-in-up inline-flex items-center gap-1 text-[13px] mb-4 cursor-pointer active:opacity-60"
          style={{ color: "var(--text-secondary)" }}
          aria-label="후보 목록으로 돌아가기"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          후보 목록
        </button>

        {/* Header */}
        <div className="animate-fade-in-up stagger-1 mb-4">
          <h2 className="text-[1.375rem] font-bold tracking-tight mb-1" style={{ color: "var(--navy)" }}>
            후보 비교
          </h2>
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            {getContestTitle(ballot)} — {ballot.display_name} — {candidates.length}명
          </p>
        </div>

        {/* Sticky candidate header */}
        <div
          className="animate-fade-in-up stagger-2 sticky z-10 -mx-5 px-5 pt-2 pb-3"
          style={{
            top: "49px", // below main header
            background: "rgba(249,248,245,0.95)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            ref={headerScrollRef}
            className="overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "8px", minWidth: candidates.length > 2 ? `${candidates.length * 160}px` : undefined }}>
              {candidates.map((c, i) => {
                const partyColor = getPartyColor(c.party_name);
                return (
                  <button
                    key={c.candidate_id}
                    onClick={() => onSelectCandidate(c)}
                    className="flex flex-col items-center gap-1.5 py-1.5 cursor-pointer active:opacity-70 rounded transition-all"
                    style={{
                      opacity: candidates.length > 2 && activeCandidate !== i ? 0.6 : 1,
                    }}
                    aria-label={`${c.name_ko} 상세보기`}
                  >
                    <div className="w-[44px] h-[56px] rounded overflow-hidden shrink-0" style={{ border: `2px solid ${partyColor}` }}>
                      <CandidatePhoto src={c.photo_url} alt={c.name_ko} size="sm" />
                    </div>
                    <div className="text-center">
                      <span className="text-[13px] font-bold block leading-tight" style={{ color: "var(--navy)" }}>
                        {c.name_ko}
                      </span>
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: partyColor }}
                      >
                        {c.party_name || "무소속"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scroll indicator dots (3+ candidates) */}
          {candidates.length > 2 && (
            <div className="flex justify-center gap-1 mt-1.5">
              {candidates.map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{
                    background: activeCandidate === i ? "var(--navy)" : "var(--border-dark)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Comparison body */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto mt-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div style={{ minWidth: candidates.length > 2 ? `${candidates.length * 160}px` : undefined }}>
            {COMPARE_SECTIONS.map((section, si) => (
              <div
                key={section.title}
                className={`animate-fade-in-up stagger-${Math.min(si + 3, 7)} mb-3`}
              >
                {/* Section title */}
                <div
                  className="px-3 py-2 rounded-t"
                  style={{ background: "var(--navy)", }}
                >
                  <span className="text-[11px] font-semibold text-white tracking-wide">
                    {section.title}
                  </span>
                </div>

                {/* Rows */}
                <div
                  className="rounded-b overflow-hidden"
                  style={{ border: "1px solid var(--border)", borderTop: "none" }}
                >
                  {section.rows.map((row, ri) => (
                    <div
                      key={row.label}
                      style={{
                        borderBottom: ri < section.rows.length - 1 ? "1px solid var(--border)" : "none",
                      }}
                    >
                      {/* Row label */}
                      <div
                        className="px-3 py-1.5"
                        style={{ background: "var(--surface-alt)" }}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
                          {row.label}
                        </span>
                      </div>

                      {/* Values grid */}
                      <div
                        className="px-2"
                        style={{
                          display: "grid",
                          gridTemplateColumns: gridCols,
                          gap: "8px",
                          background: "var(--surface)",
                        }}
                      >
                        {candidates.map((c) => {
                          const value = row.getValue(c);
                          const isHighlight = row.highlight?.(c) || false;
                          const isMultiLine = value.includes("\n");
                          const partyColor = getPartyColor(c.party_name);

                          return (
                            <div
                              key={c.candidate_id}
                              className="py-2 px-1"
                              style={{
                                borderLeft: `2px solid ${partyColor}30`,
                              }}
                            >
                              {row.label === "정당" ? (
                                <span
                                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded inline-block"
                                  style={{ background: `${partyColor}18`, color: partyColor }}
                                >
                                  {value}
                                </span>
                              ) : isMultiLine ? (
                                <div className="space-y-0.5">
                                  {value.split("\n").map((line, li) => (
                                    <p
                                      key={li}
                                      className="text-[11px] leading-snug"
                                      style={{ color: "var(--foreground)" }}
                                    >
                                      {line}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <span
                                  className="text-[12px] leading-relaxed"
                                  style={{
                                    color: isHighlight ? "var(--warning-text)" : value === "—" ? "var(--text-tertiary)" : "var(--foreground)",
                                    fontWeight: isHighlight ? 600 : 400,
                                  }}
                                >
                                  {value}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Source note */}
        <div
          className="mt-4 px-3 py-2.5 rounded"
          style={{ background: "var(--surface-alt)", borderLeft: "2px solid var(--border-dark)" }}
        >
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            후보 정보는 중앙선거관리위원회 예비후보자 명부를 기준으로 합니다.
            특정 후보를 추천하거나 평가하지 않습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
