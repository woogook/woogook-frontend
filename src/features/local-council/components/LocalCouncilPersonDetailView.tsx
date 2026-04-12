"use client";

import { useState } from "react";
import type {
  LocalCouncilDataSource,
  LocalCouncilPersonDossierResponse,
} from "@/lib/schemas";
import {
  getLocalCouncilDataSourceLabel,
  getLocalCouncilFreshnessLabel,
  getLocalCouncilOfficeLabel,
  getLocalCouncilSummaryModeLabel,
  getPayloadText,
} from "@/features/local-council/data";
import {
  buildPersonHeroMeta,
  buildExpandableSectionContentId,
  buildSectionCardViewModel,
  type SectionCardViewModel,
} from "@/features/local-council/detail";
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

function ExpandableRecordList({
  title,
  items,
}: {
  title: string;
  items: SectionCardViewModel[];
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

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
            const hasSourceBadge = Boolean(item.sourceLabel || item.sourceUrl);
            const hasDownloadAction = Boolean(item.actions.downloadUrl);
            const hasSourceLabel = Boolean(item.sourceLabel);
            const hasExpandedContent =
              item.detailRows.length > 0 || hasDownloadAction || hasSourceBadge || hasSourceLabel;
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
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    className="flex w-full items-start justify-between gap-3 p-3 text-left"
                  >
                    {headerContent}
                    <span
                      className="shrink-0 text-sm font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {expanded ? "닫기" : "열기"}
                    </span>
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
                            target="_blank"
                            rel="noreferrer"
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
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
                          style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                        >
                          출처
                        </a>
                      </div>
                    ) : null}
                    {hasDownloadAction ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.actions.downloadUrl ? (
                          <a
                            href={item.actions.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
                            style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                          >
                            원문 다운로드
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
    metaParts.push(`선거일 ${preset.electionDay}`);
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
    metaParts.push(`당선 ${electedAt}`);
  }

  return {
    headline: title,
    summary: metaParts.join(" · "),
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

export default function LocalCouncilPersonDetailView({
  person,
  dataSource,
  partyName,
  onBack,
}: LocalCouncilPersonDetailViewProps) {
  const hero = buildPersonHeroMeta(person);
  const heroPartyName = hero.partyName ?? partyName ?? null;
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
      detailFields: [],
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
    buildSectionCardViewModel({
      item,
      titleKeys: ["bill_title", "bill_name", "title"],
      metaKeys: ["proposed_at", "bill_date", "source_kind"],
      detailFields: [{ label: "제안일", keys: ["proposed_at", "bill_date"] }],
      preferredSourceKinds: [],
      preferredSourceRoles: ["official_activity"],
      sectionSourceRefs: person.source_refs,
    }),
  );
  const meetingItems = person.meeting_activity.map((item) =>
    buildSectionCardViewModel({
      item,
      titleKeys: ["session_label", "meeting_name", "title"],
      metaKeys: ["meeting_date", "date"],
      detailFields: [
        { label: "회의명", keys: ["meeting_name", "title"] },
        { label: "회의일", keys: ["meeting_date", "date"] },
      ],
      preferredSourceKinds: [],
      preferredSourceRoles: ["official_activity"],
      sectionSourceRefs: person.source_refs,
    }),
  );
  const financeItems = person.finance_activity.map((item) =>
    buildSectionCardViewModel({
      item,
      titleKeys: ["title", "name"],
      metaKeys: ["amount", "date", "activity_date"],
      detailFields: [
        { label: "금액", keys: ["amount"] },
        { label: "기준일", keys: ["date", "activity_date"] },
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
                target="_blank"
                rel="noreferrer"
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
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border px-2.5 py-1 text-[12px] font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--amber)" }}
          >
            {getLocalCouncilDataSourceLabel(dataSource)}
          </span>
          <span
            className="rounded-full border px-2.5 py-1 text-[12px] font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--navy)" }}
          >
            {getLocalCouncilSummaryModeLabel(person.summary.summary_mode)}
          </span>
        </div>
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
        <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          {getLocalCouncilFreshnessLabel(person.freshness)}
        </p>
      </div>

      {dataSource === "local_sample" && (
        <p
          className="mt-5 rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--amber-bg)", color: "var(--navy)" }}
        >
          이 상세 정보는 frontend 로컬 작업을 위한 샘플 데이터입니다.
        </p>
      )}

      <div className="mt-6 grid gap-4">
        <ExpandableRecordList title="공식 프로필" items={profileItems} />
        <ExpandableRecordList title="당선 근거" items={electedBasisItems} />
        <ExpandableRecordList title="위원회" items={committeeItems} />
        <ExpandableRecordList title={officialActivityTitle} items={officialActivityItems} />
        <ExpandableRecordList title="회의" items={meetingItems} />
        <ExpandableRecordList title="재정 활동" items={financeItems} />
      </div>
    </section>
  );
}
