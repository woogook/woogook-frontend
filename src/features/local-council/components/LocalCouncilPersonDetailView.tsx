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

interface LocalCouncilPersonDetailViewProps {
  person: LocalCouncilPersonDossierResponse;
  dataSource: LocalCouncilDataSource;
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

export default function LocalCouncilPersonDetailView({
  person,
  dataSource,
  onBack,
}: LocalCouncilPersonDetailViewProps) {
  const profileSections = Array.isArray(person.official_profile.official_profile_sections)
    ? person.official_profile.official_profile_sections.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
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
          records={profileSections}
          titleKeys={["headline", "section_title", "office_label"]}
          metaKeys={["section_title", "office_label"]}
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
