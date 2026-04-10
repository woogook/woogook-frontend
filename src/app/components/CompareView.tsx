"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createLocalElectionChatConversation,
  getLocalElectionChatConversation,
  sendLocalElectionChatMessage,
} from "@/lib/api-client";
import {
  chatMessageRoleSchema,
  localElectionChatCitationSchema,
  type ChatSelectionBasis,
  type LocalElectionChatCitation,
} from "@/lib/schemas";
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

const CLIENT_SESSION_STORAGE_KEY = "woogook.local-election.chat.client-session.v1";
const COMPARE_CHAT_STORAGE_KEY_PREFIX = "woogook.local-election.chat.compare.v1.";
const TABLE_COLUMN_WIDTH = 180;
const TABLE_COLUMN_GAP = 8;
const TABLE_SCROLL_EDGE_PADDING = 16;

interface Props {
  ballot: BallotItem;
  totalCandidateCount: number;
  issueProfile: UserIssueProfile | null;
  selectionBasis: ChatSelectionBasis;
  selectionLabel: string | null;
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
  totalCandidateCount,
  issueProfile,
  selectionBasis,
  selectionLabel,
  onSelectCandidate,
  onBack,
  onEditIssues,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const skipNextChatPersistRef = useRef(true);
  const [activeCandidate, setActiveCandidate] = useState(0);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatUiMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const candidates = ballot.candidates;
  const issueLabels = getIssueProfileLabelList(issueProfile);
  const issueCriteria = getIssueCriterionEntries(issueProfile);
  const showIssueContext = hasActiveIssues(issueProfile);
  const gridCols =
    candidates.length <= 2
      ? `repeat(${candidates.length}, 1fr)`
      : `repeat(${candidates.length}, ${TABLE_COLUMN_WIDTH}px)`;
  const tableGridWidth =
    candidates.length > 2
      ? candidates.length * TABLE_COLUMN_WIDTH +
        (candidates.length - 1) * TABLE_COLUMN_GAP
      : null;
  const compareOverview = useMemo(
    () => buildCompareOverview(ballot, candidates, issueProfile),
    [ballot, candidates, issueProfile],
  );
  const assistantPromptOptions = useMemo(
    () => buildAssistantPromptOptions(issueCriteria),
    [issueCriteria],
  );
  const candidateNameMap = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.candidate_id, candidate.name_ko])),
    [candidates],
  );
  const scopeBanner = useMemo(
    () =>
      buildCompareScopeBanner({
        totalCandidateCount,
        selectedCandidateCount: candidates.length,
        selectionBasis,
        selectionLabel,
      }),
    [candidates.length, selectionBasis, selectionLabel, totalCandidateCount],
  );
  const chatContextSignature = useMemo(
    () =>
      buildCompareChatContextSignature(
        ballot,
        issueProfile,
        selectionBasis,
        selectionLabel,
      ),
    [ballot, issueProfile, selectionBasis, selectionLabel],
  );
  const chatStorageKey = useMemo(
    () => buildCompareChatStorageKey(chatContextSignature),
    [chatContextSignature],
  );
  const compareSections = useMemo(
    () => buildCompareSections(candidates, issueProfile),
    [candidates, issueProfile],
  );
  const [tableMode, setTableMode] = useState<"differences" | "all">(
    candidates.length > 1 ? "differences" : "all",
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

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
      const index = Math.round(
        scrollLeft / (TABLE_COLUMN_WIDTH + TABLE_COLUMN_GAP),
      );
      setActiveCandidate(Math.min(index, candidates.length - 1));
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [candidates.length]);

  useEffect(() => {
    const stored = readStoredCompareChatState(chatStorageKey);
    skipNextChatPersistRef.current = true;

    setConversationId(stored?.conversationId ?? null);
    setChatMessages(stored?.messages ?? []);
    setLastQuestion(stored?.lastQuestion ?? null);
    setLastFailedQuestion(null);
    setPendingQuestion(null);
    setChatError(null);
    setIsSending(false);
  }, [chatStorageKey]);

  useEffect(() => {
    if (skipNextChatPersistRef.current) {
      skipNextChatPersistRef.current = false;
      return;
    }

    writeStoredCompareChatState(chatStorageKey, {
      contextSignature: chatContextSignature,
      conversationId,
      messages: chatMessages,
      lastQuestion,
    });
  }, [chatContextSignature, chatMessages, chatStorageKey, conversationId, lastQuestion]);

  const resetConversationCache = useCallback(() => {
    setConversationId(null);
    setChatMessages([]);
    setLastQuestion(null);
    clearStoredCompareChatState(chatStorageKey);
  }, [chatStorageKey]);

  const createConversation = useCallback(
    async (clientSessionId: string) => {
      const response = await createLocalElectionChatConversation({
        client_session_id: clientSessionId,
        contest_id: ballot.contest_id,
        candidate_ids: candidates.map((candidate) => candidate.candidate_id),
        issue_profile_snapshot: issueProfile,
        entry_point: "compare",
        selection_basis: selectionBasis,
        selection_label: selectionLabel,
      });

      setConversationId(response.conversation_id);
      return response.conversation_id;
    },
    [ballot.contest_id, candidates, issueProfile, selectionBasis, selectionLabel],
  );

  const ensureConversation = useCallback(
    async (clientSessionId: string) => {
      if (!conversationId) {
        return createConversation(clientSessionId);
      }

      try {
        await getLocalElectionChatConversation({
          conversationId,
          clientSessionId,
        });
        return conversationId;
      } catch (error) {
        if (isApiErrorWithStatus(error, 404)) {
          resetConversationCache();
          return createConversation(clientSessionId);
        }
        throw error;
      }
    },
    [conversationId, createConversation, resetConversationCache],
  );

  const sendQuestion = useCallback(
    async (questionText: string) => {
      const question = questionText.trim();
      if (!question || isSending) return;

      setChatError(null);
      setLastFailedQuestion(null);
      setPendingQuestion(question);
      setIsSending(true);

      try {
        const clientSessionId = getOrCreateClientSessionId();
        const activeConversationId = await ensureConversation(clientSessionId);
        const response = await sendLocalElectionChatMessage({
          conversationId: activeConversationId,
          request: {
            client_session_id: clientSessionId,
            question,
          },
        });

        setConversationId(response.conversation_id);
        setChatMessages((current) => [...current, ...buildChatMessagesFromResponse(response)]);
        setLastQuestion(question);
        setChatInput("");
      } catch (error) {
        setChatError(buildChatErrorMessage(error));
        setLastFailedQuestion(question);
      } finally {
        setPendingQuestion(null);
        setIsSending(false);
      }
    },
    [ensureConversation, isSending],
  );

  useEffect(() => {
    if (candidates.length <= 1) {
      setTableMode("all");
    }
  }, [candidates.length]);

  useEffect(() => {
    if (compareSections.length === 0) {
      setActiveSectionId(null);
      return;
    }

    setActiveSectionId((current) => {
      if (current && compareSections.some((section) => section.id === current)) {
        return current;
      }
      return compareSections[0]?.id ?? null;
    });
  }, [compareSections]);

  const activeSection = useMemo(
    () =>
      compareSections.find((section) => section.id === activeSectionId) ?? compareSections[0] ?? null,
    [activeSectionId, compareSections],
  );
  const visibleRows = useMemo(() => {
    if (!activeSection) return [];
    if (tableMode === "all" || candidates.length <= 1) {
      return activeSection.rows;
    }
    return activeSection.rows.filter((row) => rowHasDifference(row));
  }, [activeSection, candidates.length, tableMode]);

  const openAssistant = () => {
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
                {getContestTitle(ballot)} — {ballot.display_name} — 선택 {candidates.length}명
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
          style={{
            background:
              "linear-gradient(135deg, rgba(255,248,231,0.92), rgba(246,240,224,0.92))",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--navy)" }}>
            현재 비교 범위
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--foreground)" }}>
            {scopeBanner.title}
          </p>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {scopeBanner.helper}
          </p>
        </div>

        <div
          className="animate-fade-in-up stagger-3 rounded px-4 py-3 mb-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--navy)" }}>
            비교 기준
          </p>
          {showIssueContext ? (
            <>
              {issueLabels.length > 0 && (
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
              )}
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
          className="animate-fade-in-up stagger-4 rounded px-4 py-4 mb-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--navy)" }}>
                한눈에 비교
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {scopeBanner.shortLabel} 범위에서 {compareOverview.headline}
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
          className="animate-fade-in-up stagger-5 sticky z-10 -mx-5 px-5 pt-2 pb-3"
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
                gap: `${TABLE_COLUMN_GAP}px`,
                minWidth: tableGridWidth
                  ? `${tableGridWidth + TABLE_SCROLL_EDGE_PADDING * 2}px`
                  : undefined,
                paddingLeft: tableGridWidth ? `${TABLE_SCROLL_EDGE_PADDING}px` : undefined,
                paddingRight: tableGridWidth ? `${TABLE_SCROLL_EDGE_PADDING}px` : undefined,
              }}
            >
              {candidates.map((candidate, index) => {
                const partyColor = getPartyColor(candidate.party_name);
                const topMatch = getRelevantIssueMatches(candidate, issueProfile)[0];
                const evidenceLabel = getEvidenceStatusLabel(
                  candidate.brief?.evidence_status || "missing",
                );
                const isActive = candidates.length <= 2 || activeCandidate === index;
                return (
                  <button
                    key={candidate.candidate_id}
                    onClick={() => onSelectCandidate(candidate)}
                    className="flex flex-col items-center gap-2 py-2 px-2 cursor-pointer active:opacity-70 rounded-2xl transition-all"
                    style={{
                      opacity: isActive ? 1 : 0.66,
                      background: isActive ? "var(--surface)" : "transparent",
                      border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                      boxShadow: isActive ? "0 8px 18px rgba(15,23,42,0.06)" : "none",
                    }}
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
                    <div className="flex flex-wrap justify-center gap-1">
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: "var(--surface-alt)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {evidenceLabel}
                      </span>
                      {topMatch && topMatch.level !== "insufficient" && (
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: "var(--amber-bg)",
                            color: "var(--amber)",
                          }}
                        >
                          {getIssueLabel(topMatch.issue_key)}
                        </span>
                      )}
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
          <div
            style={{
              minWidth: tableGridWidth
                ? `${tableGridWidth + TABLE_SCROLL_EDGE_PADDING * 2}px`
                : undefined,
              paddingLeft: tableGridWidth ? `${TABLE_SCROLL_EDGE_PADDING}px` : undefined,
              paddingRight: tableGridWidth ? `${TABLE_SCROLL_EDGE_PADDING}px` : undefined,
            }}
          >
            <div
              className="rounded-2xl px-4 py-3 mb-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--navy)" }}>
                    비교 표
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    차이부터 보고, 필요할 때 전체 항목으로 넓혀보세요.
                  </p>
                </div>
                {candidates.length > 1 && (
                  <div className="flex rounded-full p-1" style={{ background: "var(--surface-alt)" }}>
                    <button
                      type="button"
                      onClick={() => setTableMode("differences")}
                      className="rounded-full px-3 py-1.5 text-[10px] font-semibold"
                      style={{
                        background: tableMode === "differences" ? "var(--navy)" : "transparent",
                        color: tableMode === "differences" ? "#ffffff" : "var(--navy)",
                      }}
                    >
                      차이 먼저
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableMode("all")}
                      className="rounded-full px-3 py-1.5 text-[10px] font-semibold"
                      style={{
                        background: tableMode === "all" ? "var(--navy)" : "transparent",
                        color: tableMode === "all" ? "#ffffff" : "var(--navy)",
                      }}
                    >
                      전체 보기
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {compareSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    className="shrink-0 rounded-full px-3 py-2 text-[11px] font-semibold"
                    style={{
                      background:
                        activeSection?.id === section.id ? "var(--navy)" : "var(--surface-alt)",
                      color: activeSection?.id === section.id ? "#ffffff" : "var(--navy)",
                      border:
                        activeSection?.id === section.id
                          ? "1px solid var(--navy)"
                          : "1px solid var(--border)",
                    }}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            </div>

            {activeSection ? (
              <CompareSection
                title={activeSection.title}
                description={activeSection.description}
              >
                {visibleRows.length > 0 ? (
                  visibleRows.map((row) => (
                    <CompareDataRow
                      key={row.id}
                      label={row.label}
                      gridCols={gridCols}
                      candidates={candidates}
                      values={row.values}
                    />
                  ))
                ) : (
                  <div className="px-4 py-6">
                    <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--navy)" }}>
                      이 섹션에서는 큰 차이가 아직 드러나지 않습니다
                    </p>
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      전체 보기로 바꾸면 같은 항목까지 포함해 후보별 내용을 모두 확인할 수 있습니다.
                    </p>
                  </div>
                )}
              </CompareSection>
            ) : null}
          </div>
        </div>

        <div
          className="mt-4 px-3 py-2.5 rounded"
          style={{ background: "var(--surface-alt)", borderLeft: "2px solid var(--border-dark)" }}
        >
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            비교 결과는 현재 선택한 후보 범위와 확보한 공개 자료 기준입니다. 특정 후보를 추천하지 않으며, 정보 부족은 숨기지 않고 표시합니다.
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
                    {scopeBanner.title}
                  </p>
                  <p className="text-[10px] leading-relaxed mt-1" style={{ color: "var(--text-tertiary)" }}>
                    사용 후보: {candidates.map((candidate) => candidate.name_ko).join(", ")}
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
                    onClick={() => void sendQuestion(prompt)}
                    className="rounded-full px-3 py-2 text-[11px] font-medium"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--navy)",
                      opacity: isSending ? 0.55 : 1,
                    }}
                    disabled={isSending}
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
                      {message.role === "assistant" && (
                        <div className="mt-2.5 space-y-2">
                          {message.citations.length > 0 && (
                            <div className="space-y-1.5">
                              <p
                                className="text-[10px] font-semibold"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                근거
                              </p>
                              {message.citations.map((citation) => (
                                <div
                                  key={`${message.id}:${citation.label}:${citation.candidate_id || "none"}`}
                                  className="rounded-xl px-2.5 py-2"
                                  style={{
                                    background: "rgba(255,255,255,0.72)",
                                    border: "1px solid var(--border)",
                                  }}
                                >
                                  <p
                                    className="text-[10px] font-semibold"
                                    style={{ color: "var(--navy)" }}
                                  >
                                    {getChatCitationHeading(citation, candidateNameMap)}
                                  </p>
                                  <p
                                    className="text-[10px] leading-relaxed mt-1"
                                    style={{ color: "var(--foreground)" }}
                                  >
                                    {citation.snippet}
                                  </p>
                                  <p
                                    className="text-[10px] mt-1"
                                    style={{ color: "var(--text-tertiary)" }}
                                  >
                                    {getChatSourceTypeLabel(citation.source_type)}
                                    {citation.as_of
                                      ? ` · ${formatKoreanDateTime(citation.as_of)}`
                                      : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          {message.infoGapFlags.length > 0 && (
                            <div className="space-y-1">
                              <p
                                className="text-[10px] font-semibold"
                                style={{ color: "var(--warning-text)" }}
                              >
                                추가 확인 필요
                              </p>
                              {message.infoGapFlags.map((flag) => (
                                <p
                                  key={`${message.id}:${flag}`}
                                  className="text-[10px] leading-relaxed"
                                  style={{ color: "var(--warning-text)" }}
                                >
                                  {flag}
                                </p>
                              ))}
                            </div>
                          )}
                          {message.followUpSuggestions.length > 0 && (
                            <div className="space-y-1.5">
                              <p
                                className="text-[10px] font-semibold"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                이어서 물어보기
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {message.followUpSuggestions.map((suggestion) => (
                                  <button
                                    key={`${message.id}:${suggestion}`}
                                    type="button"
                                    onClick={() => void sendQuestion(suggestion)}
                                    className="rounded-full px-2.5 py-1.5 text-[10px] font-medium"
                                    style={{
                                      background: "var(--surface-alt)",
                                      border: "1px solid var(--border)",
                                      color: "var(--navy)",
                                      opacity: isSending ? 0.55 : 1,
                                    }}
                                    disabled={isSending}
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {pendingQuestion && (
                    <>
                      <div
                        className="max-w-[92%] rounded-2xl px-3 py-2.5 ml-auto"
                        style={{ background: "var(--navy)", color: "#ffffff" }}
                      >
                        <p className="text-[11px] leading-relaxed whitespace-pre-line">
                          {pendingQuestion}
                        </p>
                      </div>
                      <div
                        className="max-w-[92%] rounded-2xl px-3 py-2.5"
                        style={{
                          background: "var(--surface)",
                          color: "var(--foreground)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <p className="text-[11px] leading-relaxed">
                          답변을 정리하고 있습니다...
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {chatError && (
                <div
                  className="mb-3 rounded-2xl px-3 py-2.5"
                  style={{
                    background: "var(--warning-bg)",
                    border: "1px solid rgba(180,83,9,0.18)",
                  }}
                >
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--warning-text)" }}
                  >
                    {chatError}
                  </p>
                  {lastFailedQuestion && (
                    <button
                      type="button"
                      onClick={() => void sendQuestion(lastFailedQuestion)}
                      className="mt-2 rounded-full px-3 py-1.5 text-[10px] font-semibold"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        color: "var(--navy)",
                        opacity: isSending ? 0.55 : 1,
                      }}
                      disabled={isSending}
                    >
                      다시 시도
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void sendQuestion(chatInput);
                    }
                  }}
                  placeholder="비교 화면 기준으로 질문해보세요"
                  className="h-[44px] flex-1 rounded-[14px] px-3 text-[12px] outline-none"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  disabled={isSending}
                />
                <Button
                  type="button"
                  variant="primary"
                  size="default"
                  onClick={() => void sendQuestion(chatInput)}
                  disabled={!chatInput.trim() || isSending}
                >
                  {isSending ? "전송 중" : "보내기"}
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

type CompareScopeBanner = {
  title: string;
  helper: string;
  shortLabel: string;
};

type ChatUiMessage = {
  id: string;
  role: z.infer<typeof chatMessageRoleSchema>;
  content: string;
  createdAt: string | null;
  citations: LocalElectionChatCitation[];
  infoGapFlags: string[];
  followUpSuggestions: string[];
};

type CompareTableChip = {
  label: string;
  tone: "neutral" | "accent" | "warn";
};

type CompareTableCell = {
  primary?: string;
  secondary?: string[];
  chips?: CompareTableChip[];
  muted?: boolean;
};

type CompareTableRow = {
  id: string;
  label: string;
  values: CompareTableCell[];
};

type CompareTableSection = {
  id: string;
  title: string;
  description: string;
  rows: CompareTableRow[];
};

const chatUiMessageSchema = z.object({
  id: z.string(),
  role: chatMessageRoleSchema,
  content: z.string(),
  createdAt: z.string().nullable(),
  citations: z.array(localElectionChatCitationSchema),
  infoGapFlags: z.array(z.string()),
  followUpSuggestions: z.array(z.string()),
});

const storedCompareChatStateSchema = z.object({
  contextSignature: z.string(),
  conversationId: z.string().nullable(),
  messages: z.array(chatUiMessageSchema),
  lastQuestion: z.string().nullable(),
});

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

function buildCompareChatContextSignature(
  ballot: BallotItem,
  issueProfile: UserIssueProfile | null,
  selectionBasis: ChatSelectionBasis,
  selectionLabel: string | null,
) {
  return JSON.stringify({
    contestId: ballot.contest_id,
    candidateIds: ballot.candidates.map((candidate) => candidate.candidate_id),
    hasIssueProfileSnapshot: issueProfile !== null,
    normalizedIssueKeys: issueProfile?.normalized_issue_keys || [],
    customKeywords: issueProfile?.custom_keywords || [],
    selectionBasis,
    selectionLabel,
  });
}

function buildCompareScopeBanner(params: {
  totalCandidateCount: number;
  selectedCandidateCount: number;
  selectionBasis: ChatSelectionBasis;
  selectionLabel: string | null;
}): CompareScopeBanner {
  const { totalCandidateCount, selectedCandidateCount, selectionBasis, selectionLabel } =
    params;
  const label = selectionLabel || getSelectionBasisLabel(selectionBasis);
  const title =
    totalCandidateCount > selectedCandidateCount
      ? `전체 ${totalCandidateCount}명 중 ${label} ${selectedCandidateCount}명 비교`
      : `${label} ${selectedCandidateCount}명 비교`;

  return {
    title,
    shortLabel: label,
    helper:
      selectedCandidateCount === 1
        ? "현재는 한 후보를 깊게 살펴보는 모드입니다. 다른 후보와 함께 고르면 차이 설명이 더 풍부해집니다."
        : "비교 표와 에이전트는 모두 이 범위 안의 후보만 사용합니다.",
  };
}

function getSelectionBasisLabel(selectionBasis: ChatSelectionBasis) {
  const labels: Record<ChatSelectionBasis, string> = {
    all: "전체 후보",
    issue: "이슈 관련 후보",
    party: "정당별 후보",
    manual: "직접 고른 후보",
    evidence: "정보 충분 후보",
    incumbent: "현직·의정 경험 후보",
  };

  return labels[selectionBasis];
}

function buildCompareChatStorageKey(contextSignature: string) {
  return `${COMPARE_CHAT_STORAGE_KEY_PREFIX}${encodeURIComponent(contextSignature)}`;
}

function readStoredCompareChatState(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    return storedCompareChatStateSchema.parse(JSON.parse(raw));
  } catch (error) {
    console.error("[compare-chat] failed to read stored state", error);
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

function writeStoredCompareChatState(
  storageKey: string,
  state: z.infer<typeof storedCompareChatStateSchema>,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.error("[compare-chat] failed to persist state", error);
  }
}

function clearStoredCompareChatState(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(storageKey);
}

function getOrCreateClientSessionId() {
  if (typeof window === "undefined") {
    return `web-session-${Date.now()}`;
  }

  const existing = window.sessionStorage.getItem(CLIENT_SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `web-${crypto.randomUUID()}`
      : `web-${Date.now()}`;
  window.sessionStorage.setItem(CLIENT_SESSION_STORAGE_KEY, generated);
  return generated;
}

function buildChatMessagesFromResponse(response: {
  user_message: {
    message_id: string;
    role: z.infer<typeof chatMessageRoleSchema>;
    content: string;
    created_at: string;
  };
  assistant_message: {
    message_id: string;
    role: z.infer<typeof chatMessageRoleSchema>;
    content: string;
    created_at: string;
  };
  citations: LocalElectionChatCitation[];
  info_gap_flags: string[];
  follow_up_suggestions: string[];
}) {
  return [
    {
      id: response.user_message.message_id,
      role: response.user_message.role,
      content: response.user_message.content,
      createdAt: response.user_message.created_at,
      citations: [],
      infoGapFlags: [],
      followUpSuggestions: [],
    },
    {
      id: response.assistant_message.message_id,
      role: response.assistant_message.role,
      content: response.assistant_message.content,
      createdAt: response.assistant_message.created_at,
      citations: response.citations,
      infoGapFlags: response.info_gap_flags,
      followUpSuggestions: response.follow_up_suggestions,
    },
  ] satisfies ChatUiMessage[];
}

function isApiErrorWithStatus(error: unknown, status: number) {
  return error instanceof ApiError && error.status === status;
}

function buildChatErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 503) {
    return "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.";
  }

  if (error instanceof ApiError) {
    return error.message || "답변을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.";
  }

  return "답변을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.";
}

function getChatSourceTypeLabel(sourceType: LocalElectionChatCitation["source_type"]) {
  const labels = {
    official: "공식 자료",
    semi_official: "준공식 자료",
    auxiliary: "보조 자료",
  } as const;

  return labels[sourceType];
}

function getChatCitationHeading(
  citation: LocalElectionChatCitation,
  candidateNameMap: Map<string, string>,
) {
  const candidateName =
    citation.candidate_id && candidateNameMap.get(citation.candidate_id)
      ? candidateNameMap.get(citation.candidate_id)
      : null;
  const articleKind = getChatCitationArticleKind(citation);

  if (candidateName && articleKind) {
    return `${candidateName} · ${articleKind}`;
  }
  if (candidateName) {
    return `${candidateName} · ${citation.label}`;
  }
  return articleKind ? articleKind : citation.label;
}

function getChatCitationArticleKind(citation: LocalElectionChatCitation) {
  if (citation.label.includes("·")) {
    return citation.label.split("·")[1]?.trim() || citation.label;
  }

  const text = `${citation.label} ${citation.snippet}`.toLowerCase();
  if (text.includes("인터뷰")) return "인터뷰";
  if (text.includes("출마") || text.includes("기자회견")) return "출마 기사";
  if (text.includes("생활체육") || text.includes("노인회") || text.includes("축구회")) {
    return "지역 활동 기사";
  }
  if (text.includes("지선") || text.includes("연임도전") || text.includes("구도")) {
    return "선거 구도 기사";
  }
  return citation.label;
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

function buildCompareSections(
  candidates: CandidateRecord[],
  issueProfile: UserIssueProfile | null,
): CompareTableSection[] {
  const sections: CompareTableSection[] = [];

  if (issueProfile?.normalized_issue_keys.length) {
    sections.push({
      id: "issues",
      title: "관심 이슈",
      description: "내가 고른 기준에서 후보별로 어떤 공개 근거가 붙는지 먼저 봅니다.",
      rows: issueProfile.normalized_issue_keys.map((issueKey) => ({
        id: `issue:${issueKey}`,
        label: getIssueLabel(issueKey),
        values: candidates.map((candidate) => {
          const match = getRelevantIssueMatches(candidate, {
            ...issueProfile,
            normalized_issue_keys: [issueKey],
          })[0];

          if (!match) {
            return {
              primary: "관련 정보 부족",
              muted: true,
            } satisfies CompareTableCell;
          }

          return {
            primary: match.reasons[0] || "관련 근거 확인",
            chips: [
              {
                label: getIssueMatchLevelLabel(match.level),
                tone: match.level === "insufficient" ? "warn" : "accent",
              },
            ],
          } satisfies CompareTableCell;
        }),
      })),
    });
  }

  sections.push({
    id: "summary",
    title: "핵심 요약",
    description: "길게 읽지 않아도 차이를 잡을 수 있도록 핵심 문장만 모았습니다.",
    rows: [
      {
        id: "summary:core",
        label: "핵심 요약",
        values: candidates.map((candidate) => {
          const lines = candidate.compare_entry?.summary || candidate.brief?.summary_lines || [];
          return {
            primary: lines[0] || "요약 정보 부족",
            secondary: lines.slice(1),
            muted: lines.length === 0,
          } satisfies CompareTableCell;
        }),
      },
      {
        id: "summary:diff",
        label: "차별점",
        values: candidates.map((candidate) => ({
          primary: candidate.brief?.differentiator || "대표 차별점 공개 정보 부족",
          muted: !candidate.brief?.differentiator,
        })),
      },
    ],
  });

  sections.push({
    id: "facts",
    title: "기본 정보",
    description: "공식 공개 정보만 빠르게 가로로 훑을 수 있도록 정리했습니다.",
    rows: FACT_LABELS.map((label) => ({
      id: `fact:${label}`,
      label,
      values: candidates.map((candidate) => {
        const fact = candidate.compare_entry?.facts.find((item) => item.label === label);
        const value = fact?.value || "정보 없음";
        return {
          primary: value,
          muted: value === "정보 없음",
        } satisfies CompareTableCell;
      }),
    })),
  });

  sections.push({
    id: "sources",
    title: "출처와 정보 부족",
    description: "어디까지 확인됐는지, 추가로 더 확인해야 할 것이 무엇인지 함께 봅니다.",
    rows: [
      {
        id: "sources:refs",
        label: "출처",
        values: candidates.map((candidate) => {
          const sourceRefs = candidate.compare_entry?.source_refs || [];
          const latestSource = sourceRefs[0];
          return {
            primary: sourceRefs.length > 0 ? `${sourceRefs.length}건 연결` : "연결된 출처 없음",
            secondary: latestSource?.as_of
              ? [`최신 기준: ${formatKoreanDateTime(latestSource.as_of)}`]
              : sourceRefs.length > 0
                ? ["기준 시각 정보 없음"]
                : [],
            chips: sourceRefs.map((source) => ({
              label: source.label,
              tone: "neutral",
            })),
            muted: sourceRefs.length === 0,
          } satisfies CompareTableCell;
        }),
      },
      {
        id: "sources:gaps",
        label: "정보 부족",
        values: candidates.map((candidate) => {
          const infoGaps = candidate.compare_entry?.info_gap_flags || [];
          return {
            primary: infoGaps.length > 0 ? `${infoGaps.length}개 항목` : "표시할 부족 정보 없음",
            chips: infoGaps.map((flag) => ({
              label: flag,
              tone: "warn",
            })),
            muted: infoGaps.length === 0,
          } satisfies CompareTableCell;
        }),
      },
    ],
  });

  return sections;
}

function fingerprintCompareCell(cell: CompareTableCell) {
  return JSON.stringify({
    primary: cell.primary || "",
    secondary: cell.secondary || [],
    chips: (cell.chips || []).map((chip) => `${chip.tone}:${chip.label}`),
    muted: Boolean(cell.muted),
  });
}

function rowHasDifference(row: CompareTableRow) {
  if (row.values.length <= 1) return true;
  const unique = new Set(row.values.map(fingerprintCompareCell));
  return unique.size > 1;
}

function CompareSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="mb-4 rounded-2xl overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
      }}
    >
      <div
        className="px-4 py-3"
        style={{
          background: "linear-gradient(180deg, rgba(248,246,240,0.92), rgba(255,255,255,0.88))",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <p className="text-[12px] font-bold mb-1" style={{ color: "var(--navy)" }}>
          {title}
        </p>
        {description && (
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        )}
      </div>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function CompareDataRow({
  label,
  gridCols,
  candidates,
  values,
}: {
  label: string;
  gridCols: string;
  candidates: CandidateRecord[];
  values: CompareTableCell[];
}) {
  return (
    <div
      className="px-3 py-3"
      style={{ borderBottom: "1px solid rgba(148,163,184,0.14)" }}
    >
      <div className="px-1 pb-2">
        <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
      </div>
      <div
        className="px-1"
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          gap: "10px",
        }}
      >
        {candidates.map((candidate, index) => {
          const partyColor = getPartyColor(candidate.party_name);
          const value = values[index];
          return (
            <div
              key={`${candidate.candidate_id}-${label}`}
              className="py-3 px-3 rounded-2xl"
              style={{
                background: "var(--surface-alt)",
                border: "1px solid rgba(148,163,184,0.14)",
                borderTop: `3px solid ${partyColor}66`,
                minHeight: "100%",
              }}
            >
              <CompareDataCell cell={value} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompareDataCell({ cell }: { cell: CompareTableCell }) {
  return (
    <div className="space-y-2">
      <p
        className="text-[12px] leading-relaxed"
        style={{ color: cell.muted ? "var(--text-tertiary)" : "var(--foreground)" }}
      >
        {cell.primary || "정보 없음"}
      </p>
      {cell.secondary && cell.secondary.length > 0 && (
        <div className="space-y-1">
          {cell.secondary.map((line) => (
            <p
              key={line}
              className="text-[10px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {line}
            </p>
          ))}
        </div>
      )}
      {cell.chips && cell.chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cell.chips.map((chip) => (
            <span
              key={`${chip.tone}:${chip.label}`}
              className="rounded-full px-2 py-1 text-[10px] font-medium"
              style={getCompareChipStyle(chip.tone)}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function getCompareChipStyle(tone: CompareTableChip["tone"]) {
  if (tone === "accent") {
    return {
      background: "var(--amber-bg)",
      color: "var(--amber)",
    };
  }

  if (tone === "warn") {
    return {
      background: "var(--warning-bg)",
      color: "var(--warning-text)",
      border: "1px solid rgba(180,83,9,0.12)",
    };
  }

  return {
    background: "var(--surface)",
    color: "var(--navy)",
    border: "1px solid var(--border)",
  };
}
