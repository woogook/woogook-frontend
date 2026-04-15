"use client";

import { useState } from "react";
import type {
  LocalCouncilDataSource,
  LocalCouncilPersonDossierResponse,
} from "@/lib/schemas";
import {
  buildLocalCouncilSourceContractSummaryViewModel,
  buildLocalCouncilDiagnosticsViewModel,
  getLocalCouncilExplainabilityLines,
  buildLocalCouncilOverlayViewModel,
  getLocalCouncilDataGapFlagLabel,
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
  buildBillActivityCardViewModel,
  buildPersonHeroMeta,
  buildExpandableSectionContentId,
  buildMeetingActivityCardViewModel,
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

function getTextValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getRecordValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getEvidenceValue(record: Record<string, unknown>) {
  const count = record.count;
  const countLabel =
    typeof count === "number" && Number.isFinite(count)
      ? `${Math.max(0, Math.floor(count))}건`
      : null;
  const status = getTextValue(record.status);
  const confidence = getTextValue(record.confidence);
  const severity = getTextValue(record.severity);

  return [countLabel, status, confidence, severity]
    .filter((item): item is string => Boolean(item))
    .join(" · ");
}

function buildEvidenceRows(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => getRecordValue(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((record) => {
      const label =
        getTextValue(record.label) ??
        getTextValue(record.kind) ??
        "근거";
      const valueText = getEvidenceValue(record);
      if (!valueText) {
        return null;
      }
      return {
        label,
        value: valueText,
        explanation: getTextValue(record.explanation),
      };
    })
    .filter(
      (
        row,
      ): row is { label: string; value: string; explanation: string | null } =>
        Boolean(row),
    );
}

function buildFreshnessLineageRows(freshness: Record<string, unknown>) {
  const rows: LocalCouncilLabelValue[] = [];
  const stalenessBucket = getTextValue(freshness.staleness_bucket);
  if (stalenessBucket) {
    rows.push({
      label: "staleness_bucket",
      value: stalenessBucket,
    });
  }

  const lineage = freshness.lineage;
  if (!Array.isArray(lineage)) {
    return rows;
  }

  return rows.concat(
    lineage
      .map((item, index) => {
      const record = getRecordValue(item);
      if (!record) {
        return null;
      }
      const label =
        getTextValue(record.label) ??
        getTextValue(record.kind) ??
        `계보 ${index + 1}`;
      const timestamp = getTextValue(record.timestamp);
      const sourceMode = getTextValue(record.source_mode);
      const value = [timestamp, sourceMode]
        .filter((part): part is string => Boolean(part))
        .join(" · ");
      if (!value) {
        return null;
      }
      return {
        label,
        value,
      };
      })
      .filter((row): row is LocalCouncilLabelValue => Boolean(row)),
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
            const hasViewAction = Boolean(item.actions.viewUrl && item.actions.viewLabel);
            const hasSourceBadge = Boolean(item.sourceLabel || item.sourceUrl);
            const hasDownloadAction = Boolean(item.actions.downloadUrl);
            const hasSourceLabel = Boolean(item.sourceLabel);
            const hasRelatedSourceLinks = item.sourceLinks.length > 0;
            const hasExpandedContent =
              item.detailRows.length > 0 ||
              hasViewAction ||
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
                    {hasViewAction ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={item.actions.viewUrl ?? undefined}
                          target="_blank"
                          rel="noopener noreferrer"
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
                            {item.actions.downloadLabel ?? "원문 다운로드"}
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

function SupplementalOverlaySection({
  person,
}: {
  person: LocalCouncilPersonDossierResponse;
}) {
  const overlay = buildLocalCouncilOverlayViewModel(person.overlay);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const expanded = expandedKey === "overlay";
  const canExpand = overlay.hasContent;
  const metaRows: LocalCouncilLabelValue[] = [];

  if (overlay.generatedAt) {
    metaRows.push({ label: "생성 시각", value: overlay.generatedAt });
  }
  if (overlay.targetMemberId) {
    metaRows.push({ label: "대상", value: overlay.targetMemberId });
  }

  return (
    <section
      className="mt-6 rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold" style={{ color: "var(--navy)" }}>
              보강 정보
            </h2>
            <span
              className="rounded-full border px-2.5 py-1 text-[12px] font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--navy)" }}
            >
              {overlay.statusLabel}
            </span>
            <span
              className="rounded-full border px-2.5 py-1 text-[12px] font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--amber)" }}
            >
              {overlay.supportTierLabel}
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            보강 정보는 공식 결정적 결과가 아니라 별도 표식이 있는 supplemental surface입니다.
          </p>
          <p className="mt-3 text-sm" style={{ color: "var(--foreground)" }}>
            {overlay.summaryLine}
          </p>
        </div>
        {canExpand ? (
          <button
            type="button"
            onClick={() => setExpandedKey(expanded ? null : "overlay")}
            aria-expanded={expanded}
            aria-controls="local-council-overlay-content"
            className="rounded-lg border px-3 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--navy)" }}
          >
            {expanded ? "닫기" : "열기"}
          </button>
        ) : null}
      </div>

      {overlay.allowedSourceLabels.length > 0 ? (
        <div className="mt-4">
          <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
            허용 소스
          </p>
          <ChipGroup items={overlay.allowedSourceLabels} />
        </div>
      ) : null}

      {metaRows.length > 0 ? (
        <div className="mt-4">
          <ValueRows rows={metaRows} />
        </div>
      ) : null}

      {!canExpand && overlay.disclaimers.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {overlay.disclaimers.map((line) => (
            <p key={line} className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {line}
            </p>
          ))}
        </div>
      ) : null}

      {expanded ? (
        <div id="local-council-overlay-content" className="mt-4 grid gap-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          {overlay.disclaimers.length > 0 ? (
            <div className="grid gap-2">
              {overlay.disclaimers.map((line) => (
                <p key={line} className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {line}
                </p>
              ))}
            </div>
          ) : null}

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
                        <span
                          className="rounded-full border px-2.5 py-1 text-[12px]"
                          style={{ borderColor: "var(--border)", color: "var(--amber)" }}
                        >
                          {item.confidenceLabel}
                        </span>
                      ) : null}
                      <span
                        className="rounded-full border px-2.5 py-1 text-[12px]"
                        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                      >
                        {item.supportTierLabel}
                      </span>
                    </div>
                    {item.snippet ? (
                      <p className="mt-2 text-sm" style={{ color: "var(--foreground)" }}>
                        {item.snippet}
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-2 text-sm">
                      <p style={{ color: "var(--text-secondary)" }}>출처 · {item.sourceName}</p>
                      {item.publishedAt ? (
                        <p style={{ color: "var(--text-secondary)" }}>
                          수집/발행 시각 · {item.publishedAt}
                        </p>
                      ) : null}
                      {item.provenanceSummary ? (
                        <p style={{ color: "var(--text-secondary)" }}>
                          추적 값 · {item.provenanceSummary}
                        </p>
                      ) : null}
                    </div>
                    {item.sourceUrl ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
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
  const summaryExplanationLines = getLocalCouncilExplainabilityLines([
    person.summary.explanation_lines,
  ]);
  const diagnosticsExplanationLines = getLocalCouncilExplainabilityLines([
    diagnostics.explanationLines,
  ]);
  const freshnessNarrativeLines = getLocalCouncilExplainabilityLines([
    person.freshness.explanation_lines,
    getTextValue(person.freshness.explanation)
      ? [getTextValue(person.freshness.explanation)]
      : [],
  ]);
  const sourceContractSummary = buildLocalCouncilSourceContractSummaryViewModel([
    person.summary.source_contract_summary,
    person.diagnostics?.source_contract_summary,
    person.source_contract_summary,
  ]);
  const evidenceRows = buildEvidenceRows(person.evidence ?? []);
  const freshnessLineageRows = buildFreshnessLineageRows(person.freshness);
  const hasExplainabilitySection =
    summaryExplanationLines.length > 0 ||
    evidenceRows.length > 0 ||
    diagnostics.qualitySignalRows.length > 0 ||
    Boolean(sourceContractSummary) ||
    diagnosticsExplanationLines.length > 0 ||
    freshnessLineageRows.length > 0 ||
    freshnessNarrativeLines.length > 0;
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
              <ChipGroup items={diagnostics.dataGapFlags.map(getLocalCouncilDataGapFlagLabel)} />
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

      {hasExplainabilitySection ? (
        <section
          className="mt-4 rounded-lg border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h2 className="text-xl font-bold" style={{ color: "var(--navy)" }}>
            설명 가능한 진단
          </h2>
          {summaryExplanationLines.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                요약 설명
              </p>
              <ul className="mt-2 grid gap-2">
                {summaryExplanationLines.map((line) => (
                  <li
                    key={`summary:${line}`}
                    className="text-sm leading-6"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {evidenceRows.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                근거 현황
              </p>
              <div className="mt-2 grid gap-2">
                {evidenceRows.map((row, index) => (
                  <div
                    key={`${row.label}:${index}`}
                    className="rounded-lg border px-3 py-3"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2 text-sm">
                      <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
                      <span style={{ color: "var(--foreground)" }}>{row.value}</span>
                    </div>
                    {row.explanation ? (
                      <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                        {row.explanation}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {diagnostics.qualitySignalRows.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                품질 신호
              </p>
              <div className="mt-2">
                <ValueRows rows={diagnostics.qualitySignalRows} />
              </div>
            </div>
          ) : null}
          {sourceContractSummary ? (
            <div className="mt-4">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                출처 계약 점검
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--foreground)" }}>
                점검 이슈 {sourceContractSummary.issueCount}건
              </p>
              {sourceContractSummary.status ? (
                <div className="mt-2">
                  <ValueRows
                    rows={[
                      {
                        label: "출처 계약 상태",
                        value: sourceContractSummary.status,
                      },
                    ]}
                  />
                </div>
              ) : null}
              {sourceContractSummary.issueRows.length > 0 ? (
                <ul className="mt-2 grid gap-1">
                  {sourceContractSummary.issueRows.map((row) => (
                    <li
                      key={row}
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {row}
                    </li>
                  ))}
                </ul>
              ) : null}
              {sourceContractSummary.explanationLines.length > 0 ? (
                <ul className="mt-2 grid gap-1">
                  {sourceContractSummary.explanationLines.map((line) => (
                    <li
                      key={`source-contract:${line}`}
                      className="text-sm leading-6"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {diagnosticsExplanationLines.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                진단 설명
              </p>
              <ul className="mt-2 grid gap-2">
                {diagnosticsExplanationLines.map((line) => (
                  <li
                    key={`diagnostics:${line}`}
                    className="text-sm leading-6"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {freshnessLineageRows.length > 0 || freshnessNarrativeLines.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                신선도 계보
              </p>
              {freshnessLineageRows.length > 0 ? (
                <div className="mt-2">
                  <ValueRows rows={freshnessLineageRows} />
                </div>
              ) : null}
              {freshnessNarrativeLines.length > 0 ? (
                <ul className="mt-2 grid gap-2">
                  {freshnessNarrativeLines.map((line) => (
                    <li
                      key={`freshness:${line}`}
                      className="text-sm leading-6"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

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

      <SupplementalOverlaySection person={person} />
    </section>
  );
}
