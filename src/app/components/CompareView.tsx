"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  BallotItem,
  CandidateRecord,
  UserIssueProfile,
  formatKoreanDateTime,
  getAuthorityHint,
  getContestTitle,
  getIssueLabel,
  getIssueMatchLevelLabel,
  getIssueProfileLabelList,
  getPartyColor,
  getRelevantIssueMatches,
} from "../data";
import { CandidatePhoto } from "./CandidateCards";

interface Props {
  ballot: BallotItem;
  issueProfile: UserIssueProfile | null;
  onSelectCandidate: (candidate: CandidateRecord) => void;
  onBack: () => void;
  onEditIssues: () => void;
}

const FACT_LABELS = [
  "정당",
  "직업",
  "학력",
  "전과기록",
  "등록일",
  "주소",
  "주요 경력",
] as const;

export default function CompareView({
  ballot,
  issueProfile,
  onSelectCandidate,
  onBack,
  onEditIssues,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const [activeCandidate, setActiveCandidate] = useState(0);

  const candidates = ballot.candidates;
  const issueLabels = getIssueProfileLabelList(issueProfile);
  const gridCols =
    candidates.length <= 2
      ? `repeat(${candidates.length}, 1fr)`
      : `repeat(${candidates.length}, 180px)`;

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

  useEffect(() => {
    if (candidates.length <= 2) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      const scrollLeft = container.scrollLeft;
      const index = Math.round(scrollLeft / 180);
      setActiveCandidate(Math.min(index, candidates.length - 1));
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [candidates.length]);

  return (
    <section className="px-5 pt-4 pb-8">
      <div className="w-full max-w-[400px] mx-auto">
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

        <div className="animate-fade-in-up stagger-1 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.375rem] font-bold tracking-tight mb-1" style={{ color: "var(--navy)" }}>
                후보 비교
              </h2>
              <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                {getContestTitle(ballot)} — {ballot.display_name} — {candidates.length}명
              </p>
            </div>
            <button
              type="button"
              onClick={onEditIssues}
              className="px-3 py-2 rounded text-[12px] font-semibold cursor-pointer"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--navy)" }}
            >
              이슈 수정
            </button>
          </div>
        </div>

        <div
          className="animate-fade-in-up stagger-2 rounded px-4 py-3 mb-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--navy)" }}>
            비교 기준
          </p>
          {issueLabels.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {issueLabels.map((label) => (
                  <span
                    key={label}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: "var(--amber-bg)", color: "var(--amber)" }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              {issueProfile?.normalized_issue_keys[0] && (
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {getAuthorityHint(ballot.office_level, issueProfile.normalized_issue_keys[0])}
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              이슈를 따로 선택하지 않았습니다. 공개 정보와 요약 중심으로 비교합니다.
            </p>
          )}
        </div>

        <div
          className="animate-fade-in-up stagger-3 sticky z-10 -mx-5 px-5 pt-2 pb-3"
          style={{
            top: "49px",
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                gap: "8px",
                minWidth: candidates.length > 2 ? `${candidates.length * 180}px` : undefined,
              }}
            >
              {candidates.map((candidate, index) => {
                const partyColor = getPartyColor(candidate.party_name);
                return (
                  <button
                    key={candidate.candidate_id}
                    onClick={() => onSelectCandidate(candidate)}
                    className="flex flex-col items-center gap-1.5 py-1.5 cursor-pointer active:opacity-70 rounded transition-all"
                    style={{ opacity: candidates.length > 2 && activeCandidate !== index ? 0.6 : 1 }}
                    aria-label={`${candidate.name_ko} 상세보기`}
                  >
                    <div
                      className="w-[44px] h-[56px] rounded overflow-hidden shrink-0"
                      style={{ border: `2px solid ${partyColor}` }}
                    >
                      <CandidatePhoto src={candidate.photo_url} alt={candidate.name_ko} size="sm" />
                    </div>
                    <div className="text-center">
                      <span className="text-[13px] font-bold block leading-tight" style={{ color: "var(--navy)" }}>
                        {candidate.name_ko}
                      </span>
                      <span className="text-[10px] font-semibold" style={{ color: partyColor }}>
                        {candidate.party_name || "무소속"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {candidates.length > 2 && (
            <div className="flex justify-center gap-1 mt-1.5">
              {candidates.map((_, index) => (
                <div
                  key={index}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{
                    background:
                      activeCandidate === index ? "var(--navy)" : "var(--border-dark)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div
          ref={scrollContainerRef}
          className="overflow-x-auto mt-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div style={{ minWidth: candidates.length > 2 ? `${candidates.length * 180}px` : undefined }}>
            {issueProfile?.normalized_issue_keys.length ? (
              <CompareSection title="관심 이슈 기준" candidates={candidates}>
                {issueProfile.normalized_issue_keys.map((issueKey) => (
                  <CompareRow
                    key={issueKey}
                    label={getIssueLabel(issueKey)}
                    gridCols={gridCols}
                    candidates={candidates}
                    renderValue={(candidate) => {
                      const match = getRelevantIssueMatches(candidate, {
                        ...issueProfile,
                        normalized_issue_keys: [issueKey],
                      })[0];
                      if (!match) {
                        return (
                          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                            관련 정보 부족
                          </span>
                        );
                      }
                      return (
                        <div className="space-y-1">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block"
                            style={{
                              background:
                                match.level === "insufficient"
                                  ? "var(--warning-bg)"
                                  : "var(--amber-bg)",
                              color:
                                match.level === "insufficient"
                                  ? "var(--warning-text)"
                                  : "var(--amber)",
                            }}
                          >
                            {getIssueMatchLevelLabel(match.level)}
                          </span>
                          <p className="text-[11px] leading-relaxed" style={{ color: "var(--foreground)" }}>
                            {match.reasons[0]}
                          </p>
                        </div>
                      );
                    }}
                  />
                ))}
              </CompareSection>
            ) : null}

            <CompareSection title="팩트" candidates={candidates}>
              {FACT_LABELS.map((label) => (
                <CompareRow
                  key={label}
                  label={label}
                  gridCols={gridCols}
                  candidates={candidates}
                  renderValue={(candidate) => {
                    const fact = candidate.compare_entry?.facts.find((item) => item.label === label);
                    return (
                      <span
                        className="text-[12px] leading-relaxed"
                        style={{
                          color: fact?.value && fact.value !== "정보 없음" ? "var(--foreground)" : "var(--text-tertiary)",
                        }}
                      >
                        {fact?.value || "정보 없음"}
                      </span>
                    );
                  }}
                />
              ))}
            </CompareSection>

            <CompareSection title="요약" candidates={candidates}>
              <CompareRow
                label="핵심 요약"
                gridCols={gridCols}
                candidates={candidates}
                renderValue={(candidate) => (
                  <div className="space-y-1">
                    {(candidate.compare_entry?.summary || candidate.brief?.summary_lines || []).map((line) => (
                      <p key={line} className="text-[11px] leading-relaxed" style={{ color: "var(--foreground)" }}>
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              />
              <CompareRow
                label="차별점"
                gridCols={gridCols}
                candidates={candidates}
                renderValue={(candidate) => (
                  <span className="text-[11px] leading-relaxed" style={{ color: "var(--foreground)" }}>
                    {candidate.brief?.differentiator || "대표 차별점 공개 정보 부족"}
                  </span>
                )}
              />
            </CompareSection>

            <CompareSection title="출처 및 정보 부족" candidates={candidates}>
              <CompareRow
                label="출처"
                gridCols={gridCols}
                candidates={candidates}
                renderValue={(candidate) => (
                  <div className="space-y-1">
                    {(candidate.compare_entry?.source_refs || []).map((source) => (
                      <div key={`${candidate.candidate_id}-${source.label}`} className="space-y-0.5">
                        <p className="text-[11px] font-semibold" style={{ color: "var(--navy)" }}>
                          {source.label}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                          {source.as_of ? `기준: ${formatKoreanDateTime(source.as_of)}` : "기준 시각 정보 없음"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              />
              <CompareRow
                label="정보 부족"
                gridCols={gridCols}
                candidates={candidates}
                renderValue={(candidate) => {
                  const infoGaps = candidate.compare_entry?.info_gap_flags || [];
                  return infoGaps.length > 0 ? (
                    <div className="space-y-0.5">
                      {infoGaps.map((flag) => (
                        <p key={flag} className="text-[11px] leading-relaxed" style={{ color: "var(--warning-text)" }}>
                          {flag}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      표시할 부족 정보 없음
                    </span>
                  );
                }}
              />
            </CompareSection>
          </div>
        </div>

        <div
          className="mt-4 px-3 py-2.5 rounded"
          style={{ background: "var(--surface-alt)", borderLeft: "2px solid var(--border-dark)" }}
        >
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            비교 결과는 현재 확보한 공개 자료 기준입니다. 특정 후보를 추천하지 않으며, 정보 부족은 숨기지 않고 표시합니다.
          </p>
        </div>
      </div>
    </section>
  );
}

function CompareSection({
  title,
  candidates,
  children,
}: {
  title: string;
  candidates: CandidateRecord[];
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="px-3 py-2 rounded-t" style={{ background: "var(--navy)" }}>
        <span className="text-[11px] font-semibold text-white tracking-wide">
          {title}
        </span>
      </div>
      <div
        className="rounded-b overflow-hidden"
        style={{ border: "1px solid var(--border)", borderTop: "none" }}
      >
        <div style={{ minWidth: candidates.length > 2 ? `${candidates.length * 180}px` : undefined }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  gridCols,
  candidates,
  renderValue,
}: {
  label: string;
  gridCols: string;
  candidates: CandidateRecord[];
  renderValue: (candidate: CandidateRecord) => ReactNode;
}) {
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="px-3 py-1.5" style={{ background: "var(--surface-alt)" }}>
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
          {label}
        </span>
      </div>
      <div
        className="px-2"
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          gap: "8px",
          background: "var(--surface)",
        }}
      >
        {candidates.map((candidate) => {
          const partyColor = getPartyColor(candidate.party_name);
          return (
            <div
              key={`${candidate.candidate_id}-${label}`}
              className="py-2 px-1"
              style={{ borderLeft: `2px solid ${partyColor}30` }}
            >
              {renderValue(candidate)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
