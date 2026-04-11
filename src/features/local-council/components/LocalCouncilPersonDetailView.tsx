"use client";

import type {
  LocalCouncilDataSource,
  LocalCouncilPersonDossierResponse,
} from "@/lib/schemas";
import {
  getLocalCouncilDataSourceLabel,
  getLocalCouncilFreshnessLabel,
  getLocalCouncilOfficeLabel,
  getLocalCouncilSourceLabel,
  getLocalCouncilSummaryModeLabel,
  getPayloadText,
} from "@/features/local-council/data";
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

function RecordList({
  title,
  records,
  titleKeys,
  metaKeys,
}: {
  title: string;
  records: Record<string, unknown>[];
  titleKeys: string[];
  metaKeys: string[];
}) {
  return (
    <section
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <h2 className="mb-3 text-xl font-bold" style={{ color: "var(--navy)" }}>
        {title}
      </h2>
      {records.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3">
          {records.map((record, index) => (
            <div
              key={`${title}:${index}`}
              className="rounded-lg border p-3"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="font-bold" style={{ color: "var(--navy)" }}>
                {getPayloadText(record, titleKeys) || "제목 확인 필요"}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {getPayloadText(record, metaKeys) || "세부 정보 확인 필요"}
              </p>
            </div>
          ))}
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

export default function LocalCouncilPersonDetailView({
  person,
  dataSource,
  partyName,
  onBack,
}: LocalCouncilPersonDetailViewProps) {
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
        className="rounded-lg border p-5"
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
        <RecordList
          title="공식 프로필"
          records={profileRecords}
          titleKeys={["headline", "section_title", "office_label"]}
          metaKeys={["section_title", "office_label"]}
        />
        <RecordList
          title="당선 근거"
          records={electedBasisRecords}
          titleKeys={["headline", "basis_label", "summary", "title", "office_label"]}
          metaKeys={["summary", "meta", "basis_label"]}
        />
        <RecordList
          title="위원회"
          records={person.committees}
          titleKeys={["committee_name", "name"]}
          metaKeys={["role", "term"]}
        />
        <RecordList
          title={person.office_type === "basic_head" ? "공식 활동" : "의안"}
          records={person.bills}
          titleKeys={["bill_title", "bill_name", "title"]}
          metaKeys={["proposed_at", "bill_date", "source_kind"]}
        />
        <RecordList
          title="회의"
          records={person.meeting_activity}
          titleKeys={["session_label", "meeting_name", "title"]}
          metaKeys={["meeting_date", "date"]}
        />
        <RecordList
          title="재정 활동"
          records={person.finance_activity}
          titleKeys={["title", "name"]}
          metaKeys={["amount", "date"]}
        />
        <section
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h2 className="mb-3 text-xl font-bold" style={{ color: "var(--navy)" }}>
            출처
          </h2>
          {person.source_refs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-wrap gap-2">
              {person.source_refs.map((source, index) => {
                const sourceKind =
                  typeof source.source_kind === "string" ? source.source_kind : "unknown";
                return (
                  <span
                    key={`${sourceKind}:${index}`}
                    className="rounded-full border px-3 py-1.5 text-[13px]"
                    style={{ borderColor: "var(--border)", color: "var(--navy)" }}
                  >
                    {getLocalCouncilSourceLabel(sourceKind)}
                  </span>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
