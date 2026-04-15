"use client";

import { useMemo, useState } from "react";
import {
  BallotItem,
  CandidateRecord,
  UserIssueProfile,
  getCandidateIssueSortScore,
  getContestTitle,
  getEvidenceStatusLabel,
  getIssueMatchLevelLabel,
  getIssueProfileLabelList,
  hasActiveIssues,
  getOfficeLevelLabel,
  getPartyColor,
  getPromiseSourceStatusLabel,
  getRelevantIssueMatches,
  parseBirthAge,
} from "../data";

interface Props {
  ballot: BallotItem;
  issueProfile: UserIssueProfile | null;
  onSelectCandidate: (candidate: CandidateRecord) => void;
  onCompare: () => void;
  onBack: () => void;
  onEditIssues: () => void;
}

function CandidatePhoto({
  src,
  alt,
  size,
}: {
  src: string | null | undefined;
  alt: string;
  size: "sm" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const w = size === "sm" ? "w-[56px] h-[72px]" : "w-[72px] h-[96px]";
  const iconSize = size === "sm" ? 24 : 28;
  const initial = alt?.[0] || "?";

  return (
    <div
      className={`${w} rounded overflow-hidden shrink-0 relative`}
      style={{
        background: "var(--surface-alt)",
        border: "1px solid var(--border)",
      }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-[13px] font-semibold"
          style={{
            background: "linear-gradient(135deg, var(--surface-alt), #e7e3db)",
            color: "var(--text-secondary)",
          }}
        >
          <div className="flex items-center gap-1">
            <svg
              width={iconSize}
              height={iconSize}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
              style={{ color: "var(--text-tertiary)" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"
              />
            </svg>
            <span aria-hidden="true">{initial}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export { CandidatePhoto };

export default function CandidateCards({
  ballot,
  issueProfile,
  onSelectCandidate,
  onCompare,
  onBack,
  onEditIssues,
}: Props) {
  const [sortByIssues, setSortByIssues] = useState(false);
  const isPartyList = ballot.ballot_subject_type === "party_list";
  const hasCandidates = ballot.candidates.length > 0;
  const showCompare = !isPartyList && ballot.candidates.length > 1;
  const isSingleCandidate = !isPartyList && ballot.candidates.length === 1;
  const compareButtonLabel =
    ballot.candidates.length <= 3
      ? "전체 후보 비교하기"
      : "후보 좁혀서 비교하기";
  const issueLabels = getIssueProfileLabelList(issueProfile);
  const showIssueSummary = hasActiveIssues(issueProfile);

  const candidates = useMemo(() => {
    if (!sortByIssues || !issueProfile) {
      return ballot.candidates;
    }
    return [...ballot.candidates].sort((left, right) => {
      const rightScore = getCandidateIssueSortScore(right, issueProfile);
      const leftScore = getCandidateIssueSortScore(left, issueProfile);
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
      return left.name_ko.localeCompare(right.name_ko, "ko");
    });
  }, [ballot.candidates, issueProfile, sortByIssues]);

  return (
    <section className="px-5 pt-4 pb-8">
      <div className="w-full max-w-[400px] mx-auto">
        <button
          onClick={onBack}
          className="animate-fade-in-up inline-flex items-center gap-1 text-[13px] mb-4 cursor-pointer active:opacity-60"
          style={{ color: "var(--text-secondary)" }}
          aria-label="관심 이슈 화면으로 돌아가기"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          관심 이슈
        </button>

        <div className="animate-fade-in-up stagger-1 mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.375rem] font-bold tracking-tight mb-1" style={{ color: "var(--navy)" }}>
                {getContestTitle(ballot)}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  {ballot.display_name}
                </span>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ background: "var(--surface-alt)", color: "var(--text-secondary)" }}
                >
                  {getOfficeLevelLabel(ballot.office_level)}
                </span>
                {ballot.seats && (
                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    선출 {ballot.seats}명
                  </span>
                )}
              </div>
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

        {showIssueSummary && (
          <div
            className="animate-fade-in-up stagger-2 rounded px-4 py-3 mb-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--navy)" }}>
                  나의 관심 이슈
                </p>
                <div className="flex flex-wrap gap-1.5">
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
              </div>

              {(issueProfile?.normalized_issue_keys.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setSortByIssues((current) => !current)}
                  className="px-3 py-2 rounded text-[11px] font-semibold cursor-pointer transition-all"
                  style={{
                    background: sortByIssues ? "var(--navy)" : "var(--surface-alt)",
                    color: sortByIssues ? "#ffffff" : "var(--text-secondary)",
                    border: sortByIssues ? "1px solid var(--navy)" : "1px solid var(--border)",
                  }}
                >
                  {sortByIssues ? "이슈 기준 정렬 중" : "관심 이슈 기준으로 보기"}
                </button>
              )}
            </div>
          </div>
        )}

        {isSingleCandidate && (
          <div
            className="animate-fade-in-up stagger-3 px-4 py-3 rounded mb-4 flex items-start gap-2"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-tertiary)" }} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9-.75a9 9 0 1118 0 9 9 0 01-18 0zM12 15h.008v.008H12V15z" />
            </svg>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>
                이 선거구는 단일 후보입니다.
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                비교 기능 없이 후보 상세와 공개 근거만 확인할 수 있어요.
              </p>
            </div>
          </div>
        )}

        {isPartyList && (
          <div
            className="animate-fade-in-up stagger-3 px-4 py-3 rounded mb-4"
            style={{ background: "var(--info-bg)", borderLeft: "3px solid var(--info-text)" }}
          >
            <p className="text-[12px] font-medium leading-relaxed" style={{ color: "var(--info-text)" }}>
              비례대표 선거는 후보자 개인이 아닌 <strong>정당</strong>에 투표합니다.
              각 정당의 비례대표 후보 명부는 선관위 홈페이지에서 확인할 수 있습니다.
            </p>
          </div>
        )}

        {!hasCandidates && (
          <div
            className="animate-fade-in-up stagger-3 px-4 py-8 rounded text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--surface-alt)" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-tertiary)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: "var(--navy)" }}>
              후보 정보 준비 중
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              {isPartyList
                ? "비례대표 정당명부는 후보 등록 이후 공개됩니다."
                : "후보 등록 기간 이후 정보가 업데이트됩니다."}
            </p>
          </div>
        )}

        {hasCandidates && (
          <div className="space-y-2.5">
            {candidates.map((candidate, index) => {
              const partyColor = getPartyColor(candidate.party_name);
              const birthAge = parseBirthAge(candidate.birthdate_text);
              const issueMatches = getRelevantIssueMatches(candidate, issueProfile);
              const topMatch = issueMatches[0];

              return (
                <button
                  key={candidate.candidate_id}
                  onClick={() => onSelectCandidate(candidate)}
                  className={`animate-fade-in-up stagger-${Math.min(index + 2, 7)} w-full text-left rounded overflow-hidden transition-all cursor-pointer active:scale-[0.98] group`}
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  aria-label={`${candidate.name_ko} ${candidate.party_name || "무소속"} 후보 상세보기`}
                >
                  <div className="h-[3px]" style={{ background: partyColor }} />

                  <div className="p-4">
                    <div className="flex gap-3">
                      <CandidatePhoto src={candidate.photo_url} alt={candidate.name_ko} size="sm" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[16px] font-bold" style={{ color: "var(--navy)" }}>
                            {candidate.name_ko}
                          </span>
                          {candidate.name_hanja && (
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                              {candidate.name_hanja}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {candidate.party_name ? (
                            <span
                              className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: `${partyColor}18`, color: partyColor }}
                            >
                              {candidate.party_name}
                            </span>
                          ) : (
                            <span
                              className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: "var(--surface-alt)", color: "var(--text-secondary)" }}
                            >
                              무소속
                            </span>
                          )}
                          {birthAge && (
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                              {birthAge.age}
                            </span>
                          )}
                          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                            {candidate.gender}
                          </span>
                        </div>

                        {candidate.job && (
                          <p className="text-[12px] mt-1.5 line-clamp-1" style={{ color: "var(--text-secondary)" }}>
                            {candidate.job}
                          </p>
                        )}
                      </div>

                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="shrink-0 mt-1 transition-transform group-hover:translate-x-0.5"
                        style={{ color: "var(--text-tertiary)" }}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>

                    <div className="mt-3 space-y-2.5">
                      {issueLabels.length > 0 && topMatch && (
                        <div
                          className="rounded px-3 py-2.5"
                          style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold" style={{ color: "var(--navy)" }}>
                              관심 이슈 기준
                            </span>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded"
                              style={{
                                background:
                                  topMatch.level === "insufficient"
                                    ? "var(--warning-bg)"
                                    : "var(--amber-bg)",
                                color:
                                  topMatch.level === "insufficient"
                                    ? "var(--warning-text)"
                                    : "var(--amber)",
                              }}
                            >
                              {getIssueMatchLevelLabel(topMatch.level)}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed mt-1" style={{ color: "var(--text-secondary)" }}>
                            {topMatch.reasons[0]}
                          </p>
                        </div>
                      )}

                      {candidate.brief && (
                        <div className="space-y-1">
                          {candidate.brief.summary_lines.slice(0, 2).map((line) => (
                            <p
                              key={line}
                              className="text-[11px] leading-relaxed"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {line}
                            </p>
                          ))}
                        </div>
                      )}

                      {candidate.brief && (
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{ background: "var(--surface-alt)", color: "var(--text-secondary)" }}
                          >
                            {getEvidenceStatusLabel(candidate.brief.evidence_status)}
                          </span>
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{ background: "var(--surface-alt)", color: "var(--text-secondary)" }}
                          >
                            {getPromiseSourceStatusLabel(candidate.brief.promise_source_status)}
                          </span>
                        </div>
                      )}

                      {candidate.compare_entry?.info_gap_flags?.length ? (
                        <div
                          className="rounded px-3 py-2"
                          style={{ background: "var(--warning-bg)", borderLeft: "3px solid var(--warning-text)" }}
                        >
                          <p className="text-[10px] font-semibold mb-1" style={{ color: "var(--warning-text)" }}>
                            정보 부족
                          </p>
                          <p className="text-[11px] leading-relaxed" style={{ color: "var(--warning-text)" }}>
                            {candidate.compare_entry.info_gap_flags[0]}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {showCompare && (
          <div className="sticky bottom-4 mt-5 animate-fade-in-up stagger-3" style={{ zIndex: 5 }}>
            <button
              onClick={onCompare}
              className="w-full h-[48px] text-[14px] font-semibold rounded cursor-pointer active:scale-[0.98] transition-all"
              style={{
                background: "var(--navy)",
                color: "white",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
              aria-label="후보 비교 화면으로 이동"
            >
              {compareButtonLabel}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
