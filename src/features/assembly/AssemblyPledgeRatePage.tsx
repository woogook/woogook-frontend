"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FileText, User } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getAssembly22CampaignBookletPublicPdfUrl } from "@/features/assembly/assemblyCampaignBookletUrl";
import { assemblyPledgeContextParams } from "@/features/assembly/assemblyPledgeQuery";
import { AssemblyBreadcrumb } from "@/features/assembly/components/AssemblyBreadcrumb";
import { AssemblyAppShell } from "@/features/assembly/components/AssemblyAppShell";
import { PLEDGE_PROGRESS_BAR_SEGMENT_BACKGROUND } from "@/features/assembly/components/PledgeProgressBadge";
import { ASSEMBLY_PLEDGE_CATEGORY_LABELS } from "@/features/assembly/pledgeCategories";
import {
  assemblyMemberMetaCardQueryOptions,
  assemblyPledgeSummaryQueryOptions,
} from "@/lib/api-client";
import type {
  AssemblyPledgeCategoryFulfillment,
  AssemblyPledgeProgressBreakdown,
} from "@/lib/schemas";

/** mona_cd 없을 때 스케치용 플레이스홀더 (이행률 데모은 그대로). */
const DEMO_NAME = "배현진";
const DEMO_TERMS = "제 21·22대 국회의원";
const DEMO_AFFILIATION = "국민의힘 · 서울 송파구 을";

function formatPartyDistrictLine(
  party: string | null | undefined,
  district: string | null | undefined,
): string | null {
  const parts = [party?.trim() || "", district?.trim() || ""].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatRegionBreadcrumbLabel(
  city: string | null,
  sigungu: string | null,
): string | null {
  const shortCity = city?.replace("특별시", "").replace("광역시", "").trim();
  const parts = [shortCity || "", sigungu?.trim() || ""].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export function isRequestedAssemblyMember(
  responseMonaCd: string | null | undefined,
  requestedMonaCd: string,
): boolean {
  const normalizedRequestedMonaCd = requestedMonaCd.trim();
  return (
    normalizedRequestedMonaCd.length > 0 &&
    responseMonaCd?.trim() === normalizedRequestedMonaCd
  );
}

type ProgressSegment = {
  label: string;
  count: number;
  color: string;
};

const EMPTY_PROGRESS_BREAKDOWN: AssemblyPledgeProgressBreakdown = {
  completed_count: 0,
  in_progress_count: 0,
  not_started_count: 0,
  unknown_count: 0,
};

export function buildProgressSegments(
  breakdown: AssemblyPledgeProgressBreakdown,
): ProgressSegment[] {
  return [
    {
      label: "완료단계",
      count: breakdown.completed_count,
      color: PLEDGE_PROGRESS_BAR_SEGMENT_BACKGROUND["완료단계"],
    },
    {
      label: "진행중",
      count: breakdown.in_progress_count,
      color: PLEDGE_PROGRESS_BAR_SEGMENT_BACKGROUND["진행중"],
    },
    {
      label: "미착수",
      count: breakdown.not_started_count,
      color: PLEDGE_PROGRESS_BAR_SEGMENT_BACKGROUND["미착수"],
    },
    {
      label: "판단불가",
      count: breakdown.unknown_count,
      color: PLEDGE_PROGRESS_BAR_SEGMENT_BACKGROUND["판단불가"],
    },
  ];
}

function PledgeProgressStackedBar({
  breakdown,
  total,
}: {
  breakdown: AssemblyPledgeProgressBreakdown;
  total: number;
}) {
  const segments = buildProgressSegments(breakdown);
  const resolvedTotal =
    total > 0 ? total : segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <div className="mt-4 text-left">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full border"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
        aria-label={segments.map((segment) => `${segment.label} ${segment.count}건`).join(", ")}
        role="img"
      >
        {resolvedTotal > 0
          ? segments.map((segment) => {
              const widthPercent = (segment.count / resolvedTotal) * 100;
              return (
                <span
                  key={segment.label}
                  className="h-full"
                  style={{
                    width: `${widthPercent}%`,
                    minWidth: segment.count > 0 ? 3 : 0,
                    background: segment.color,
                  }}
                  title={`${segment.label}: ${segment.count}건`}
                />
              );
            })
          : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: segment.color }}
              aria-hidden
            />
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {segment.label}
            </span>
            <span
              className="ml-auto tabular-nums text-[11px] font-semibold"
              style={{ color: "var(--navy)" }}
            >
              {segment.count}건
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** key로 리마운트하면 로드 실패 상태가 초기화되어 effect 없이 안전하게 쓸 수 있음. */
function AssemblyProfileAvatar({ imageUrl }: { imageUrl: string | null }) {
  const [loadFailed, setLoadFailed] = useState(false);
  if (!imageUrl || loadFailed) {
    return <User className="h-9 w-9" strokeWidth={1.5} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 외부 프로필 URL, 도메인 가변
    <img
      src={imageUrl}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setLoadFailed(true)}
    />
  );
}

/**
 * 공약 이행률 상세(프로필 + 전체 요약 + 카테고리별 표) — 모바일 우선.
 * mona_cd 가 있으면 GET …/members/{mona_cd}/card 로 프로필·공보 URL을 채움.
 */
export function AssemblyPledgeRatePage() {
  const searchParams = useSearchParams();
  const city = searchParams.get("city");
  const sigungu = searchParams.get("sigungu");
  const monaCdRaw = searchParams.get("mona_cd");
  const monaCdTrimmed = (monaCdRaw ?? "").trim();
  const useApiProfile = monaCdTrimmed.length > 0;

  const {
    data: memberCard,
    isPending,
    isFetching,
    isError,
    error,
  } = useQuery(assemblyMemberMetaCardQueryOptions(monaCdTrimmed));
  const {
    data: pledgeSummary,
    isPending: isSummaryPending,
    isFetching: isSummaryFetching,
    isError: isSummaryError,
    error: summaryError,
  } = useQuery(assemblyPledgeSummaryQueryOptions(monaCdTrimmed));

  const memberCardForDisplay =
    useApiProfile &&
    isRequestedAssemblyMember(memberCard?.member_mona_cd, monaCdTrimmed)
      ? memberCard
      : null;
  const isMemberCardMismatch =
    useApiProfile && Boolean(memberCard) && !memberCardForDisplay;
  const isMemberCardLoading =
    useApiProfile && (isPending || (isMemberCardMismatch && isFetching));

  const pledgeSummaryForDisplay =
    useApiProfile &&
    isRequestedAssemblyMember(
      pledgeSummary?.member.member_mona_cd,
      monaCdTrimmed,
    )
      ? pledgeSummary
      : null;
  const isPledgeSummaryMismatch =
    useApiProfile && Boolean(pledgeSummary) && !pledgeSummaryForDisplay;
  const isPledgeSummaryUnavailable =
    isSummaryError || (isPledgeSummaryMismatch && !isSummaryFetching);

  const overallRateLabel =
    pledgeSummaryForDisplay?.fulfillment.overall_rate_display ??
    (useApiProfile && isSummaryPending ? "불러오는 중" : "판단불가");
  const categoryRates: AssemblyPledgeCategoryFulfillment[] =
    pledgeSummaryForDisplay?.fulfillment.categories ??
    ASSEMBLY_PLEDGE_CATEGORY_LABELS.map((label) => ({
      category_label: label,
      rate_percent: null,
      rate_display: useApiProfile && isSummaryPending ? "..." : "판단불가",
      total_promises: 0,
      evaluated_promises: 0,
      unknown_promises: 0,
    }));
  const progressBreakdown =
    pledgeSummaryForDisplay?.fulfillment.progress_breakdown ??
    EMPTY_PROGRESS_BREAKDOWN;
  const progressTotal =
    pledgeSummaryForDisplay?.fulfillment.total_promises ?? 0;

  const selectionNote =
    city && sigungu
      ? monaCdTrimmed
        ? `선택: ${city} ${sigungu}`
        : `선택 지역: ${city} ${sigungu}`
      : null;

  const contextParams = assemblyPledgeContextParams(city, sigungu, monaCdRaw);
  const regionParams = assemblyPledgeContextParams(city, sigungu, null);
  const regionLabel = formatRegionBreadcrumbLabel(city, sigungu);

  const envBookletUrl = getAssembly22CampaignBookletPublicPdfUrl();
  /** 로딩/에러 시 env 공보 URL은 쓰지 않음(의원 불일치 방지). mona_cd 없을 때만 env 사용. */
  let campaignBookletPdfUrl = "";
  if (!useApiProfile) {
    campaignBookletPdfUrl = envBookletUrl;
  } else if (!isPending && !isError && memberCardForDisplay) {
    campaignBookletPdfUrl =
      memberCardForDisplay.campaign_booklet_pdf_url?.trim() ||
      envBookletUrl ||
      "";
  }

  const displayName = useApiProfile
    ? memberCardForDisplay?.name ?? "국회의원"
    : DEMO_NAME;
  const displayTerms =
    useApiProfile && memberCardForDisplay
      ? memberCardForDisplay.election_count_text?.trim() || null
      : DEMO_TERMS;
  const displayAffiliation =
    useApiProfile && memberCardForDisplay
      ? formatPartyDistrictLine(
          memberCardForDisplay.party_name,
          memberCardForDisplay.district_label,
        )
      : DEMO_AFFILIATION;
  const displayCommittee =
    useApiProfile && memberCardForDisplay
      ? memberCardForDisplay.current_committee_name?.trim() || null
      : null;

  const profileImageUrl =
    useApiProfile && memberCardForDisplay?.profile_image_url?.trim()
      ? memberCardForDisplay.profile_image_url.trim()
      : null;

  const campaignBookletButtonClass =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold leading-none shadow-sm transition-[opacity,filter] hover:brightness-[0.97] active:opacity-85";

  const campaignBookletButtonStyle: CSSProperties = {
    background: "#dbeafe",
    color: "var(--navy)",
    border: "1px solid rgba(37, 99, 235, 0.22)",
  };

  const breadcrumbItems = [
    ...(regionLabel
      ? [
          {
            label: regionLabel,
            href:
              regionParams.toString().length > 0
                ? `/assembly?${regionParams.toString()}`
                : "/assembly",
          },
        ]
      : []),
    { label: displayName },
  ];

  return (
    <AssemblyAppShell
      backHref="/assembly"
      backLabel="지역·의원 선택"
      backTrailing={
        <AssemblyBreadcrumb
          items={breadcrumbItems}
          className="mb-0 max-w-full overflow-x-auto px-0 -mx-0"
        />
      }
    >
      <main className="mx-auto w-full max-w-[480px] px-5 py-6">
        <section
          className="mb-8 flex items-center gap-3 border-b pb-8"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl"
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              color: "var(--text-tertiary)",
            }}
            aria-hidden
          >
            {isMemberCardLoading ? (
              <div
                className="h-full w-full animate-pulse"
                style={{ background: "var(--border)" }}
              />
            ) : (
              <AssemblyProfileAvatar
                key={`${monaCdTrimmed}-${profileImageUrl ?? ""}`}
                imageUrl={profileImageUrl}
              />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            {isMemberCardLoading ? (
              <div className="space-y-2">
                <div
                  className="h-7 w-32 max-w-full animate-pulse rounded-md"
                  style={{ background: "var(--border)" }}
                />
                <div
                  className="h-4 w-48 max-w-full animate-pulse rounded-md"
                  style={{ background: "var(--border)" }}
                />
                <div
                  className="h-3.5 w-40 max-w-full animate-pulse rounded-md"
                  style={{ background: "var(--border)" }}
                />
              </div>
            ) : useApiProfile && (isError || isMemberCardMismatch) ? (
              <p className="text-[13px] leading-snug" style={{ color: "var(--foreground)" }}>
                의원 정보를 불러오지 못했습니다.
                {error && "message" in error && typeof error.message === "string"
                  ? ` (${error.message})`
                  : null}
              </p>
            ) : (
              <>
                <p
                  className="text-[1.35rem] font-bold leading-tight tracking-tight"
                  style={{
                    color: "var(--navy)",
                    fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif",
                  }}
                >
                  {displayName}
                </p>
                {displayTerms ? (
                  <p
                    className="mt-1 text-[13px] leading-snug"
                    style={{ color: "var(--foreground)" }}
                  >
                    {displayTerms}
                  </p>
                ) : null}
                {displayAffiliation ? (
                  <p
                    className="mt-0.5 text-[12px] leading-snug"
                    style={{ color: "var(--foreground)" }}
                  >
                    {displayAffiliation}
                  </p>
                ) : null}
                {displayCommittee ? (
                  <p
                    className="mt-0.5 text-[12px] leading-snug"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {displayCommittee}
                  </p>
                ) : null}
                {selectionNote ? (
                  <p
                    className="mt-2 text-[11px] leading-snug"
                    style={{ color: "var(--foreground)" }}
                  >
                    {selectionNote}
                  </p>
                ) : null}
              </>
            )}
          </div>
          {useApiProfile && isPending ? (
            <div
              className={`${campaignBookletButtonClass} opacity-50`}
              style={campaignBookletButtonStyle}
              aria-hidden
            >
              <FileText className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
              선거공보
            </div>
          ) : campaignBookletPdfUrl ? (
            <a
              href={campaignBookletPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={campaignBookletButtonClass}
              style={campaignBookletButtonStyle}
              aria-label={`${displayName} 의원 선거공보 PDF 열기`}
            >
              <FileText className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
              선거공보 (PDF)
            </a>
          ) : (
            <button
              type="button"
              className={campaignBookletButtonClass}
              style={campaignBookletButtonStyle}
              aria-label={`${displayName} 의원 선거공보 PDF — 미등록 시 안내`}
              onClick={() => {
                window.alert("등록된 선거공보 PDF가 없습니다.");
              }}
            >
              <FileText className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
              선거공보 (PDF)
            </button>
          )}
        </section>

        <section className="mb-6 text-center">
          <p
            className="text-[1.35rem] font-bold leading-snug sm:text-[1.5rem]"
            style={{
              color: "var(--navy)",
              fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif",
            }}
          >
            전체 공약 평균 이행도 {overallRateLabel}
          </p>
          {isPledgeSummaryUnavailable ? (
            <p className="mt-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              평가 결과를 불러오지 못했습니다.
              {summaryError && "message" in summaryError && typeof summaryError.message === "string"
                ? ` (${summaryError.message})`
                : null}
            </p>
          ) : pledgeSummaryForDisplay ? (
            <>
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                전체 {pledgeSummaryForDisplay.fulfillment.total_promises}건 · 평가{" "}
                {pledgeSummaryForDisplay.fulfillment.evaluated_promises}건 기준 평균입니다.
                {pledgeSummaryForDisplay.fulfillment.unknown_promises > 0 ? (
                  <>
                    {" "}
                    <br />
                    미평가(판단불가 등) {pledgeSummaryForDisplay.fulfillment.unknown_promises}건은 평균에 포함하지
                    않습니다.
                  </>
                ) : null}
              </p>
              <PledgeProgressStackedBar
                breakdown={progressBreakdown}
                total={progressTotal}
              />
            </>
          ) : (
            <p className="mt-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              공약 평가 결과를 불러오고 있습니다.
            </p>
          )}
        </section>

        <section
          className="rounded-[28px] border p-5 sm:p-6"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <h2
            className="mb-2 border-b pb-2 text-center text-[17px] font-bold sm:text-[18px]"
            style={{
              borderColor: "var(--border)",
              color: "var(--navy)",
              fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif",
            }}
          >
            카테고리별 이행도
          </h2>

          <ul>
            {categoryRates.map((row, index) => {
              const categoryHrefParams = new URLSearchParams(contextParams.toString());
              categoryHrefParams.set("category", row.category_label);
              const categoryHref = `/assembly/pledge/category?${categoryHrefParams.toString()}`;
              return (
                <li
                  key={row.category_label}
                  style={
                    index > 0 ? { borderTop: "1px solid var(--border)" } : undefined
                  }
                >
                  <Link
                    href={categoryHref}
                    className="-mx-1 flex min-h-[56px] items-center justify-between gap-3 rounded-xl px-1 py-2.5 active:opacity-65"
                    style={{ color: "inherit" }}
                    aria-label={`${row.category_label} 평가된 공약 기준 평균 이행도 및 상위 공약 보기`}
                  >
                    <span
                      className="min-w-0 flex-1 pr-2 text-[15px] font-medium leading-snug sm:text-[16px]"
                      style={{ color: "var(--foreground)" }}
                    >
                      {row.category_label}
                      {row.total_promises > 0 ? (
                        <span
                          className="ml-1 text-[11px] font-normal"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {row.evaluated_promises}/{row.total_promises}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className="tabular-nums text-[16px] font-bold sm:text-[17px]"
                        style={{ color: "var(--navy)" }}
                      >
                        {row.rate_display}
                      </span>
                      <ChevronRight
                        className="h-5 w-5 shrink-0"
                        style={{ color: "var(--text-tertiary)" }}
                        aria-hidden
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </AssemblyAppShell>
  );
}
