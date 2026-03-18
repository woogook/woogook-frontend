"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BallotItem,
  ISSUE_DEFINITIONS,
  UserIssueProfile,
  buildNormalizedIssueKeys,
  getAuthorityHint,
  getContestTitle,
  getIssueLabel,
  getOfficeRoleDescription,
} from "../data";

interface Props {
  ballot: BallotItem;
  initialProfile: UserIssueProfile;
  onSubmit: (profile: UserIssueProfile) => void;
  onBack: () => void;
}

export default function IssueStep({
  ballot,
  initialProfile,
  onSubmit,
  onBack,
}: Props) {
  const [selectedIssues, setSelectedIssues] = useState(
    initialProfile.selected_issue_keys,
  );
  const [customKeywords, setCustomKeywords] = useState(
    initialProfile.custom_keywords,
  );
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    setSelectedIssues(initialProfile.selected_issue_keys);
    setCustomKeywords(initialProfile.custom_keywords);
  }, [initialProfile]);

  const normalizedIssueKeys = useMemo(
    () => buildNormalizedIssueKeys(selectedIssues, customKeywords),
    [selectedIssues, customKeywords],
  );

  const authorityHints = normalizedIssueKeys.map((issueKey) => ({
    issueKey,
    message: getAuthorityHint(ballot.office_level, issueKey),
  }));

  const handleToggleIssue = (issueKey: UserIssueProfile["selected_issue_keys"][number]) => {
    setSelectedIssues((current) =>
      current.includes(issueKey)
        ? current.filter((value) => value !== issueKey)
        : [...current, issueKey],
    );
  };

  const handleAddKeyword = () => {
    const nextKeyword = keywordInput.trim();
    if (!nextKeyword) return;
    if (!customKeywords.includes(nextKeyword)) {
      setCustomKeywords((current) => [...current, nextKeyword]);
    }
    setKeywordInput("");
  };

  const handleRemoveKeyword = (keyword: string) => {
    setCustomKeywords((current) => current.filter((value) => value !== keyword));
  };

  const handleSubmit = () => {
    const pendingKeyword = keywordInput.trim();
    const nextCustomKeywords =
      pendingKeyword && !customKeywords.includes(pendingKeyword)
        ? [...customKeywords, pendingKeyword]
        : customKeywords;
    onSubmit({
      election_id: initialProfile.election_id,
      contest_id: initialProfile.contest_id,
      selected_issue_keys: selectedIssues,
      custom_keywords: nextCustomKeywords,
      normalized_issue_keys: buildNormalizedIssueKeys(
        selectedIssues,
        nextCustomKeywords,
      ),
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <section className="px-5 pt-4 pb-8">
      <div className="w-full max-w-[400px] mx-auto">
        <button
          onClick={onBack}
          className="animate-fade-in-up inline-flex items-center gap-1 text-[13px] mb-4 cursor-pointer active:opacity-60"
          style={{ color: "var(--text-secondary)" }}
          aria-label="선출직 목록으로 돌아가기"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          선출직 목록
        </button>

        <div className="animate-fade-in-up stagger-1 mb-5">
          <h2 className="text-[1.375rem] font-bold tracking-tight mb-1" style={{ color: "var(--navy)" }}>
            무엇이 가장 중요한가요?
          </h2>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {getContestTitle(ballot)}를 비교할 때 우선해서 볼 기준을 골라주세요.
            추천이 아니라 비교 순서를 정하는 단계입니다.
          </p>
        </div>

        <div
          className="animate-fade-in-up stagger-2 rounded px-4 py-3 mb-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--navy)" }}>
            이 선출직의 기본 역할
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {getOfficeRoleDescription(ballot.office_level)}
          </p>
        </div>

        <div className="animate-fade-in-up stagger-3 mb-4">
          <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--navy)" }}>
            관심 이슈 선택
          </p>
          <div className="flex flex-wrap gap-2">
            {ISSUE_DEFINITIONS.map((issue) => {
              const selected = selectedIssues.includes(issue.key);
              return (
                <button
                  key={issue.key}
                  type="button"
                  onClick={() => handleToggleIssue(issue.key)}
                  className="px-3 py-2 rounded-full text-[12px] font-medium cursor-pointer transition-all"
                  style={{
                    background: selected ? "var(--amber)" : "var(--surface)",
                    color: selected ? "#ffffff" : "var(--text-secondary)",
                    border: selected ? "1px solid var(--amber)" : "1px solid var(--border)",
                  }}
                >
                  {issue.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="animate-fade-in-up stagger-4 rounded px-4 py-4 mb-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--navy)" }}>
            자유 키워드 추가
          </p>
          <div className="flex gap-2">
            <input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddKeyword();
                }
              }}
              placeholder="예: 재개발, 주차, 학군"
              className="flex-1 h-[42px] px-3 rounded text-[13px] outline-none"
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="px-4 rounded text-[12px] font-semibold cursor-pointer"
              style={{ background: "var(--navy)", color: "#ffffff" }}
            >
              추가
            </button>
          </div>
          {customKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {customKeywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => handleRemoveKeyword(keyword)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer"
                  style={{
                    background: "var(--amber-bg)",
                    color: "var(--amber)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {keyword} ×
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className="animate-fade-in-up stagger-5 rounded px-4 py-4 mb-5"
          style={{ background: "var(--surface-alt)", borderLeft: "3px solid var(--border-dark)" }}
        >
          <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--navy)" }}>
            현재 해석된 비교 기준
          </p>
          {normalizedIssueKeys.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {normalizedIssueKeys.map((issueKey) => (
                  <span
                    key={issueKey}
                    className="px-2 py-1 rounded text-[11px] font-semibold"
                    style={{ background: "var(--surface)", color: "var(--navy)", border: "1px solid var(--border)" }}
                  >
                    {getIssueLabel(issueKey)}
                  </span>
                ))}
              </div>
              <div className="space-y-1.5">
                {authorityHints.map((hint) => (
                  <p key={hint.issueKey} className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--navy)" }}>{getIssueLabel(hint.issueKey)}</strong>
                    {" · "}
                    {hint.message}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              이슈를 고르지 않으면 기본 후보 정보 순서로 먼저 보여드립니다.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              onSubmit({
                ...initialProfile,
                selected_issue_keys: [],
                custom_keywords: [],
                normalized_issue_keys: [],
                updated_at: new Date().toISOString(),
              })
            }
            className="flex-1 h-[46px] rounded text-[13px] font-semibold cursor-pointer"
            style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            이슈 없이 보기
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 h-[46px] rounded text-[13px] font-semibold cursor-pointer"
            style={{ background: "var(--navy)", color: "#ffffff" }}
          >
            후보 보러가기
          </button>
        </div>
      </div>
    </section>
  );
}
