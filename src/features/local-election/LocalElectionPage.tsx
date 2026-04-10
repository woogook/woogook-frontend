"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import type { ChatSelectionBasis } from "@/lib/schemas";
import { ballotsQueryOptions } from "@/lib/api-client";
import { ballotsSearchParamsSchema } from "@/lib/schemas";
import {
  BallotItem,
  BallotResponse,
  CandidateRecord,
  UserIssueProfile,
  formatKoreanDate,
  formatKoreanDateTime,
  getActiveIssueProfile,
  getDataPhaseLabel,
  makeEmptyIssueProfile,
} from "@/features/local-election/data";
import AddressInput from "./components/AddressInput";
import BallotSummary from "./components/BallotSummary";
import CandidateCards from "./components/CandidateCards";
import CompareView from "./components/CompareView";
import CompareScopeView from "./components/CompareScopeView";
import DetailView from "./components/DetailView";
import IssueStep from "./components/IssueStep";

type View =
  | "address"
  | "ballot"
  | "issues"
  | "candidates"
  | "compare_scope"
  | "compare"
  | "detail";
type IssueOriginView =
  | "ballot"
  | "candidates"
  | "compare_scope"
  | "compare"
  | "detail";

const ISSUE_STORAGE_KEY = "woogook.local-election.issue-profiles.v1";

export default function LocalElectionPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("address");
  const [ballotData, setBallotData] = useState<BallotResponse | null>(null);
  const [selectedBallot, setSelectedBallot] = useState<BallotItem | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRecord | null>(
    null,
  );
  const [detailReturnView, setDetailReturnView] = useState<View>("candidates");
  const [selectedCompareCandidateIds, setSelectedCompareCandidateIds] = useState<
    string[]
  >([]);
  const [compareSelectionBasis, setCompareSelectionBasis] =
    useState<ChatSelectionBasis>("all");
  const [compareSelectionLabel, setCompareSelectionLabel] = useState<string | null>(
    null,
  );
  const [issueOriginView, setIssueOriginView] = useState<IssueOriginView>("ballot");
  const [issueProfiles, setIssueProfiles] = useState<
    Record<string, UserIssueProfile>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootStyle: CSSProperties = {
    background: "var(--background)",
    ["--nav-height" as string]: "60px",
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ISSUE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, UserIssueProfile>;
      setIssueProfiles(parsed);
    } catch (storageError) {
      console.error("[issueProfiles] failed to load", storageError);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [view]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ISSUE_STORAGE_KEY, JSON.stringify(issueProfiles));
    } catch (storageError) {
      console.error("[issueProfiles] failed to persist", storageError);
    }
  }, [issueProfiles]);

  const navigate = useCallback((newView: View) => {
    setView(newView);
    window.history.pushState({ view: newView }, "");
  }, []);

  useEffect(() => {
    window.history.replaceState({ view: "address" }, "");

    const handlePopState = (event: PopStateEvent) => {
      const targetView = event.state?.view as View | undefined;
      setView(targetView || "address");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleAddressSubmit = async (
    city: string,
    district: string,
    dong: string,
  ) => {
    const params = ballotsSearchParamsSchema.parse({
      city,
      sigungu: district,
      emd: dong,
    });

    setError(null);
    setLoading(true);
    setBallotData(null);
    setSelectedBallot(null);
    setSelectedCandidate(null);
    setSelectedCompareCandidateIds([]);
    setCompareSelectionBasis("all");
    setCompareSelectionLabel(null);

    try {
      const data = await queryClient.fetchQuery(ballotsQueryOptions(params));
      setBallotData(data);
      navigate("ballot");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBallot = (ballot: BallotItem) => {
    if (ballot.candidates.length === 0 && ballot.ballot_subject_type === "party_list") {
      return;
    }
    setSelectedBallot(ballot);
    setSelectedCandidate(null);
    setSelectedCompareCandidateIds([]);
    setCompareSelectionBasis("all");
    setCompareSelectionLabel(null);
    setIssueOriginView("ballot");
    navigate("issues");
  };

  const handleSelectCandidate = (
    candidate: CandidateRecord,
    fromView: View = "candidates",
  ) => {
    setSelectedCandidate(candidate);
    setDetailReturnView(fromView);
    navigate("detail");
  };

  const handleOpenIssueStep = (originView: IssueOriginView) => {
    setIssueOriginView(originView);
    navigate("issues");
  };

  const handleOpenCompareFlow = useCallback(() => {
    if (!selectedBallot) return;

    if (selectedBallot.candidates.length <= 3) {
      setSelectedCompareCandidateIds(
        selectedBallot.candidates.map((candidate) => candidate.candidate_id),
      );
      setCompareSelectionBasis("all");
      setCompareSelectionLabel("전체 후보");
      navigate("compare");
      return;
    }

    setSelectedCompareCandidateIds([]);
    setCompareSelectionBasis("issue");
    setCompareSelectionLabel(null);
    navigate("compare_scope");
  }, [navigate, selectedBallot]);

  const handleStartScopedCompare = useCallback(
    (
      candidateIds: string[],
      selectionBasis: ChatSelectionBasis,
      selectionLabel: string | null,
    ) => {
      setSelectedCompareCandidateIds(candidateIds);
      setCompareSelectionBasis(selectionBasis);
      setCompareSelectionLabel(selectionLabel);
      navigate("compare");
    },
    [navigate],
  );

  const handleIssueSubmit = (profile: UserIssueProfile) => {
    setIssueProfiles((current) => ({
      ...current,
      [profile.contest_id]: profile,
    }));

    if (issueOriginView === "ballot") {
      navigate("candidates");
      return;
    }
    navigate(issueOriginView);
  };

  const handleIssueBack = () => {
    if (issueOriginView === "ballot") {
      navigate("ballot");
      return;
    }
    navigate(issueOriginView);
  };

  const issueDraftProfile = selectedBallot
    ? issueProfiles[selectedBallot.contest_id] ||
      makeEmptyIssueProfile(
        selectedBallot.candidates[0]?.election_id ||
          ballotData?.meta?.election_id ||
          "0020260603",
        selectedBallot.contest_id,
      )
    : null;
  const activeIssueProfile = getActiveIssueProfile(issueDraftProfile);
  const compareCandidates = useMemo(() => {
    if (!selectedBallot) {
      return [];
    }

    if (selectedBallot.candidates.length <= 3) {
      return selectedBallot.candidates;
    }

    if (selectedCompareCandidateIds.length === 0) {
      return [];
    }

    const selectedCandidateIdSet = new Set(selectedCompareCandidateIds);
    return selectedBallot.candidates.filter((candidate) =>
      selectedCandidateIdSet.has(candidate.candidate_id),
    );
  }, [selectedBallot, selectedCompareCandidateIds]);
  const compareBallot = useMemo(() => {
    if (!selectedBallot) {
      return null;
    }

    return {
      ...selectedBallot,
      candidates: compareCandidates,
    };
  }, [compareCandidates, selectedBallot]);
  const compareBackView =
    selectedBallot && selectedBallot.candidates.length >= 4
      ? ("compare_scope" as const)
      : ("candidates" as const);

  return (
    <div className="min-h-[100dvh] flex flex-col" style={rootStyle}>
      <div
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(249,248,245,0.94)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div
          className="mx-auto w-full max-w-5xl px-5 flex items-center justify-between gap-3"
          style={{ height: "var(--nav-height)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
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
                <path d="M4 10h16" />
                <path d="M6 10V8.2c0-.3.18-.57.45-.69L12 4.5l5.55 3.01c.27.12.45.39.45.69V10" />
                <path d="M7 10v7M12 10v7M17 10v7" />
                <path d="M5 17h14" />
              </svg>
            </div>
            <div className="min-w-0">
              <p
                className="text-[13px] font-bold leading-tight truncate"
                style={{ color: "var(--navy)" }}
              >
                내 선거 안내서
              </p>
              <p
                className="text-[11px] leading-snug text-ellipsis whitespace-nowrap overflow-hidden"
                style={{ color: "var(--text-secondary)" }}
              >
                지방선거 서비스
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--border)" }}>
              서비스 허브
            </Link>
            <Link
              href="/assembly"
              className="rounded-full border px-3 py-1.5"
              style={{ borderColor: "var(--border)" }}
            >
              국회 서비스
            </Link>
          </div>
        </div>
      </div>

      {view !== "address" && (
        <header
          className="sticky z-40 px-5 py-3 flex items-center justify-between"
          style={{
            top: "var(--nav-height)",
            background: "rgba(249,248,245,0.92)",
            borderBottom: "1px solid var(--border)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <button
            onClick={() => navigate("address")}
            className="flex items-center gap-1.5 cursor-pointer active:opacity-60"
            style={{ color: "var(--navy)" }}
            aria-label="처음으로 돌아가기"
          >
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: "var(--amber)" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span
              className="text-[14px] font-bold"
              style={{ fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif" }}
            >
              내 선거
            </span>
          </button>

          <nav className="flex items-center gap-0.5 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            <button
              onClick={() => navigate("ballot")}
              className="cursor-pointer active:opacity-60 px-2 py-1.5 -my-1.5 rounded"
              style={{
                color: view === "ballot" ? "var(--navy)" : "var(--text-tertiary)",
                minHeight: "36px",
                display: "flex",
                alignItems: "center",
              }}
              aria-label="투표지 목록으로"
            >
              투표지
            </button>
            {(view === "issues" ||
              view === "candidates" ||
              view === "compare_scope" ||
              view === "compare" ||
              view === "detail") &&
              selectedBallot && (
                <>
                  <span aria-hidden="true">/</span>
                  <button
                    onClick={() =>
                      handleOpenIssueStep(
                        view === "compare" || view === "detail" || view === "candidates"
                          ? view
                          : view === "compare_scope"
                            ? view
                            : "ballot",
                      )
                    }
                    className="cursor-pointer active:opacity-60 px-2 py-1.5 -my-1.5 rounded"
                    style={{
                      color: view === "issues" ? "var(--navy)" : "var(--text-tertiary)",
                      minHeight: "36px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    aria-label="관심 이슈로"
                  >
                    이슈
                  </button>
                </>
              )}
            {(view === "candidates" ||
              view === "compare_scope" ||
              view === "compare" ||
              view === "detail") &&
              selectedBallot && (
                <>
                  <span aria-hidden="true">/</span>
                  <button
                    onClick={() => navigate("candidates")}
                    className="cursor-pointer active:opacity-60 px-2 py-1.5 -my-1.5 rounded max-w-[72px] truncate"
                    style={{
                      color: view === "candidates" ? "var(--navy)" : "var(--text-tertiary)",
                      minHeight: "36px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    aria-label="후보 목록으로"
                  >
                    후보
                  </button>
                </>
              )}
            {view === "compare_scope" && (
              <>
                <span aria-hidden="true">/</span>
                <span className="px-1 py-1.5" style={{ color: "var(--navy)" }}>
                  후보군
                </span>
              </>
            )}
            {view === "compare" && (
              <>
                <span aria-hidden="true">/</span>
                <span className="px-1 py-1.5" style={{ color: "var(--navy)" }}>
                  비교
                </span>
              </>
            )}
            {view === "detail" && selectedCandidate && (
              <>
                <span aria-hidden="true">/</span>
                <span className="px-1 py-1.5" style={{ color: "var(--navy)" }}>
                  {selectedCandidate.name_ko}
                </span>
              </>
            )}
          </nav>
        </header>
      )}

      <div className="flex-1">
        {view === "address" && (
          <AddressInput onSubmit={handleAddressSubmit} loading={loading} error={error} />
        )}

        {view === "ballot" && ballotData && (
          <BallotSummary
            data={ballotData}
            onSelectBallot={handleSelectBallot}
            onBack={() => navigate("address")}
          />
        )}

        {view === "issues" && selectedBallot && issueDraftProfile && (
          <IssueStep
            ballot={selectedBallot}
            initialProfile={issueDraftProfile}
            onSubmit={handleIssueSubmit}
            onBack={handleIssueBack}
          />
        )}

        {view === "candidates" && selectedBallot && (
          <CandidateCards
            ballot={selectedBallot}
            issueProfile={activeIssueProfile}
            onSelectCandidate={handleSelectCandidate}
            onCompare={handleOpenCompareFlow}
            onBack={() => navigate("issues")}
            onEditIssues={() => handleOpenIssueStep("candidates")}
          />
        )}

        {view === "compare_scope" && selectedBallot && (
          <CompareScopeView
            ballot={selectedBallot}
            issueProfile={activeIssueProfile}
            onBack={() => navigate("candidates")}
            onEditIssues={() => handleOpenIssueStep("compare_scope")}
            onSelectCandidate={(candidate) => handleSelectCandidate(candidate, "compare_scope")}
            onStartCompare={handleStartScopedCompare}
          />
        )}

        {view === "compare" && compareBallot && compareBallot.candidates.length > 0 && (
          <CompareView
            ballot={compareBallot}
            totalCandidateCount={selectedBallot?.candidates.length || 0}
            issueProfile={activeIssueProfile}
            selectionBasis={compareSelectionBasis}
            selectionLabel={compareSelectionLabel}
            onSelectCandidate={(candidate) => handleSelectCandidate(candidate, "compare")}
            onBack={() => navigate(compareBackView)}
            onEditIssues={() => handleOpenIssueStep("compare")}
          />
        )}

        {view === "detail" && selectedCandidate && selectedBallot && (
          <DetailView
            candidate={selectedCandidate}
            ballot={selectedBallot}
            issueProfile={activeIssueProfile}
            onBack={() => navigate(detailReturnView)}
            onEditIssues={() => handleOpenIssueStep("detail")}
          />
        )}
      </div>

      {view !== "address" && (
        <footer className="px-5 py-5 safe-bottom" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-[10px] leading-relaxed text-center" style={{ color: "var(--text-tertiary)" }}>
            출처: 중앙선거관리위원회 | 특정 후보를 추천하지 않습니다.
            <br />
            선거일: {formatKoreanDate(ballotData?.meta?.election_day)} | 상태:{" "}
            {ballotData?.meta ? getDataPhaseLabel(ballotData.meta.data_phase) : "정보 없음"} | 기준 시각:{" "}
            {formatKoreanDateTime(ballotData?.meta?.as_of)}
          </p>
        </footer>
      )}
    </div>
  );
}
