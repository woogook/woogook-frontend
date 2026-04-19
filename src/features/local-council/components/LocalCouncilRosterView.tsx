"use client";

import { useState } from "react";
import type {
  LocalCouncilDataSource,
  LocalCouncilRosterScreenData,
  LocalCouncilRosterPerson,
} from "@/lib/schemas";
import {
  getLocalCouncilDataSourceLabel,
  getLocalCouncilFreshnessLabel,
  getLocalCouncilOfficeLabel,
  getRosterPersonInitial,
  isLocalCouncilRosterPerson,
} from "@/features/local-council/data";

interface LocalCouncilRosterViewProps {
  rosterData: LocalCouncilRosterScreenData;
  dataSource: LocalCouncilDataSource;
  onSelectPerson: (person: LocalCouncilRosterPerson) => void;
  onBack: () => void;
}

function SectionHeading({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="text-xl font-bold" style={{ color: "var(--navy)" }}>
        {title}
      </h2>
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px]"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        <strong style={{ color: "var(--navy)" }}>{count}</strong>
        명
      </span>
    </div>
  );
}

function PersonCard({
  person,
  onSelect,
}: {
  person: LocalCouncilRosterPerson;
  onSelect: (person: LocalCouncilRosterPerson) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasProfileImage = Boolean(person.profile_image_url) && !imageFailed;
  const profileImageUrl = person.profile_image_url || "";

  return (
    <button
      type="button"
      onClick={() => onSelect(person)}
      className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 text-left active:opacity-70"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg text-sm font-bold"
        style={{
          background: "var(--amber-bg)",
          color: "var(--amber)",
          border: "1px solid var(--border)",
        }}
      >
        <span aria-hidden="true">{getRosterPersonInitial(person)}</span>
        {hasProfileImage && (
          <>
            {/* Backend-provided image URLs are arbitrary; keep plain img local instead of Next Image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profileImageUrl}
              alt={person.person_name}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          </>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[16px] font-bold" style={{ color: "var(--navy)" }}>
          {person.person_name}
        </p>
        <p className="mt-1 truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>
          {getLocalCouncilOfficeLabel(person.office_type)}
          {person.party_name ? ` · ${person.party_name}` : ""}
        </p>
      </div>
      <span
        className="rounded-full border px-2.5 py-1 text-[12px] font-semibold"
        style={{ borderColor: "var(--border)", color: "var(--navy)" }}
      >
        상세
      </span>
    </button>
  );
}

export default function LocalCouncilRosterView({
  rosterData,
  dataSource,
  onSelectPerson,
  onBack,
}: LocalCouncilRosterViewProps) {
  const districtHead = isLocalCouncilRosterPerson(rosterData.roster.district_head)
    ? rosterData.roster.district_head
    : null;
  const members = rosterData.roster.council_members;

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 rounded-lg border px-3 py-2 text-sm font-semibold"
        style={{ borderColor: "var(--border)", color: "var(--navy)" }}
      >
        지역 다시 선택
      </button>

      <div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--amber)" }}>
            {getLocalCouncilDataSourceLabel(dataSource)}
          </p>
          <h1 className="mt-2 text-3xl font-bold" style={{ color: "var(--navy)" }}>
            {rosterData.district.district_name || "서울특별시 강동구"}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            {getLocalCouncilFreshnessLabel(rosterData.roster.freshness)}
          </p>
        </div>
      </div>

      {dataSource === "local_sample" && (
        <p
          className="mt-5 rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--border)",
            background: "var(--amber-bg)",
            color: "var(--navy)",
          }}
        >
          이 명단은 개발·로컬 미리보기용 강동구 샘플 데이터입니다.
        </p>
      )}

      <div className="mt-8 grid gap-6">
        <section>
          <SectionHeading title="구청장" count={districtHead ? 1 : 0} />
          {districtHead ? (
            <PersonCard
              key={districtHead.person_key}
              person={districtHead}
              onSelect={onSelectPerson}
            />
          ) : (
            <p
              className="rounded-lg border p-4 text-sm"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              구청장 정보가 아직 준비되지 않았습니다.
            </p>
          )}
        </section>

        <section>
          <SectionHeading title="구의원" count={members.length} />
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((member) => (
              <PersonCard key={member.person_key} person={member} onSelect={onSelectPerson} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
