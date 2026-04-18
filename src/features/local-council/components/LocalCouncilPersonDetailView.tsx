"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type {
  LocalCouncilDataSource,
  LocalCouncilPersonDossierResponse,
} from "@/lib/schemas";
import {
  buildLocalCouncilOverlayViewModel,
  getLocalCouncilDownloadActionLabel,
  getLocalCouncilOfficeExplanation,
  getLocalCouncilOfficeLabel,
  getLocalCouncilSummaryBasisLabels,
  getLocalCouncilSummaryEvidenceDigest,
  getPayloadText,
} from "@/features/local-council/data";
import {
  buildBillActivityCardViewModel,
  buildPersonHeroMeta,
  buildExpandableSectionContentId,
  buildMeetingActivityCardViewModel,
  buildSectionCardViewModel,
  type SectionCardViewModel,
} from "@/features/local-council/detail";
import { formatLocalCouncilDateTimeOrOriginal } from "@/features/local-council/time";
import { getLocalElectionPresetByElectionId } from "@/lib/local-election-config";

interface LocalCouncilPersonDetailViewProps {
  person: LocalCouncilPersonDossierResponse;
  dataSource: LocalCouncilDataSource;
  partyName?: string | null;
  onBack: () => void;
}

function EmptyState() {
  return (
    <p
      className="rounded-lg border p-4 text-sm"
      style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
    >
      공식 근거가 아직 준비되지 않았습니다.
    </p>
  );
}

function ChipGroup({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border px-3 py-1.5 text-[13px]"
          style={{ borderColor: "var(--border)", color: "var(--navy)" }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function DisclosureIndicator({ expanded }: { expanded: boolean }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
      style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
    >
      <ChevronDown
        className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
        aria-hidden="true"
      />
    </span>
  );
}

function getTextValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatCountDisplay(value: string | null) {
  if (!value) {
    return null;
  }

  const digitsOnly = value.replace(/,/g, "");
  if (!/^\d+$/.test(digitsOnly)) {
    return value;
  }

  return Number(digitsOnly).toLocaleString("ko-KR");
}

function formatRateDisplay(value: string | null) {
  if (!value) {
    return null;
  }

  return value.endsWith("%") ? value : `${value}%`;
}

function buildElectionDistrictDisplay(record: Record<string, unknown>) {
  const parts = [
    getPayloadText(record, ["sdName"]),
    getPayloadText(record, ["sggName"]),
    getPayloadText(record, ["district_name", "wiwName"]),
  ].filter((value): value is string => Boolean(value));

  if (parts.length === 0) {
    return null;
  }

  return Array.from(new Set(parts)).join(" ");
}

function hasExpandableContent(item: SectionCardViewModel) {
  return (
    item.detailRows.length > 0 ||
    Boolean(
      item.actions.viewUrl &&
        item.actions.viewLabel &&
        item.actions.viewUrl !== item.sourceUrl,
    ) ||
    Boolean(item.actions.downloadUrl) ||
    Boolean(item.sourceLabel || item.sourceUrl) ||
    item.sourceLinks.length > 0
  );
}

function getInitialExpandedKey(title: string, items: SectionCardViewModel[]) {
  const firstExpandableIndex = items.findIndex(hasExpandableContent);
  if (firstExpandableIndex === -1) {
    return null;
  }

  return `${title}:${firstExpandableIndex}`;
}

function ExpandableRecordList({
  title,
  items,
}: {
  title: string;
  items: SectionCardViewModel[];
}) {
  const initialExpandedKey = getInitialExpandedKey(title, items);
  const [expandedKeyState, setExpandedKey] = useState<string | null | undefined>(undefined);
  const expandedKey =
    expandedKeyState === undefined ? initialExpandedKey : expandedKeyState;

  return (
    <section
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <h2 className="mb-3 text-xl font-bold" style={{ color: "var(--navy)" }}>
        {title}
      </h2>
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3">
          {items.map((item, index) => {
            const recordKey = `${title}:${index}`;
            const contentId = buildExpandableSectionContentId(title, index);
            const expanded = expandedKey === recordKey;
            const hasViewAction = Boolean(
              item.actions.viewUrl &&
                item.actions.viewLabel &&
                item.actions.viewUrl !== item.sourceUrl,
            );
            const hasDownloadAction = Boolean(item.actions.downloadUrl);
            const hasRelatedSourceLinks = item.sourceLinks.length > 0;
            const hasExpandedContent = hasExpandableContent(item);
            const toggleLabel = `${item.headline} 세부 ${expanded ? "닫기" : "열기"}`;
            const headerContent = (
              <div className="min-w-0 flex-1">
                <p className="font-bold" style={{ color: "var(--navy)" }}>
                  {item.headline}
                </p>
                {item.meta ? (
                  <p
                    className="mt-1 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.meta}
                  </p>
                ) : null}
                {item.badges && item.badges.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.badges.map((badge) => (
                      <span
                        key={`${recordKey}:${badge.label}`}
                        className="rounded-full border px-2.5 py-1 text-[12px] font-semibold"
                        style={{
                          borderColor: "var(--border)",
                          color:
                            badge.tone === "accent"
                              ? "var(--amber)"
                              : "var(--text-secondary)",
                          background:
                            badge.tone === "accent"
                              ? "var(--amber-bg)"
                              : "var(--surface-alt)",
                        }}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                ) : null}
                {item.summaryLine ? (
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--foreground)" }}>
                    {item.summaryLine}
                  </p>
                ) : null}
              </div>
            );

            return (
              <div
                key={recordKey}
                className="rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              >
                {hasExpandedContent ? (
                  <button
                    type="button"
                    onClick={() => setExpandedKey(expanded ? null : recordKey)}
                    aria-label={toggleLabel}
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    className="flex w-full items-start justify-between gap-3 p-3 text-left"
                  >
                    {headerContent}
                    <DisclosureIndicator expanded={expanded} />
                  </button>
                ) : (
                  <div className="p-3">{headerContent}</div>
                )}
                {expanded && hasExpandedContent ? (
                  <div
                    id={contentId}
                    className="border-t px-3 pb-3 pt-3"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {item.detailRows.length > 0 ? (
                      <div className="grid gap-2">
                        {item.detailRows.map((row) => (
                          <div
                            key={`${recordKey}:${row.label}`}
                            className="grid grid-cols-[104px_minmax(0,1fr)] gap-2 text-sm"
                          >
                            <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
                            <span style={{ color: "var(--foreground)" }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {item.sourceLabel ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.sourceUrl ? (
                          <a
                            href={item.sourceUrl}
                            className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
                            style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                          >
                            출처 · {item.sourceLabel}
                          </a>
                        ) : (
                          <span
                            className="rounded-full border px-3 py-1.5 text-[13px]"
                            style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                          >
                            출처 · {item.sourceLabel}
                          </span>
                        )}
                      </div>
                    ) : item.sourceUrl ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={item.sourceUrl}
                          className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
                          style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                        >
                          출처
                        </a>
                      </div>
                    ) : null}
                    {hasViewAction ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={item.actions.viewUrl ?? undefined}
                          className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
                          style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                        >
                          {item.actions.viewLabel}
                        </a>
                      </div>
                    ) : null}
                    {hasRelatedSourceLinks ? (
                      <div className="mt-3">
                        <p
                          className="text-[13px] font-semibold"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          관련 출처
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.sourceLinks.map((link) => (
                            <a
                              key={`${recordKey}:${link.label}:${link.url}`}
                              href={link.url}
                              className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
                              style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                            >
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {hasDownloadAction ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.actions.downloadUrl ? (
                          <a
                            href={item.actions.downloadUrl}
                            className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
                            style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                          >
                            {getLocalCouncilDownloadActionLabel(item.actions.downloadLabel)}
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function buildElectedBasisDisplayRecord(
  record: Record<string, unknown>,
  officeType: string,
) {
  const electionId =
    typeof record.election_id === "string" && record.election_id.trim()
      ? record.election_id.trim()
      : null;
  const matchedPreset = electionId ? getLocalElectionPresetByElectionId(electionId) : null;
  const preset = matchedPreset && matchedPreset.electionId === electionId ? matchedPreset : null;
  const officeLabel = getLocalCouncilOfficeLabel(officeType);
  const officeElectionLabel =
    officeType === "basic_council"
      ? "기초의원선거"
      : officeType === "metro_council"
        ? "광역의원선거"
        : officeType === "basic_head"
          ? "기초자치단체장선거"
          : `${officeLabel} 선거`;
  const huboid =
    typeof record.huboid === "string" && record.huboid.trim() ? record.huboid.trim() : null;

  const title = preset
    ? `${preset.electionName} 당선 기록`
    : `${officeLabel} 당선 기록`;

  const metaParts: string[] = [];
  if (preset) {
    metaParts.push(
      `선거일 ${formatLocalCouncilDateTimeOrOriginal(preset.electionDay) ?? preset.electionDay}`,
    );
  }
  metaParts.push(`${officeElectionLabel} 기준`);
  if (huboid) {
    metaParts.push(`중앙선거관리위원회 후보 식별자 ${huboid}`);
  }
  const districtName = getPayloadText(record, ["district_name"]);
  if (districtName) {
    metaParts.push(`선거구 ${districtName}`);
  }
  const electedAt = getPayloadText(record, ["elected_at"]);
  if (electedAt) {
    metaParts.push(
      `당선 ${formatLocalCouncilDateTimeOrOriginal(electedAt) ?? electedAt}`,
    );
  }

  const candidateNumber = getPayloadText(record, ["candidate_number", "giho"]);
  const voteCount = formatCountDisplay(getPayloadText(record, ["vote_count", "dugsu"]));
  const voteRate = formatRateDisplay(getPayloadText(record, ["vote_rate", "dugyul"]));
  const partyName = getPayloadText(record, ["party_name", "jdName"]);
  const electionDistrict = buildElectionDistrictDisplay(record);

  return {
    ...record,
    headline: title,
    summary: metaParts.join(" · "),
    candidate_number_display: candidateNumber,
    vote_count_display: voteCount,
    vote_rate_display: voteRate,
    party_name_display: partyName,
    election_district_display: electionDistrict,
  };
}

function hasOfficialProfileDisplayText(record: Record<string, unknown>) {
  return Boolean(getPayloadText(record, ["headline", "section_title"]));
}

function PersonHeroAvatar({
  imageUrl,
  name,
}: {
  imageUrl?: string;
  name: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasProfileImage = Boolean(imageUrl) && !imageFailed;

  return (
    <div
      className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg text-2xl font-bold"
      style={{
        background: "var(--amber-bg)",
        color: "var(--amber)",
        border: "1px solid var(--border)",
      }}
    >
      <span aria-hidden="true">{name.slice(0, 1) || "?"}</span>
      {hasProfileImage && imageUrl ? (
        <>
          {/* Backend-provided image URLs are arbitrary; keep plain img local instead of Next Image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`${name} 프로필`}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        </>
      ) : null}
    </div>
  );
}

function SupplementalOverlaySection({
  person,
}: {
  person: LocalCouncilPersonDossierResponse;
}) {
  const overlay = buildLocalCouncilOverlayViewModel(person.overlay);
  const [expandedKeyState, setExpandedKey] = useState<string | null | undefined>(
    undefined,
  );
  const expandedKey =
    expandedKeyState === undefined
      ? (overlay.hasContent ? "overlay" : null)
      : expandedKeyState;
  const expanded = expandedKey === "overlay";
  const canExpand = overlay.hasContent;
  if (!canExpand) {
    return null;
  }

  return (
    <section
      className="mt-6 rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <button
        type="button"
        onClick={() => setExpandedKey(expanded ? null : "overlay")}
        aria-label={`보강 정보 ${expanded ? "닫기" : "열기"}`}
        aria-expanded={expanded}
        aria-controls="local-council-overlay-content"
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold" style={{ color: "var(--navy)" }}>
            보강 정보
          </h2>
        </div>
        <DisclosureIndicator expanded={expanded} />
      </button>

      {expanded ? (
        <div id="local-council-overlay-content" className="mt-4 grid gap-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          {overlay.sections.map((section) => (
            <div
              key={`${section.channel}:${section.title}`}
              className="rounded-lg border p-4"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold" style={{ color: "var(--navy)" }}>
                  {section.title}
                </p>
                <span
                  className="rounded-full border px-2.5 py-1 text-[12px] font-semibold"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  {section.channelLabel}
                </span>
              </div>
              {section.summary ? (
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {section.summary}
                </p>
              ) : null}
              <div className="mt-4 grid gap-3">
                {section.items.map((item) => (
                  <div
                    key={`${section.channel}:${item.title}:${item.sourceName}`}
                    className="rounded-lg border p-3"
                    style={{ borderColor: "var(--border)", background: "var(--background)" }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold" style={{ color: "var(--navy)" }}>
                        {item.title}
                      </p>
                      {item.confidenceLabel ? (
                        null
                      ) : null}
                    </div>
                    {item.snippet ? (
                      <p className="mt-2 text-sm" style={{ color: "var(--foreground)" }}>
                        {item.snippet}
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-2 text-sm">
                      <p style={{ color: "var(--text-secondary)" }}>출처 · {item.sourceName}</p>
                    </div>
                    {item.sourceUrl ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={item.sourceUrl}
                          className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
                          style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                        >
                          원문 보기
                        </a>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function LocalCouncilPersonDetailView({
  person,
  dataSource,
  partyName,
  onBack,
}: LocalCouncilPersonDetailViewProps) {
  void dataSource;
  const hero = buildPersonHeroMeta(person);
  const heroPartyName = hero.partyName ?? partyName ?? null;
  const officeExplanation = getLocalCouncilOfficeExplanation(person.office_type);
  const summaryEvidenceDigest = getLocalCouncilSummaryEvidenceDigest(person.summary);
  const summaryBasisLabels = getLocalCouncilSummaryBasisLabels(person.summary.summary_basis);
  const personRenderKey = [
    person.person_name,
    person.office_type,
    person.summary.headline,
  ].join(":");
  const officialProfileSections = person.official_profile["official_profile_sections"];
  const profileSections = Array.isArray(officialProfileSections)
    ? officialProfileSections.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          hasOfficialProfileDisplayText(item),
      )
    : [];
  const hasOfficialProfileTopLevelDisplayData = hasOfficialProfileDisplayText(person.official_profile);
  const profileRecords =
    profileSections.length > 0
      ? profileSections
      : hasOfficialProfileTopLevelDisplayData
        ? [person.official_profile]
        : [];
  const electedBasisRecords =
    Object.keys(person.elected_basis).length > 0
      ? [buildElectedBasisDisplayRecord(person.elected_basis, person.office_type)]
      : [];
  const profileItems = profileRecords.map((item) =>
    buildSectionCardViewModel({
      item,
      titleKeys: ["headline", "section_title", "office_label"],
      metaKeys: ["section_title"],
      detailFields: [],
      preferredSourceKinds: [],
      preferredSourceRoles: ["official_profile", "profile"],
      sectionSourceRefs: person.source_refs,
    }),
  );
  const electedBasisItems = electedBasisRecords.map((item) =>
    buildSectionCardViewModel({
      item,
      titleKeys: ["headline", "basis_label", "summary", "title", "office_label"],
      metaKeys: ["summary", "meta", "basis_label"],
      detailFields: [
        { label: "기호", keys: ["candidate_number_display", "candidate_number", "giho"] },
        { label: "정당", keys: ["party_name_display", "party_name", "jdName"] },
        { label: "선거구", keys: ["election_district_display", "district_name", "wiwName"] },
        { label: "득표수", keys: ["vote_count_display", "vote_count", "dugsu"] },
        { label: "득표율", keys: ["vote_rate_display", "vote_rate", "dugyul"] },
      ],
      preferredSourceKinds: [],
      preferredSourceRoles: ["elected_basis"],
      sectionSourceRefs: person.source_refs,
    }),
  );
  const committeeItems = person.committees.map((item) =>
    buildSectionCardViewModel({
      item,
      titleKeys: ["committee_name", "name"],
      metaKeys: ["role", "term"],
      detailFields: [
        { label: "역할", keys: ["role"] },
        { label: "임기", keys: ["term"] },
      ],
      preferredSourceKinds: [],
      preferredSourceRoles: ["profile", "official_profile"],
      sectionSourceRefs: person.source_refs,
    }),
  );
  const officialActivityTitle = person.office_type === "basic_head" ? "공식 활동" : "의안";
  const officialActivityItems = person.bills.map((item) =>
    buildBillActivityCardViewModel({
      item,
      sectionSourceRefs: person.source_refs,
    }),
  );
  const meetingItems = person.meeting_activity.map((item) =>
    buildMeetingActivityCardViewModel({
      item,
      sectionSourceRefs: person.source_refs,
    }),
  );
  const financeItems = person.finance_activity.map((item) =>
    buildSectionCardViewModel({
      item: {
        ...item,
        date_display: formatLocalCouncilDateTimeOrOriginal(
          getTextValue(item.date),
        ),
        activity_date_display: formatLocalCouncilDateTimeOrOriginal(
          getTextValue(item.activity_date),
        ),
      },
      titleKeys: ["title", "name"],
      metaKeys: ["amount", "date_display", "activity_date_display"],
      detailFields: [
        { label: "금액", keys: ["amount"] },
        {
          label: "기준일",
          keys: ["date_display", "activity_date_display", "date", "activity_date"],
        },
      ],
      preferredSourceKinds: ["local_finance_365"],
      preferredSourceRoles: ["finance_activity"],
      sectionSourceRefs: person.source_refs,
    }),
  );

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 rounded-lg border px-3 py-2 text-sm font-semibold"
        style={{ borderColor: "var(--border)", color: "var(--navy)" }}
      >
        명단으로 돌아가기
      </button>

      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex gap-4">
          <PersonHeroAvatar imageUrl={hero.imageUrl} name={hero.name} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold" style={{ color: "var(--navy)" }}>
              {hero.name}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {hero.officeLabel}
              {heroPartyName ? ` · ${heroPartyName}` : ""}
            </p>
            {officeExplanation ? (
              <p
                className="mt-2 text-sm leading-6"
                style={{ color: "var(--text-secondary)" }}
              >
                {officeExplanation}
              </p>
            ) : null}
            {hero.summaryLine ? (
              <p className="mt-2 text-sm" style={{ color: "var(--foreground)" }}>
                {hero.summaryLine}
              </p>
            ) : null}
            {hero.educationItems.length > 0 ? (
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                학력 · {hero.educationItems.join(" · ")}
              </p>
            ) : null}
            {hero.careerItems.length > 0 ? (
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                주요 약력 · {hero.careerItems.join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
        {hero.links?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {hero.links.map((link) => (
              <a
                key={`${link.label}:${link.url}`}
                href={link.url}
                className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
                style={{ borderColor: "var(--border)", color: "var(--navy)" }}
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className="mt-5 rounded-lg border p-5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <h1 className="mt-4 text-3xl font-bold" style={{ color: "var(--navy)" }}>
          {person.person_name}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          {getLocalCouncilOfficeLabel(person.office_type)}
          {partyName ? ` · ${partyName}` : ""}
        </p>
        <h2 className="mt-6 text-xl font-bold" style={{ color: "var(--navy)" }}>
          {person.summary.headline}
        </h2>
        <p className="mt-3 text-[15px] leading-7" style={{ color: "var(--foreground)" }}>
          {person.summary.grounded_summary}
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <section
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h2 className="text-xl font-bold" style={{ color: "var(--navy)" }}>
            근거 요약
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            확인된 공식 근거를 바탕으로 핵심 활동과 출처를 정리했습니다.
          </p>
          {summaryEvidenceDigest.length > 0 ? (
            <ChipGroup items={summaryEvidenceDigest} />
          ) : (
            <EmptyState />
          )}
          {summaryBasisLabels.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                요약 근거 출처
              </p>
              <ChipGroup items={summaryBasisLabels} />
            </div>
          ) : null}
        </section>
      </div>

      <div className="mt-6 grid gap-4">
        <ExpandableRecordList
          key={`${personRenderKey}:official-profile`}
          title="공식 프로필"
          items={profileItems}
        />
        <ExpandableRecordList
          key={`${personRenderKey}:elected-basis`}
          title="당선 근거"
          items={electedBasisItems}
        />
        <ExpandableRecordList
          key={`${personRenderKey}:committees`}
          title="위원회"
          items={committeeItems}
        />
        <ExpandableRecordList
          key={`${personRenderKey}:official-activity`}
          title={officialActivityTitle}
          items={officialActivityItems}
        />
        <ExpandableRecordList
          key={`${personRenderKey}:meetings`}
          title="회의"
          items={meetingItems}
        />
        <ExpandableRecordList
          key={`${personRenderKey}:finance`}
          title="재정 활동"
          items={financeItems}
        />
      </div>

      <SupplementalOverlaySection
        key={`${personRenderKey}:overlay`}
        person={person}
      />
    </section>
  );
}
