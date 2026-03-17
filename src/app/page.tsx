"use client";

import type { CSSProperties } from "react";
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
type ServiceTab = "assembly" | "local";

export default function Home() {
  const [view, setView] = useState<View>("address");
  const [activeTab, setActiveTab] = useState<ServiceTab>("local");
  const [ballotData, setBallotData] = useState<BallotResponse | null>(null);
  const [selectedBallot, setSelectedBallot] = useState<BallotItem | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRecord | null>(null);
  const [detailReturnView, setDetailReturnView] = useState<View>("candidates");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootStyle: CSSProperties = {
    background: "var(--background)",
    ["--nav-height" as string]: "60px",
  };

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

  const handleTabChange = (tab: ServiceTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={rootStyle}>
      {/* Top navigation */}
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
              style={{ background: "var(--amber-bg)", border: "1px solid var(--border)", color: "var(--amber)" }}
              aria-hidden="true"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10h16" />
                <path d="M6 10V8.2c0-.3.18-.57.45-.69L12 4.5l5.55 3.01c.27.12.45.39.45.69V10" />
                <path d="M7 10v7M12 10v7M17 10v7" />
                <path d="M5 17h14" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight truncate" style={{ color: "var(--navy)" }}>
                우리동네 선거
              </p>
              <p className="text-[11px] leading-snug text-ellipsis whitespace-nowrap overflow-hidden" style={{ color: "var(--text-secondary)" }}>
                국회·지방 정보를 한 번에 확인
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2" role="tablist" aria-label="선거 서비스 전환">
            <button
              onClick={() => handleTabChange("assembly")}
              className="px-3 sm:px-4 py-2 rounded-full text-[13px] font-semibold cursor-pointer transition-all"
              style={{
                background: activeTab === "assembly" ? "var(--navy)" : "transparent",
                color: activeTab === "assembly" ? "#ffffff" : "var(--text-secondary)",
                border: activeTab === "assembly" ? "1px solid var(--navy)" : "1px solid var(--border)",
                boxShadow: activeTab === "assembly" ? "0 10px 30px rgba(30,41,59,0.12)" : "none",
              }}
              aria-selected={activeTab === "assembly"}
              role="tab"
              tabIndex={activeTab === "assembly" ? 0 : -1}
            >
              국회
            </button>
            <button
              onClick={() => handleTabChange("local")}
              className="px-3 sm:px-4 py-2 rounded-full text-[13px] font-semibold cursor-pointer transition-all"
              style={{
                background: activeTab === "local" ? "var(--amber)" : "transparent",
                color: activeTab === "local" ? "#ffffff" : "var(--text-secondary)",
                border: activeTab === "local" ? "1px solid var(--amber)" : "1px solid var(--border)",
                boxShadow: activeTab === "local" ? "0 10px 30px rgba(168,132,44,0.18)" : "none",
              }}
              aria-selected={activeTab === "local"}
              role="tab"
              tabIndex={activeTab === "local" ? 0 : -1}
            >
              지방
            </button>
          </div>
        </div>
      </div>

      {/* 국회 서비스 안내 섹션 */}
      {activeTab === "assembly" ? (
        <section className="flex-1 w-full px-5 py-12 flex items-center">
          <div className="mx-auto w-full max-w-[760px] text-center">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full mb-5" style={{ background: "var(--amber-bg)", color: "var(--amber)", border: "1px solid var(--border)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--amber)" }} aria-hidden="true" />
              국회 의원 서비스 준비 중
            </div>
            <h1
              className="text-[1.9rem] leading-[1.25] font-bold tracking-tight mb-3"
              style={{ color: "var(--navy)", fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif" }}
            >
              우리동네 국회의원 안내서
            </h1>
            <p className="text-[14px] leading-relaxed mb-8" style={{ color: "var(--text-secondary)" }}>
              지역구·비례대표 의원 정보, 법안·정책 키워드 검색을 곧 제공할 예정입니다.
              <br />
              지금은 지방선거 정보부터 확인하실 수 있어요.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-4 rounded-xl text-left" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-[12px] font-semibold mb-1.5" style={{ color: "var(--text-tertiary)" }}>국회 서비스</p>
                <p className="text-[15px] font-bold mb-1" style={{ color: "var(--navy)" }}>지역구·비례 의원 찾기</p>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  지역별 의원 매칭, 주요 의정 활동과 공약을 보기 쉽게 준비하고 있어요.
                </p>
              </div>
              <div className="p-4 rounded-xl text-left" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-[12px] font-semibold mb-1.5" style={{ color: "var(--text-tertiary)" }}>키워드 탐색</p>
                <p className="text-[15px] font-bold mb-1" style={{ color: "var(--navy)" }}>법안·정책 검색</p>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  관심 키워드로 법안과 의원 활동을 찾아볼 수 있도록 곧 업데이트될 예정이에요.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => handleTabChange("local")}
                className="w-full sm:w-auto px-5 py-3 rounded-lg font-semibold cursor-pointer active:scale-[0.98] transition-all"
                style={{ background: "var(--navy)", color: "#ffffff" }}
              >
                지방선거 정보 먼저 보기
              </button>
              <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                현재 준비된 기능: 주소로 투표지 확인, 후보 비교, 정책 키워드 탐색(지방)
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Mobile header */}
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
        </>
      )}
    </div>
  );
}
