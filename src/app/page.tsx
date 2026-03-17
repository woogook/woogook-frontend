"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BallotResponse,
  BallotItem,
  CandidateRecord,
} from "./data";
import AddressInput from "./components/AddressInput";
import BallotSummary from "./components/BallotSummary";
import CandidateCards from "./components/CandidateCards";
import DetailView from "./components/DetailView";
import CompareView from "./components/CompareView";

type View = "address" | "ballot" | "candidates" | "compare" | "detail";

export default function Home() {
  const [view, setView] = useState<View>("address");
  const [ballotData, setBallotData] = useState<BallotResponse | null>(null);
  const [selectedBallot, setSelectedBallot] = useState<BallotItem | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRecord | null>(null);
  const [detailReturnView, setDetailReturnView] = useState<View>("candidates");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Scroll to top on view change ─────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [view]);

  // ── Browser history integration ──────────────────────
  const navigate = useCallback((newView: View) => {
    setView(newView);
    window.history.pushState({ view: newView }, "");
  }, []);

  useEffect(() => {
    // Set initial state
    window.history.replaceState({ view: "address" }, "");

    const handlePopState = (e: PopStateEvent) => {
      const targetView = e.state?.view as View | undefined;
      if (targetView) {
        setView(targetView);
      } else {
        setView("address");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // ── Handlers ─────────────────────────────────────────
  const handleAddressSubmit = async (city: string, district: string, dong: string) => {
    const params = new URLSearchParams({
      city,
      sigungu: district,
    });
    if (dong) params.set("emd", dong);

    setError(null);
    setLoading(true);
    setBallotData(null);
    setSelectedBallot(null);
    setSelectedCandidate(null);

    try {
      const res = await fetch(`/api/ballots?${params.toString()}`);
      if (!res.ok) {
        throw new Error("투표구 정보를 불러오지 못했습니다.");
      }
      const data = (await res.json()) as BallotResponse;
      setBallotData(data);
      navigate("ballot");
    } catch (err) {
      console.error(err);
      setError("데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
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
    navigate("candidates");
  };

  const handleSelectCandidate = (candidate: CandidateRecord, fromView: View = "candidates") => {
    setSelectedCandidate(candidate);
    setDetailReturnView(fromView);
    navigate("detail");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--background)" }}>
      {/* Mobile header */}
      {view !== "address" && (
        <header
          className="sticky top-0 z-50 px-5 py-3 flex items-center justify-between"
          style={{
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
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--amber)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[14px] font-bold" style={{ fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif" }}>
              내 선거
            </span>
          </button>

          {/* Breadcrumb — larger touch targets */}
          <nav className="flex items-center gap-0.5 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            <button
              onClick={() => navigate("ballot")}
              className="cursor-pointer active:opacity-60 px-2 py-1.5 -my-1.5 rounded"
              style={{ color: view === "ballot" ? "var(--navy)" : "var(--text-tertiary)", minHeight: "36px", display: "flex", alignItems: "center" }}
              aria-label="투표지 목록으로"
            >
              투표지
            </button>
            {(view === "candidates" || view === "compare" || view === "detail") && selectedBallot && (
              <>
                <span aria-hidden="true">/</span>
                <button
                  onClick={() => navigate("candidates")}
                  className="cursor-pointer active:opacity-60 px-2 py-1.5 -my-1.5 rounded max-w-[72px] truncate"
                  style={{ color: view === "candidates" ? "var(--navy)" : "var(--text-tertiary)", minHeight: "36px", display: "flex", alignItems: "center" }}
                  aria-label="후보 목록으로"
                >
                  후보
                </button>
              </>
            )}
            {view === "compare" && (
              <>
                <span aria-hidden="true">/</span>
                <span className="px-1 py-1.5" style={{ color: "var(--navy)" }}>비교</span>
              </>
            )}
            {view === "detail" && selectedCandidate && (
              <>
                <span aria-hidden="true">/</span>
                <span className="px-1 py-1.5" style={{ color: "var(--navy)" }}>{selectedCandidate.name_ko}</span>
              </>
            )}
          </nav>
        </header>
      )}

      {/* Views */}
      <div className="flex-1">
        {view === "address" && <AddressInput onSubmit={handleAddressSubmit} loading={loading} error={error} />}

        {view === "ballot" && ballotData && (
          <BallotSummary
            data={ballotData}
            onSelectBallot={handleSelectBallot}
            onBack={() => navigate("address")}
          />
        )}

        {view === "candidates" && selectedBallot && (
          <CandidateCards
            ballot={selectedBallot}
            onSelectCandidate={handleSelectCandidate}
            onCompare={() => navigate("compare")}
            onBack={() => navigate("ballot")}
          />
        )}

        {view === "compare" && selectedBallot && selectedBallot.candidates.length > 0 && (
          <CompareView
            ballot={selectedBallot}
            onSelectCandidate={(c) => handleSelectCandidate(c, "compare")}
            onBack={() => navigate("candidates")}
          />
        )}

        {view === "detail" && selectedCandidate && (
          <DetailView
            candidate={selectedCandidate}
            onBack={() => navigate(detailReturnView)}
          />
        )}
      </div>

      {/* Footer — hidden on address view (has its own source note) */}
      {view !== "address" && (
        <footer className="px-5 py-5 safe-bottom" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-[10px] leading-relaxed text-center" style={{ color: "var(--text-tertiary)" }}>
            출처: 중앙선거관리위원회 | 특정 후보를 추천하지 않습니다.
            <br />
            정보 기준일: 2026.05.15 | 예비후보 기준 데이터
          </p>
        </footer>
      )}
    </div>
  );
}
