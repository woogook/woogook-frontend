"use client";

import { useState } from "react";
import { CandidateRecord, getPartyColor, parseBirthAge, parseCareer } from "../data";
import { CandidatePhoto } from "./CandidateCards";

interface Props {
  candidate: CandidateRecord;
  onBack: () => void;
}

type Tab = "career" | "info";

export default function DetailView({ candidate, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("career");

  const partyColor = getPartyColor(candidate.party_name);
  const birthAge = parseBirthAge(candidate.birthdate_text);
  const careerLines = parseCareer(candidate.career);

  // Fixed: null crime_text should not highlight
  const crimeDisplay = candidate.crime_text || "정보 없음";
  const crimeHighlight = !!candidate.crime_text && candidate.crime_text !== "없음";

  const tabs: { id: Tab; label: string }[] = [
    { id: "career", label: "경력/학력" },
    { id: "info", label: "공개정보" },
  ];

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

        {/* Header card */}
        <div
          className="animate-fade-in-up stagger-1 rounded overflow-hidden mb-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="h-[3px]" style={{ background: partyColor }} />
          <div className="p-4">
            <div className="flex gap-4">
              {/* Photo with proper fallback */}
              <CandidatePhoto src={candidate.photo_url} alt={candidate.name_ko} size="lg" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[20px] font-bold" style={{ color: "var(--navy)" }}>
                    {candidate.name_ko}
                  </span>
                  {candidate.name_hanja && (
                    <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                      {candidate.name_hanja}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {candidate.party_name ? (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded"
                      style={{ background: `${partyColor}18`, color: partyColor }}
                    >
                      {candidate.party_name}
                    </span>
                  ) : (
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded"
                      style={{ background: "var(--surface-alt)", color: "var(--text-secondary)" }}
                    >
                      무소속
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-0.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  {birthAge && (
                    <div className="flex gap-2">
                      <span style={{ color: "var(--text-tertiary)" }}>생년월일</span>
                      <span>{birthAge.birth} ({birthAge.age})</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span style={{ color: "var(--text-tertiary)" }}>성별</span>
                    <span>{candidate.gender}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Job & Education quick info */}
            <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid var(--border)" }}>
              {candidate.job && (
                <div className="flex items-start gap-2 text-[12px]">
                  <span className="shrink-0 w-10 font-medium" style={{ color: "var(--text-tertiary)" }}>직업</span>
                  <span className="line-clamp-2" style={{ color: "var(--foreground)" }}>{candidate.job}</span>
                </div>
              )}
              {candidate.education && (
                <div className="flex items-start gap-2 text-[12px]">
                  <span className="shrink-0 w-10 font-medium" style={{ color: "var(--text-tertiary)" }}>학력</span>
                  <span className="line-clamp-2" style={{ color: "var(--foreground)" }}>{candidate.education}</span>
                </div>
              )}
              {candidate.address && (
                <div className="flex items-start gap-2 text-[12px]">
                  <span className="shrink-0 w-10 font-medium" style={{ color: "var(--text-tertiary)" }}>주소</span>
                  <span className="line-clamp-1" style={{ color: "var(--foreground)" }}>{candidate.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="animate-fade-in-up stagger-2 flex mb-4"
          style={{ borderBottom: "1px solid var(--border)" }}
          role="tablist"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2.5 text-[13px] font-medium transition-all cursor-pointer relative text-center"
              style={{ color: activeTab === tab.id ? "var(--navy)" : "var(--text-secondary)", minHeight: "44px" }}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px]" style={{ background: "var(--navy)" }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="animate-fade-in" role="tabpanel">
          {/* Career tab */}
          {activeTab === "career" && (
            <div
              className="rounded p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {careerLines.length > 0 ? (
                <>
                  <h3 className="text-[12px] font-semibold mb-3" style={{ color: "var(--navy)" }}>
                    주요 경력
                  </h3>
                  <div className="space-y-2">
                    {careerLines.map((line, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="flex flex-col items-center pt-1.5">
                          <div
                            className="w-[5px] h-[5px] rounded-full shrink-0"
                            style={{ background: i === 0 ? "var(--navy)" : "var(--border-dark)" }}
                          />
                          {i < careerLines.length - 1 && (
                            <div className="w-px flex-1 min-h-[12px] mt-0.5" style={{ background: "var(--border)" }} />
                          )}
                        </div>
                        <span className="text-[12px] leading-relaxed pb-1" style={{ color: "var(--foreground)" }}>
                          {line}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[12px] text-center py-4" style={{ color: "var(--text-tertiary)" }}>
                  등록된 경력 정보가 없습니다.
                </p>
              )}

              {candidate.education && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <h3 className="text-[12px] font-semibold mb-1" style={{ color: "var(--navy)" }}>
                    학력
                  </h3>
                  <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                    {candidate.education}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Info tab */}
          {activeTab === "info" && (
            <div className="space-y-2">
              {[
                {
                  label: "전과기록",
                  value: crimeDisplay,
                  icon: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
                  highlight: crimeHighlight,
                },
                {
                  label: "등록일",
                  value: candidate.registration_date,
                  icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
                  highlight: false,
                },
                {
                  label: "선거구",
                  value: candidate.district_name_raw,
                  icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
                  highlight: false,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded px-4 py-3"
                  style={{
                    background: item.highlight ? "var(--warning-bg)" : "var(--surface)",
                    border: `1px solid ${item.highlight ? "var(--warning-text)" : "var(--border)"}`,
                  }}
                >
                  <svg
                    width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    className="shrink-0"
                    style={{ color: item.highlight ? "var(--warning-text)" : "var(--text-tertiary)" }}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                  <span className="text-[12px] font-medium shrink-0 w-14" style={{ color: "var(--text-secondary)" }}>
                    {item.label}
                  </span>
                  <span
                    className="text-[13px] font-medium truncate"
                    style={{ color: item.highlight ? "var(--warning-text)" : "var(--navy)" }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}

              {/* External links */}
              {candidate.detail_url && (
                <div className="mt-3 pt-3">
                  <a
                    href={candidate.detail_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full h-[44px] rounded text-[13px] font-medium transition-all active:scale-[0.98]"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--navy)",
                    }}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    선관위 상세정보 보기
                  </a>
                </div>
              )}

              {/* Source note */}
              <div className="mt-2 px-3">
                <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  출처: 중앙선거관리위원회 예비후보자 명부 ({candidate.source_kind === "nec_processed_precandidate" ? "예비후보" : "후보"} 기준)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
