"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BallotItem,
  CandidateRecord,
  UserIssueProfile,
  formatKoreanDateTime,
  getEvidenceStatusLabel,
  getContestTitle,
  getIssueCriterionEntries,
  getIssueCriterionHint,
  getIssueLabel,
  getIssueMatchLevelLabel,
  getIssueProfileLabelList,
  hasActiveIssues,
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
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const candidates = ballot.candidates;
  const issueLabels = getIssueProfileLabelList(issueProfile);
  const issueCriteria = getIssueCriterionEntries(issueProfile);
  const showIssueContext = hasActiveIssues(issueProfile);
  const gridCols =
    candidates.length <= 2
      ? `repeat(${candidates.length}, 1fr)`
      : `repeat(${candidates.length}, 180px)`;
  const compareOverview = useMemo(
    () => buildCompareOverview(ballot, candidates, issueProfile),
    [ballot, candidates, issueProfile],
  );
  const assistantPromptOptions = useMemo(
    () => buildAssistantPromptOptions(issueCriteria),
    [issueCriteria],
  );
  const initialAssistantMessage = useMemo(
    () =>
      buildAssistantReply(
        "내 관심 이슈 기준으로 다시 요약해줘",
        ballot,
        candidates,
        issueProfile,
        compareOverview,
      ),
    [ballot, candidates, compareOverview, issueProfile],
  );

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

  const appendAssistantExchange = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const reply = buildAssistantReply(
      trimmed,
      ballot,
      candidates,
      issueProfile,
      compareOverview,
    );

    setChatMessages((current) => [
      ...current,
      {
        id: `user:${current.length}:${trimmed}`,
        role: "user",
        content: trimmed,
      },
      {
        id: `assistant:${current.length}:${trimmed}`,
        role: "assistant",
        content: reply,
      },
    ]);
    setChatInput("");
  };

  const openAssistant = () => {
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          id: "assistant:welcome",
          role: "assistant",
          content: initialAssistantMessage,
        },
      ]);
    }
    setAssistantOpen(true);
  };

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
              {issueCriteria[0] && (
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {getIssueCriterionHint(ballot.office_level, issueCriteria[0])}
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
          className="animate-fade-in-up stagger-3 rounded px-4 py-4 mb-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--navy)" }}>
                한눈에 비교
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {compareOverview.headline}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={openAssistant}
            >
              더 물어보기
            </Button>
          </div>
          <div className="space-y-1.5">
            {compareOverview.bullets.map((bullet) => (
              <p
                key={bullet}
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--foreground)" }}
              >
                {bullet}
              </p>
            ))}
          </div>
          <p
            className="text-[10px] leading-relaxed mt-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            {compareOverview.caveat}
          </p>
        </div>

        <div
          className="animate-fade-in-up stagger-4 sticky z-10 -mx-5 px-5 pt-2 pb-3"
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

        <button
          type="button"
          onClick={openAssistant}
          className="fixed right-5 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 flex items-center gap-2 rounded-full px-4 py-3 shadow-[0_16px_32px_rgba(30,41,59,0.18)]"
          style={{
            background: "var(--navy)",
            color: "#ffffff",
          }}
          aria-label="비교 도우미 열기"
        >
          <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.6}
              d="M8.625 9.75h6.75M8.625 13.5h4.5M21 12c0 4.97-4.701 9-10.5 9a11.46 11.46 0 01-3.16-.44L3 21l1.117-3.352A8.73 8.73 0 013 12c0-4.97 4.701-9 10.5-9S21 7.03 21 12z"
            />
          </svg>
          <span className="text-[12px] font-semibold">비교 도우미</span>
        </button>

        {assistantOpen && (
          <>
            <button
              type="button"
              onClick={() => setAssistantOpen(false)}
              className="fixed inset-0 z-40 bg-black/20"
              aria-label="비교 도우미 닫기"
            />
            <div
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-[24px] px-5 pt-4 pb-5 md:inset-x-auto md:right-5 md:bottom-5 md:w-[360px] md:rounded-[24px]"
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                boxShadow: "0 24px 60px rgba(30,41,59,0.22)",
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>
                    비교 도우미
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    현재 비교 화면 기준으로 근거를 다시 설명합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssistantOpen(false)}
                  className="h-9 w-9 rounded-full"
                  style={{ background: "var(--surface-alt)", color: "var(--text-secondary)" }}
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              {showIssueContext && issueLabels.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {issueLabels.map((label) => (
                    <span
                      key={`drawer:${label}`}
                      className="rounded-full px-2 py-1 text-[10px] font-semibold"
                      style={{ background: "var(--amber-bg)", color: "var(--amber)" }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}

              <div className="mb-3 flex flex-wrap gap-2">
                {assistantPromptOptions.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => appendAssistantExchange(prompt)}
                    className="rounded-full px-3 py-2 text-[11px] font-medium"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--navy)",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div
                className="mb-3 max-h-[280px] overflow-y-auto rounded-2xl px-3 py-3"
                style={{ background: "var(--surface-alt)" }}
              >
                <div className="space-y-2.5">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[92%] rounded-2xl px-3 py-2.5 ${
                        message.role === "user" ? "ml-auto" : ""
                      }`}
                      style={{
                        background:
                          message.role === "user"
                            ? "var(--navy)"
                            : "var(--surface)",
                        color:
                          message.role === "user"
                            ? "#ffffff"
                            : "var(--foreground)",
                        border:
                          message.role === "user"
                            ? "none"
                            : "1px solid var(--border)",
                      }}
                    >
                      <p className="text-[11px] leading-relaxed whitespace-pre-line">
                        {message.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      appendAssistantExchange(chatInput);
                    }
                  }}
                  placeholder="비교 화면 기준으로 질문해보세요"
                  className="h-[44px] flex-1 rounded-[14px] px-3 text-[12px] outline-none"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                <Button
                  type="button"
                  variant="primary"
                  size="default"
                  onClick={() => appendAssistantExchange(chatInput)}
                  disabled={!chatInput.trim()}
                >
                  보내기
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

type CompareOverview = {
  headline: string;
  bullets: string[];
  caveat: string;
};

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

function buildCompareOverview(
  ballot: BallotItem,
  candidates: CandidateRecord[],
  issueProfile: UserIssueProfile | null,
): CompareOverview {
  const criteria = getIssueCriterionEntries(issueProfile);
  const mappedCriteria = criteria.filter((criterion) => criterion.issue_key);
  const rankedByIssue = [...candidates]
    .map((candidate) => ({
      candidate,
      score: mappedCriteria.reduce((total, criterion) => {
        if (!criterion.issue_key || !issueProfile) return total;
        const match = getRelevantIssueMatches(candidate, {
          ...issueProfile,
          normalized_issue_keys: [criterion.issue_key],
        })[0];
        return total + getIssueLevelScore(match?.level);
      }, 0),
    }))
    .sort((left, right) => right.score - left.score);
  const rankedByEvidence = [...candidates]
    .map((candidate) => ({
      candidate,
      score:
        getEvidenceScore(candidate) * 10 +
        (candidate.compare_entry?.source_refs.length || 0) -
        (candidate.compare_entry?.info_gap_flags.length || 0),
    }))
    .sort((left, right) => right.score - left.score);
  const infoGapCandidates = candidates
    .filter((candidate) => (candidate.compare_entry?.info_gap_flags.length || 0) > 0)
    .sort(
      (left, right) =>
        (right.compare_entry?.info_gap_flags.length || 0) -
        (left.compare_entry?.info_gap_flags.length || 0),
    );

  const leadingIssueCandidate =
    rankedByIssue[0]?.score > 0 ? rankedByIssue[0].candidate : null;
  const leadingEvidenceCandidate = rankedByEvidence[0]?.candidate || null;
  const mostSparseCandidate = infoGapCandidates[0] || null;

  const headline = leadingIssueCandidate
    ? `${criteria[0]?.label || "현재 기준"}으로는 ${leadingIssueCandidate.name_ko} 후보가 공개 단서가 가장 많습니다.`
    : mappedCriteria.length > 0
      ? `${criteria[0]?.label || "현재 기준"}으로 후보 간 우세를 단정할 만큼의 공개 단서는 아직 제한적입니다.`
      : "선택한 이슈가 없어 공개 정보와 요약 중심으로 후보를 비교하고 있습니다.";

  const bullets: string[] = [];
  if (leadingIssueCandidate) {
    const bestReasons = mappedCriteria
      .map((criterion) => {
        if (!criterion.issue_key || !issueProfile) return null;
        return getRelevantIssueMatches(leadingIssueCandidate, {
          ...issueProfile,
          normalized_issue_keys: [criterion.issue_key],
        })[0]?.reasons?.[0];
      })
      .filter((value): value is string => Boolean(value));

    bullets.push(
      bestReasons[0]
        ? `${leadingIssueCandidate.name_ko} 후보는 ${bestReasons[0]}`
        : `${leadingIssueCandidate.name_ko} 후보는 선택 이슈와 연결되는 공개 단서가 상대적으로 많습니다.`,
    );
  }

  if (leadingEvidenceCandidate) {
    bullets.push(
      `${leadingEvidenceCandidate.name_ko} 후보는 ${getEvidenceStatusLabel(
        leadingEvidenceCandidate.brief?.evidence_status || "missing",
      )} 상태이며, 현재 연결된 출처는 ${
        leadingEvidenceCandidate.compare_entry?.source_refs.length || 0
      }건입니다.`,
    );
  }

  if (mostSparseCandidate) {
    bullets.push(
      `${mostSparseCandidate.name_ko} 후보는 ${
        mostSparseCandidate.compare_entry?.info_gap_flags.length || 0
      }개의 정보 부족 항목이 있어 추가 확인이 필요합니다.`,
    );
  }

  if (bullets.length === 0) {
    bullets.push("후보별 공개 정보 차이가 크지 않아 요약보다 원문 출처와 상세 정보를 함께 보는 편이 안전합니다.");
  }

  return {
    headline,
    bullets,
    caveat:
      mappedCriteria.length > 0
        ? `${getIssueCriterionHint(ballot.office_level, mappedCriteria[0])} 추천이 아니라 현재 공개 자료 기준의 비교입니다.`
        : "선택한 이슈가 없을 때는 직업, 경력, 전과, 출처와 정보 부족 여부를 먼저 확인하는 방식이 안전합니다.",
  };
}

function buildAssistantPromptOptions(criteria: ReturnType<typeof getIssueCriterionEntries>) {
  if (criteria.length > 0) {
    return [
      "왜 이렇게 비교됐어?",
      `${criteria[0].label} 기준으로 다시 설명해줘`,
      "정보 부족 후보는 누구야?",
      "권한 범위 기준으로 설명해줘",
    ];
  }

  return [
    "후보 차이를 3줄로 요약해줘",
    "정보 부족 후보는 누구야?",
    "출처가 많은 후보는 누구야?",
    "권한 범위 기준으로 설명해줘",
  ];
}

function buildAssistantReply(
  question: string,
  ballot: BallotItem,
  candidates: CandidateRecord[],
  issueProfile: UserIssueProfile | null,
  compareOverview: CompareOverview,
) {
  const normalizedQuestion = question.replace(/\s+/g, "");
  const criteria = getIssueCriterionEntries(issueProfile);
  const sparseCandidates = candidates
    .filter((candidate) => (candidate.compare_entry?.info_gap_flags.length || 0) > 0)
    .sort(
      (left, right) =>
        (right.compare_entry?.info_gap_flags.length || 0) -
        (left.compare_entry?.info_gap_flags.length || 0),
    );
  const strongestEvidenceCandidate = [...candidates].sort(
    (left, right) => getEvidenceScore(right) - getEvidenceScore(left),
  )[0];

  if (
    normalizedQuestion.includes("왜") ||
    normalizedQuestion.includes("근거")
  ) {
    return `${compareOverview.headline}\n${compareOverview.bullets.join("\n")}`;
  }

  if (normalizedQuestion.includes("정보부족")) {
    if (sparseCandidates.length === 0) {
      return "현재 비교 대상에서는 특별히 표시된 정보 부족 항목이 많지 않습니다.";
    }

    return sparseCandidates
      .slice(0, 2)
      .map((candidate) => {
        const gaps = candidate.compare_entry?.info_gap_flags || [];
        return `${candidate.name_ko} 후보는 ${gaps.length}개의 부족 항목이 있습니다. ${gaps.slice(0, 2).join(", ")}${
          gaps.length > 2 ? " 등이 비어 있습니다." : "."
        }`;
      })
      .join("\n");
  }

  if (normalizedQuestion.includes("권한")) {
    if (criteria.length === 0) {
      return "아직 선택된 이슈가 없어 특정 권한 범위를 짚기 어렵습니다. 이슈를 먼저 고르면 선출직 권한과 연결해서 다시 설명할 수 있습니다.";
    }

    return criteria
      .slice(0, 2)
      .map(
        (criterion) =>
          `${criterion.label} · ${getIssueCriterionHint(ballot.office_level, criterion)}`,
      )
      .join("\n");
  }

  const matchedCriterion = criteria.find((criterion) =>
    normalizedQuestion.includes(criterion.label.replace(/\s+/g, "")),
  );

  if (matchedCriterion?.issue_key && issueProfile) {
    const ranked = [...candidates]
      .map((candidate) => ({
        candidate,
        match: getRelevantIssueMatches(candidate, {
          ...issueProfile,
          normalized_issue_keys: [matchedCriterion.issue_key!],
        })[0],
      }))
      .sort(
        (left, right) =>
          getIssueLevelScore(right.match?.level) - getIssueLevelScore(left.match?.level),
      );

    return ranked
      .slice(0, 2)
      .map(({ candidate, match }) => {
        if (!match) {
          return `${candidate.name_ko} 후보는 ${matchedCriterion.label}와 직접 연결되는 공개 단서가 아직 부족합니다.`;
        }
        return `${candidate.name_ko} 후보는 ${matchedCriterion.label} 기준 ${getIssueMatchLevelLabel(match.level)}으로 보이며, ${match.reasons[0]}`;
      })
      .join("\n");
  }

  if (
    normalizedQuestion.includes("차이") ||
    normalizedQuestion.includes("비교") ||
    normalizedQuestion.includes("요약")
  ) {
    return `${compareOverview.headline}\n${compareOverview.bullets.join("\n")}`;
  }

  if (normalizedQuestion.includes("출처")) {
    if (!strongestEvidenceCandidate) {
      return "현재 연결된 출처 정보를 기준으로 우세한 후보를 특정하기 어렵습니다.";
    }

    const primarySource = strongestEvidenceCandidate.compare_entry?.source_refs[0];
    return `${strongestEvidenceCandidate.name_ko} 후보가 비교 대상 중 근거 연결이 가장 안정적입니다. ${
      primarySource
        ? `대표 출처는 ${primarySource.label}입니다.`
        : "다만 세부 출처 수는 제한적입니다."
    }`;
  }

  return `${compareOverview.headline}\n궁금한 점을 더 좁혀서 물어보면 후보 차이, 권한 범위, 정보 부족 이유를 다시 설명할 수 있습니다.`;
}

function getEvidenceScore(candidate: CandidateRecord) {
  const status = candidate.brief?.evidence_status || "missing";
  if (status === "enough") return 3;
  if (status === "limited") return 2;
  return 1;
}

function getIssueLevelScore(level?: string) {
  if (level === "very_high") return 4;
  if (level === "high") return 3;
  if (level === "partial") return 2;
  if (level === "insufficient") return 1;
  return 0;
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
