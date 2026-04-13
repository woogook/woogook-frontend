"use client";

import { useState } from "react";
import type {
  LocalCouncilDataSource,
  LocalCouncilPersonDossierResponse,
} from "@/lib/schemas";
import {
  buildLocalCouncilDiagnosticsViewModel,
  getLocalCouncilDataSourceLabel,
  getLocalCouncilFreshnessDetailRows,
  getLocalCouncilFreshnessLabel,
  getLocalCouncilOfficeExplanation,
  getLocalCouncilOfficeLabel,
  getLocalCouncilSummaryModeLabel,
  getLocalCouncilSummaryBasisLabels,
  getLocalCouncilSummaryEvidenceDigest,
  getLocalCouncilSummaryFallbackReason,
  getPayloadText,
  type LocalCouncilLabelValue,
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

function ValueRows({ rows }: { rows: LocalCouncilLabelValue[] }) {
  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[104px_minmax(0,1fr)] gap-2 text-sm"
        >
          <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
          <span style={{ color: "var(--foreground)" }}>{row.value}</span>
        </div>
      ))}
    </div>
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
            const hasRelatedSourceLinks = item.sourceLinks.length > 0;
            const hasExpandedContent =
              item.detailRows.length > 0 ||
              hasDownloadAction ||
              hasSourceBadge ||
              hasSourceLabel ||
              hasRelatedSourceLinks;
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
                            rel="noopener noreferrer"
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
                          rel="noopener noreferrer"
                          className="rounded-full border px-3 py-1.5 text-[13px] font-semibold"
                          style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                        >
                          출처
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
                              target="_blank"
                              rel="noopener noreferrer"
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
                            target="_blank"
                            rel="noopener noreferrer"
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
  const officeExplanation = getLocalCouncilOfficeExplanation(person.office_type);
  const summaryEvidenceDigest = getLocalCouncilSummaryEvidenceDigest(person.summary);
  const summaryBasisLabels = getLocalCouncilSummaryBasisLabels(person.summary.summary_basis);
  const summaryFallbackReason = getLocalCouncilSummaryFallbackReason(person.summary);
  const freshnessRows = getLocalCouncilFreshnessDetailRows(person.freshness);
  const diagnosticsSource =
    person.spot_check && !person.diagnostics?.spot_check
      ? { ...(person.diagnostics ?? {}), spot_check: person.spot_check }
      : person.diagnostics;
  const diagnostics = buildLocalCouncilDiagnosticsViewModel(diagnosticsSource);
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
                target="_blank"
                rel="noopener noreferrer"
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h2 className="text-xl font-bold" style={{ color: "var(--navy)" }}>
            근거 요약
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            summary.evidence_digest와 summary.summary_basis.source_kinds를 그대로 풀어 보여줍니다.
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
          {summaryFallbackReason ? (
            <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              요약 보강 이유 · {summaryFallbackReason}
            </p>
          ) : null}
        </section>

        <section
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h2 className="text-xl font-bold" style={{ color: "var(--navy)" }}>
            발행·진단
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {getLocalCouncilFreshnessLabel(person.freshness)}
          </p>
          {freshnessRows.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                신선도 설명
              </p>
              <div className="mt-2">
                <ValueRows rows={freshnessRows} />
              </div>
            </div>
          ) : null}
          {diagnostics.statusRows.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                진단 상태
              </p>
              <div className="mt-2">
                <ValueRows rows={diagnostics.statusRows} />
              </div>
            </div>
          ) : null}
          {diagnostics.dataGapFlags.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                data_gap_flags
              </p>
              <ChipGroup items={diagnostics.dataGapFlags} />
            </div>
          ) : null}
          {diagnostics.needsHumanReview.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                needs_human_review
              </p>
              <ChipGroup items={diagnostics.needsHumanReview} />
            </div>
          ) : null}
        </section>
      </div>

      {diagnostics.spotCheckRows.length > 0 ? (
        <section
          className="mt-4 rounded-lg border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h2 className="text-xl font-bold" style={{ color: "var(--navy)" }}>
            {diagnostics.spotCheckTitle || "spot-check"}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            명단 검증용 1인 spot-check에서 읽어온 메타데이터입니다.
          </p>
          <div className="mt-4">
            <ValueRows rows={diagnostics.spotCheckRows} />
          </div>
        </section>
      ) : null}

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
