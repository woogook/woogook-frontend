"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CandidateRecord, ChatSelectionBasis } from "@/lib/schemas";
import {
  BallotItem,
  UserIssueProfile,
  getCandidateIssueSortScore,
  getEvidenceStatusLabel,
  getIssueLabel,
  getIssueMatchLevelLabel,
  getIssueProfileLabelList,
  getPartyColor,
  getRelevantIssueMatches,
} from "../data";
import { CandidatePhoto } from "./CandidateCards";

type CompareScopeLens = Exclude<ChatSelectionBasis, "all">;

type CompareScopeOption = {
  id: string;
  basis: Exclude<CompareScopeLens, "manual">;
  title: string;
  description: string;
  candidateIds: string[];
  candidateNames: string[];
  countLabel: string;
};

interface Props {
  ballot: BallotItem;
  issueProfile: UserIssueProfile | null;
  onBack: () => void;
  onEditIssues: () => void;
  onSelectCandidate: (candidate: CandidateRecord) => void;
  onStartCompare: (
    candidateIds: string[],
    selectionBasis: ChatSelectionBasis,
    selectionLabel: string | null,
  ) => void;
}

const LENS_META: Array<{
  key: CompareScopeLens;
  label: string;
  helper: string;
}> = [
  {
    key: "issue",
    label: "이슈 우선",
    helper: "선택 이슈와 직접 연결되는 후보부터 좁혀 봅니다.",
  },
  {
    key: "evidence",
    label: "정보 충분 후보",
    helper: "공개 자료가 상대적으로 많은 후보를 먼저 봅니다.",
  },
  {
    key: "party",
    label: "정당별",
    helper: "정당별로 최대 3명까지 묶어 비교합니다.",
  },
  {
    key: "incumbent",
    label: "현직/비현직",
    helper: "의정 경험이 드러난 후보와 그렇지 않은 후보를 나눠 봅니다.",
  },
  {
    key: "manual",
    label: "직접 선택",
    helper: "내가 보고 싶은 후보를 최대 3명까지 고릅니다.",
  },
];

export default function CompareScopeView({
  ballot,
  issueProfile,
  onBack,
  onEditIssues,
  onSelectCandidate,
  onStartCompare,
}: Props) {
  const issueLabels = getIssueProfileLabelList(issueProfile);
  const optionsByLens = useMemo(
    () => buildCompareScopeOptions(ballot, issueProfile),
    [ballot, issueProfile],
  );
  const defaultLens: CompareScopeLens =
    optionsByLens.issue.length > 0 ? "issue" : "evidence";
  const [activeLens, setActiveLens] = useState<CompareScopeLens | null>(null);
  const [manualSelection, setManualSelection] = useState<string[]>([]);
  const currentLens = activeLens ?? defaultLens;

  const issueRelevantCount = useMemo(
    () =>
      ballot.candidates.filter((candidate) =>
        getRelevantIssueMatches(candidate, issueProfile).some(
          (match) => match.level !== "insufficient",
        ),
      ).length,
    [ballot.candidates, issueProfile],
  );
  const infoGapCount = useMemo(
    () =>
      ballot.candidates.filter(
        (candidate) => (candidate.compare_entry?.info_gap_flags.length || 0) > 0,
      ).length,
    [ballot.candidates],
  );
  const partySummary = useMemo(
    () =>
      Array.from(
        ballot.candidates.reduce((accumulator, candidate) => {
          const key = candidate.party_name || "무소속";
          accumulator.set(key, (accumulator.get(key) || 0) + 1);
          return accumulator;
        }, new Map<string, number>()),
      )
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3)
        .map(([name, count]) => `${name} ${count}명`)
        .join(" · "),
    [ballot.candidates],
  );

  const toggleManualCandidate = (candidateId: string) => {
    setManualSelection((current) => {
      if (current.includes(candidateId)) {
        return current.filter((item) => item !== candidateId);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, candidateId];
    });
  };

  return (
    <section className="px-5 pt-4 pb-24">
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
              <h2
                className="text-[1.375rem] font-bold tracking-tight mb-1"
                style={{ color: "var(--navy)" }}
              >
                후보 지형 보기
              </h2>
              <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                전체 {ballot.candidates.length}명 중 먼저 비교할 후보군을 고릅니다.
              </p>
            </div>
            <button
              type="button"
              onClick={onEditIssues}
              className="px-3 py-2 rounded text-[12px] font-semibold cursor-pointer"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--navy)",
              }}
            >
              이슈 수정
            </button>
          </div>
        </div>

        <div
          className="animate-fade-in-up stagger-2 rounded-2xl px-4 py-4 mb-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="전체 후보" value={`${ballot.candidates.length}명`} helper={partySummary || "정당 정보 없음"} />
            <StatCard
              label="이슈 연결 후보"
              value={`${issueRelevantCount}명`}
              helper={issueLabels.length > 0 ? issueLabels.join(" · ") : "선택 이슈 없음"}
            />
            <StatCard label="정보 부족 후보" value={`${infoGapCount}명`} helper="추가 확인이 필요한 후보" />
            <StatCard
              label="추천 시작점"
              value={issueLabels.length > 0 ? "이슈 우선" : "정보 충분"}
              helper={
                issueLabels.length > 0
                  ? "내 관심 이슈 관련 후보부터 보기"
                  : "공개 정보가 많은 후보부터 보기"
              }
            />
          </div>
        </div>

        <div
          className="animate-fade-in-up stagger-3 rounded-2xl px-4 py-3 mb-4"
          style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
        >
          <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--navy)" }}>
            비교 전에 범위를 먼저 좁혀보세요
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            후보가 많을수록 한 번에 모두 비교하기보다, 이슈나 정당처럼 기준이 분명한 후보군부터 보는 편이 더 빠르게 핵심을 잡을 수 있습니다.
          </p>
        </div>

        <div className="animate-fade-in-up stagger-4 mb-4 flex gap-2 overflow-x-auto pb-1">
          {LENS_META.map((lens) => (
            <button
              key={lens.key}
              type="button"
              onClick={() => setActiveLens(lens.key)}
              className="shrink-0 rounded-full px-3 py-2 text-[11px] font-semibold cursor-pointer"
              style={{
                background:
                  currentLens === lens.key ? "var(--navy)" : "var(--surface)",
                color: currentLens === lens.key ? "#ffffff" : "var(--navy)",
                border:
                  currentLens === lens.key
                    ? "1px solid var(--navy)"
                    : "1px solid var(--border)",
              }}
            >
              {lens.label}
            </button>
          ))}
        </div>

        <div className="mb-3">
          <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--navy)" }}>
            {LENS_META.find((lens) => lens.key === currentLens)?.label}
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {LENS_META.find((lens) => lens.key === currentLens)?.helper}
          </p>
        </div>

        {currentLens === "manual" ? (
          <div className="space-y-2.5">
            {ballot.candidates.map((candidate, index) => {
              const selected = manualSelection.includes(candidate.candidate_id);
              const topMatch = getRelevantIssueMatches(candidate, issueProfile)[0];
              const evidenceLabel = getEvidenceStatusLabel(
                candidate.brief?.evidence_status || "missing",
              );
              return (
                <div
                  key={candidate.candidate_id}
                  className={`animate-fade-in-up stagger-${Math.min(index + 2, 7)} rounded-2xl p-4`}
                  style={{
                    background: "var(--surface)",
                    border: selected
                      ? "2px solid var(--navy)"
                      : "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <CandidatePhoto
                      src={candidate.photo_url}
                      alt={candidate.name_ko}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[15px] font-bold" style={{ color: "var(--navy)" }}>
                          {candidate.name_ko}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            background: `${getPartyColor(candidate.party_name)}18`,
                            color: getPartyColor(candidate.party_name),
                          }}
                        >
                          {candidate.party_name || "무소속"}
                        </span>
                      </div>
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>
                        {candidate.job || "직업 공개 정보 부족"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{
                            background: "var(--surface-alt)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {evidenceLabel}
                        </span>
                        {topMatch && (
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                              background: "var(--amber-bg)",
                              color: "var(--amber)",
                            }}
                          >
                            {getIssueLabel(topMatch.issue_key)} ·{" "}
                            {getIssueMatchLevelLabel(topMatch.level)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      variant={selected ? "primary" : "secondary"}
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleManualCandidate(candidate.candidate_id)}
                      disabled={!selected && manualSelection.length >= 3}
                    >
                      {selected ? "선택됨" : "비교 후보로 담기"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onSelectCandidate(candidate)}
                    >
                      상세
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {optionsByLens[currentLens].map((option, index) => (
              <div
                key={option.id}
                className={`animate-fade-in-up stagger-${Math.min(index + 2, 7)} rounded-2xl px-4 py-4`}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>
                      {option.title}
                    </p>
                    <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {option.description}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-1 text-[10px] font-semibold shrink-0"
                    style={{
                      background: "var(--amber-bg)",
                      color: "var(--amber)",
                    }}
                  >
                    {option.countLabel}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {option.candidateNames.map((name) => (
                    <span
                      key={`${option.id}:${name}`}
                      className="rounded-full px-2 py-1 text-[10px] font-semibold"
                      style={{
                        background: "var(--surface-alt)",
                        color: "var(--navy)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      onStartCompare(option.candidateIds, option.basis, option.title)
                    }
                  >
                    이 그룹으로 비교하기
                  </Button>
                </div>
              </div>
            ))}

            {optionsByLens[currentLens].length === 0 && (
              <div
                className="rounded-2xl px-4 py-5"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--navy)" }}>
                  추천할 후보군을 아직 만들지 못했습니다
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  현재 공개 정보가 부족하거나 선택한 기준과 직접 연결되는 단서가 적습니다. 직접 선택으로 넘어가 후보를 골라 비교해보세요.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setActiveLens("manual")}
                >
                  직접 선택으로 보기
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {currentLens === "manual" && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t px-5 py-3"
          style={{
            background: "rgba(249,248,245,0.96)",
            borderColor: "var(--border)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div className="mx-auto flex w-full max-w-[400px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>
                {manualSelection.length}/3명 선택됨
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                최대 3명까지 골라 깊은 비교와 에이전트 설명을 볼 수 있습니다.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={manualSelection.length === 0}
              onClick={() =>
                onStartCompare(
                  manualSelection,
                  "manual",
                  manualSelection.length === 1
                    ? "직접 고른 후보 1명"
                    : `직접 고른 후보 ${manualSelection.length}명`,
                )
              }
            >
              이 후보들로 비교 시작
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
    >
      <p className="text-[10px] font-semibold mb-1" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
      <p className="text-[15px] font-bold mb-1" style={{ color: "var(--navy)" }}>
        {value}
      </p>
      <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {helper}
      </p>
    </div>
  );
}

function buildCompareScopeOptions(
  ballot: BallotItem,
  issueProfile: UserIssueProfile | null,
): Record<CompareScopeLens, CompareScopeOption[]> {
  const candidateMap = new Map(
    ballot.candidates.map((candidate) => [candidate.candidate_id, candidate]),
  );

  const issueOptions = (issueProfile?.normalized_issue_keys || [])
    .map<CompareScopeOption | null>((issueKey) => {
      const ranked = [...ballot.candidates]
        .map((candidate) => ({
          candidate,
          score: getRelevantIssueMatches(candidate, {
            ...(issueProfile as UserIssueProfile),
            normalized_issue_keys: [issueKey],
          })[0],
        }))
        .filter((entry) => entry.score)
        .sort(
          (left, right) =>
            getIssueMatchPriority(right.score?.level) -
              getIssueMatchPriority(left.score?.level) ||
            getEvidencePriority(right.candidate) - getEvidencePriority(left.candidate),
        )
        .slice(0, 3)
        .map((entry) => entry.candidate);

      if (ranked.length === 0) {
        return null;
      }

      return {
        id: `issue:${issueKey}`,
        basis: "issue" as const,
        title: `${getIssueLabel(issueKey)} 관련 후보`,
        description: `${getIssueLabel(issueKey)} 기준 공개 단서가 확인되는 후보를 먼저 묶었습니다.`,
        candidateIds: ranked.map((candidate) => candidate.candidate_id),
        candidateNames: ranked.map((candidate) => candidate.name_ko),
        countLabel: `${ranked.length}명`,
      } satisfies CompareScopeOption;
    })
    .filter((option) => option !== null) as CompareScopeOption[];

  const evidenceRanked = [...ballot.candidates].sort(
    (left, right) =>
      getEvidencePriority(right) - getEvidencePriority(left) ||
      getIssuePriority(right, issueProfile) - getIssuePriority(left, issueProfile),
  );
  const sparseRanked = [...ballot.candidates].sort(
    (left, right) =>
      (right.compare_entry?.info_gap_flags.length || 0) -
        (left.compare_entry?.info_gap_flags.length || 0) ||
      getEvidencePriority(right) - getEvidencePriority(left),
  );
  const evidenceOptions = [
    {
      id: "evidence:rich",
      basis: "evidence" as const,
      title: "공개 정보가 비교적 충분한 후보",
      description:
        "직업·경력·출처 공개 정도가 상대적으로 높은 후보를 먼저 묶었습니다.",
      candidateIds: evidenceRanked.slice(0, 3).map((candidate) => candidate.candidate_id),
      candidateNames: evidenceRanked.slice(0, 3).map((candidate) => candidate.name_ko),
      countLabel: `${Math.min(ballot.candidates.length, 3)}명`,
    },
    {
      id: "evidence:gaps",
      basis: "evidence" as const,
      title: "정보 부족 후보 먼저 보기",
      description:
        "추가 확인이 필요한 후보를 따로 모아, 빠진 정보가 무엇인지 먼저 확인합니다.",
      candidateIds: sparseRanked
        .filter((candidate) => (candidate.compare_entry?.info_gap_flags.length || 0) > 0)
        .slice(0, 3)
        .map((candidate) => candidate.candidate_id),
      candidateNames: sparseRanked
        .filter((candidate) => (candidate.compare_entry?.info_gap_flags.length || 0) > 0)
        .slice(0, 3)
        .map((candidate) => candidate.name_ko),
      countLabel: `${Math.min(
        sparseRanked.filter(
          (candidate) => (candidate.compare_entry?.info_gap_flags.length || 0) > 0,
        ).length,
        3,
      )}명`,
    },
  ].filter((option) => option.candidateIds.length > 0);

  const partyOptions = Array.from(
    ballot.candidates.reduce((accumulator, candidate) => {
      const key = candidate.party_name || "무소속";
      const current = accumulator.get(key) || [];
      current.push(candidate);
      accumulator.set(key, current);
      return accumulator;
    }, new Map<string, CandidateRecord[]>()),
  )
    .sort((left, right) => right[1].length - left[1].length)
    .map(([party, candidates]) => {
      const selected = [...candidates]
        .sort(
          (left, right) =>
            getIssuePriority(right, issueProfile) - getIssuePriority(left, issueProfile) ||
            getEvidencePriority(right) - getEvidencePriority(left),
        )
        .slice(0, 3);
      return {
        id: `party:${party}`,
        basis: "party" as const,
        title: `${party} 후보`,
        description:
          candidates.length > 3
            ? `${party} 소속 후보 ${candidates.length}명 중 비교에 적합한 3명을 골랐습니다.`
            : `${party} 소속 후보를 한 번에 비교할 수 있습니다.`,
        candidateIds: selected.map((candidate) => candidate.candidate_id),
        candidateNames: selected.map((candidate) => candidate.name_ko),
        countLabel: `${candidates.length}명`,
      } satisfies CompareScopeOption;
    });

  const incumbentCandidates = ballot.candidates.filter(isLikelyIncumbentCandidate);
  const newcomerCandidates = ballot.candidates.filter(
    (candidate) => !isLikelyIncumbentCandidate(candidate),
  );
  const incumbentOptions = ([
    incumbentCandidates.length > 0
      ? {
          id: "incumbent:experienced",
          basis: "incumbent" as const,
          title: "현직·의정 경험 후보",
          description:
            "직업이나 경력에서 의원 활동이 드러나는 후보를 먼저 묶었습니다.",
          candidateIds: incumbentCandidates
            .slice()
            .sort(
              (left, right) =>
                getIssuePriority(right, issueProfile) -
                  getIssuePriority(left, issueProfile) ||
                getEvidencePriority(right) - getEvidencePriority(left),
            )
            .slice(0, 3)
            .map((candidate) => candidate.candidate_id),
          candidateNames: incumbentCandidates
            .slice()
            .sort(
              (left, right) =>
                getIssuePriority(right, issueProfile) -
                  getIssuePriority(left, issueProfile) ||
                getEvidencePriority(right) - getEvidencePriority(left),
            )
            .slice(0, 3)
            .map((candidate) => candidate.name_ko),
          countLabel: `${incumbentCandidates.length}명`,
        }
      : null,
    newcomerCandidates.length > 0
      ? {
          id: "incumbent:newcomer",
          basis: "incumbent" as const,
          title: "비현직 후보",
          description:
            "현직 이력이 드러나지 않는 후보만 따로 묶어 비교합니다.",
          candidateIds: newcomerCandidates
            .slice()
            .sort(
              (left, right) =>
                getIssuePriority(right, issueProfile) -
                  getIssuePriority(left, issueProfile) ||
                getEvidencePriority(right) - getEvidencePriority(left),
            )
            .slice(0, 3)
            .map((candidate) => candidate.candidate_id),
          candidateNames: newcomerCandidates
            .slice()
            .sort(
              (left, right) =>
                getIssuePriority(right, issueProfile) -
                  getIssuePriority(left, issueProfile) ||
                getEvidencePriority(right) - getEvidencePriority(left),
            )
            .slice(0, 3)
            .map((candidate) => candidate.name_ko),
          countLabel: `${newcomerCandidates.length}명`,
        }
      : null,
  ] as Array<CompareScopeOption | null>).filter(
    (option) => option !== null,
  ) as CompareScopeOption[];

  return {
    issue: issueOptions,
    evidence: evidenceOptions.map((option) => ({
      ...option,
      candidateNames: option.candidateIds.map(
        (candidateId) => candidateMap.get(candidateId)?.name_ko || candidateId,
      ),
    })),
    party: partyOptions,
    incumbent: incumbentOptions,
    manual: [],
  };
}

function getEvidencePriority(candidate: CandidateRecord) {
  const status = candidate.brief?.evidence_status || "missing";
  if (status === "enough") return 30;
  if (status === "limited") return 20;
  return 10 - (candidate.compare_entry?.info_gap_flags.length || 0);
}

function getIssuePriority(
  candidate: CandidateRecord,
  issueProfile: UserIssueProfile | null,
) {
  return getCandidateIssueSortScore(candidate, issueProfile);
}

function getIssueMatchPriority(
  level?: "very_high" | "high" | "partial" | "insufficient",
) {
  if (level === "very_high") return 4;
  if (level === "high") return 3;
  if (level === "partial") return 2;
  if (level === "insufficient") return 1;
  return 0;
}

function isLikelyIncumbentCandidate(candidate: CandidateRecord) {
  const text = `${candidate.job || ""} ${candidate.career || ""}`.replace(/\s+/g, " ");
  return /(현직|현\s*(시의원|구의원|군의원|도의원|교육의원|구청장|시장|도지사|교육감)|시의원|구의원|군의원|도의원|교육의원|의회)/.test(
    text,
  );
}
