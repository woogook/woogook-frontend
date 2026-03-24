"use client";

import { useState } from "react";
import {
  BallotResponse,
  BallotItem,
  AmbiguousBallot,
  formatKoreanDate,
  getDataPhaseLabel,
  getOfficeLevelLabel,
  getRepresentationLabel,
  getContestTitle,
} from "../data";

interface Props {
  data: BallotResponse;
  onSelectBallot: (ballot: BallotItem) => void;
  onBack: () => void;
}

export default function BallotSummary({ data, onSelectBallot, onBack }: Props) {
  const [selectedAmbiguous, setSelectedAmbiguous] = useState<Record<string, string>>({});

  const isAmbiguous = data.resolution_status === "partially_ambiguous" || data.resolution_status === "ambiguous";
  const totalBallots = data.ballot_count + data.ambiguous_ballots.length;

  // Check if an ambiguous selection has been confirmed
  const handleAmbiguousConfirm = (ab: AmbiguousBallot) => {
    const selectedContestId = selectedAmbiguous[ab.election_code];
    if (!selectedContestId) return;

    const selectedOption = ab.options.find((o) => o.contest_id === selectedContestId);
    if (!selectedOption) return;

    // Create a minimal BallotItem from the selected option (no candidates yet)
    const resolvedBallot: BallotItem = {
      contest_id: selectedOption.contest_id,
      election_code: ab.election_code,
      election_name: ab.election_name,
      ballot_subject_type: "candidate_person",
      office_level: "metro_council",
      representation_type: "district",
      special_region_type: "general",
      geographic_scope: "district",
      city_code: data.ballots[0]?.city_code || 0,
      city_name_canonical: data.city_name_canonical,
      sigungu_name: selectedOption.parent_area_name,
      display_name: selectedOption.display_name,
      parent_area_name: selectedOption.parent_area_name,
      seats: 1,
      candidates: [],
    };

    onSelectBallot(resolvedBallot);
  };

  return (
    <section className="px-5 pt-4 pb-8">
      <div className="w-full max-w-[400px] mx-auto">
        {/* Back */}
        <button
          onClick={onBack}
          className="animate-fade-in-up inline-flex items-center gap-1 text-[13px] mb-4 cursor-pointer active:opacity-60"
          style={{ color: "var(--text-secondary)" }}
          aria-label="주소 다시 선택"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          주소 다시 선택
        </button>

        {/* Header */}
        <div className="animate-fade-in-up stagger-1 mb-5">
          <h2 className="text-[1.375rem] font-bold tracking-tight mb-1" style={{ color: "var(--navy)" }}>
            내가 받는 투표용지
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded"
              style={{ background: "var(--amber-bg)", color: "var(--amber)" }}
            >
              {data.city_name_canonical} {data.sigungu_name} {data.emd_name}
            </span>
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              총 {totalBallots}장
            </span>
          </div>
        </div>

        {/* Election date card */}
        <div
          className="animate-fade-in-up stagger-2 flex items-center gap-3 px-4 py-3 rounded mb-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--amber)" }} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <div>
            <span className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>
              투표일 {formatKoreanDate(data.meta?.election_day)}
            </span>
            <span className="text-[11px] block" style={{ color: "var(--text-tertiary)" }}>
              {data.meta ? `${getDataPhaseLabel(data.meta.data_phase)} 기준 정보` : "선거 일정 정보 준비 중"}
            </span>
          </div>
        </div>

        {/* Ambiguous warning */}
        {isAmbiguous && data.ambiguous_ballots.length > 0 && (
          <div
            className="animate-fade-in-up stagger-3 px-4 py-3 rounded mb-4"
            style={{ background: "var(--warning-bg)", borderLeft: "3px solid var(--warning-text)" }}
          >
            <p className="text-[12px] font-medium leading-relaxed" style={{ color: "var(--warning-text)" }}>
              {data.resolution_status === "ambiguous"
                ? "입력한 주소로는 선거구를 특정할 수 없습니다. 아래에서 해당하는 선거구를 직접 선택해주세요."
                : "일부 선거구가 정확히 특정되지 않았습니다. 아래에서 해당하는 선거구를 직접 선택해주세요."}
            </p>
          </div>
        )}

        {/* Resolved ballots */}
        {data.ballots.length > 0 && (
          <div className="space-y-2 mb-4">
            {data.ballots.map((ballot, i) => (
              <BallotCard
                key={ballot.contest_id}
                ballot={ballot}
                index={i}
                onSelect={() => onSelectBallot(ballot)}
              />
            ))}
          </div>
        )}

        {/* Ambiguous ballots */}
        {data.ambiguous_ballots.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide px-1 mb-1" style={{ color: "var(--warning-text)" }}>
              선거구 선택 필요
            </p>
            {data.ambiguous_ballots.map((ab) => (
              <AmbiguousBallotCard
                key={`ambiguous-${ab.election_code}`}
                ballot={ab}
                selected={selectedAmbiguous[ab.election_code] || ""}
                onSelect={(contestId) =>
                  setSelectedAmbiguous((prev) => ({ ...prev, [ab.election_code]: contestId }))
                }
                onConfirm={() => handleAmbiguousConfirm(ab)}
              />
            ))}
          </div>
        )}

        {/* Source note */}
        <div
          className="mt-6 px-3 py-2.5 rounded"
          style={{ background: "var(--surface-alt)", borderLeft: "2px solid var(--border-dark)" }}
        >
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            선거구 정보는 중앙선거관리위원회 고시를 기준으로 합니다.
            다음 단계에서 관심 이슈를 입력하면 후보를 그 기준으로 다시 정렬해 볼 수 있습니다.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Sub-components ─────────────────────────────────────

function BallotCard({
  ballot,
  index,
  onSelect,
}: {
  ballot: BallotItem;
  index: number;
  onSelect: () => void;
}) {
  const isPartyList = ballot.ballot_subject_type === "party_list";
  const hasCandidates = ballot.candidates.length > 0;
  const levelLabel = getOfficeLevelLabel(ballot.office_level);
  const repLabel = getRepresentationLabel(ballot.representation_type);
  const isDisabled = !hasCandidates && isPartyList;

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`animate-fade-in-up stagger-${Math.min(index + 3, 7)} w-full text-left rounded transition-all cursor-pointer active:scale-[0.98] disabled:cursor-default disabled:active:scale-100 group`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        opacity: isDisabled ? 0.55 : 1,
      }}
      aria-label={`${ballot.election_name} ${ballot.display_name} ${hasCandidates ? `후보 ${ballot.candidates.length}명` : "후보 정보 준비 중"}`}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Number badge */}
        <div
          className="w-9 h-9 rounded flex items-center justify-center text-[13px] font-bold shrink-0"
          style={{
            background: isPartyList ? "var(--surface-alt)" : "var(--navy)",
            color: isPartyList ? "var(--text-secondary)" : "white",
          }}
        >
          {isPartyList ? "P" : ballot.election_code}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[14px] font-semibold" style={{ color: "var(--navy)" }}>
              {getContestTitle(ballot)}
            </span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ background: "var(--surface-alt)", color: "var(--text-secondary)" }}
            >
              {levelLabel}
            </span>
            {isPartyList && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: "var(--info-bg)", color: "var(--info-text)" }}
              >
                정당투표
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {ballot.display_name}
            </span>
            {repLabel && (
              <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                {repLabel}
              </span>
            )}
            {!isPartyList && (
              <span className="text-[10px]" style={{ color: hasCandidates ? "var(--text-tertiary)" : "var(--warning-text)" }}>
                {hasCandidates ? `후보 ${ballot.candidates.length}명` : "후보 정보 준비 중"}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        {!isDisabled && (
          <svg
            width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            className="shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ color: "var(--text-tertiary)" }}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        )}
      </div>
    </button>
  );
}

function AmbiguousBallotCard({
  ballot,
  selected,
  onSelect,
  onConfirm,
}: {
  ballot: AmbiguousBallot;
  selected: string;
  onSelect: (contestId: string) => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="rounded overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--warning-text)",
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="text-[14px] font-semibold" style={{ color: "var(--navy)" }}>
          {ballot.election_name}
        </span>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
          아래 선거구 중 본인의 선거구를 선택하세요
        </p>
      </div>
      <div className="p-2 space-y-1.5">
        {ballot.options.map((option) => (
          <button
            key={option.contest_id}
            onClick={() => onSelect(option.contest_id)}
            className="w-full text-left px-3 py-3 rounded text-[13px] transition-all cursor-pointer active:scale-[0.98]"
            style={{
              background: selected === option.contest_id ? "var(--amber-bg)" : "transparent",
              border: `1px solid ${selected === option.contest_id ? "var(--amber)" : "var(--border)"}`,
              color: selected === option.contest_id ? "var(--amber)" : "var(--foreground)",
              fontWeight: selected === option.contest_id ? 600 : 400,
              minHeight: "48px",
            }}
            aria-pressed={selected === option.contest_id}
          >
            <span className="block">{option.display_name}</span>
            {option.parent_area_name && (
              <span className="text-[10px] block mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {option.parent_area_name}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Confirm button */}
      <div className="px-2 pb-2">
        <button
          onClick={onConfirm}
          disabled={!selected}
          className="w-full h-[44px] text-[13px] font-semibold rounded transition-all cursor-pointer active:scale-[0.98] disabled:opacity-35 disabled:cursor-default text-white"
          style={{ background: "var(--amber)" }}
        >
          {selected ? "선거구 확인하고 후보 보기" : "선거구를 선택하세요"}
        </button>
      </div>
    </div>
  );
}
