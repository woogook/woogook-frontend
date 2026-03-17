import { NextResponse } from "next/server";
import type {
  AmbiguousBallot,
  BallotItem,
  BallotResponse,
  CandidateRecord,
} from "@/app/data";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ContestRow = {
  contest_id: string;
  election_code: string;
  election_id: string;
  election_name: string;
  ballot_subject_type: "candidate_person" | "party_list";
  office_level: string;
  representation_type: "single" | "district" | "proportional";
  special_region_type: string;
  geographic_scope: string;
  city_code: number;
  city_name_canonical: string;
  sigungu_name: string | null;
  display_name: string;
  parent_area_name: string | null;
  seats: number | null;
};

type CandidateRow = {
  candidate_id: string;
  contest_id: string;
  election_id: string;
  election_code: string;
  election_name: string;
  city_code: number;
  city_name: string;
  town_code: string | null;
  town_name: string | null;
  district_name_raw: string;
  name_ko: string;
  party_name: string | null;
  photo_url: string | null;
  detail_url: string | null;
  source_kind: string | null;
  source_file: string | null;
  payload: Record<string, unknown> | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const sigungu = searchParams.get("sigungu")?.trim();
  const emd = searchParams.get("emd")?.trim() || null;

  if (!city || !sigungu) {
    return NextResponse.json(
      { error: "city and sigungu are required" },
      { status: 400 },
    );
  }

  try {
    const contests = await fetchContests(city, sigungu, emd);

    if (contests.length === 0) {
      return NextResponse.json<BallotResponse>({
        city_name_canonical: city,
        sigungu_name: sigungu,
        emd_name: emd,
        resolution_status: "ambiguous",
        ballot_count: 0,
        ballots: [],
        ambiguous_ballots: [],
      });
    }

    const contestIds = contests.map((c) => c.contest_id);
    const candidateMap = await fetchCandidatesByContest(contestIds);

    const groupedByElection = groupContestsByElection(contests);
    const ballots: BallotItem[] = [];
    const ambiguousBallots: AmbiguousBallot[] = [];

    for (const [, group] of groupedByElection) {
      if (group.length === 1) {
        const contest = group[0];
        ballots.push({
          ...contest,
          candidates: candidateMap.get(contest.contest_id) || [],
        });
      } else {
        const { election_code, election_name } = group[0];
        ambiguousBallots.push({
          election_code,
          election_name,
          options: group.map((contest) => ({
            contest_id: contest.contest_id,
            display_name: contest.display_name,
            parent_area_name: contest.parent_area_name,
          })),
        });
      }
    }

    const resolutionStatus: BallotResponse["resolution_status"] =
      ambiguousBallots.length > 0
        ? ballots.length > 0
          ? "partially_ambiguous"
          : "ambiguous"
        : "resolved";

    return NextResponse.json<BallotResponse>({
      city_name_canonical: city,
      sigungu_name: sigungu,
      emd_name: emd,
      resolution_status: resolutionStatus,
      ballot_count: ballots.length,
      ballots,
      ambiguous_ballots: ambiguousBallots,
    });
  } catch (error) {
    console.error("[ballots] error", error);
    return NextResponse.json(
      { error: "Failed to load ballots" },
      { status: 500 },
    );
  }
}

async function fetchContests(city: string, sigungu: string, emd: string | null) {
  const result = await pool.query<ContestRow>(
    `
      select
        c.contest_id,
        c.election_code,
        c.election_id,
        c.election_name,
        c.ballot_subject_type,
        c.office_level,
        c.representation_type,
        c.special_region_type,
        c.geographic_scope,
        c.city_code,
        c.city_name_canonical,
        c.sigungu_name,
        c.display_name,
        c.parent_area_name,
        c.seats
      from local_election_contest c
      where c.city_name_canonical = $1
        and (c.sigungu_name is null or c.sigungu_name = $2)
        and (
          $3::text is null
          or c.geographic_scope in ('city_province', 'sigungu')
          or exists (
            select 1
            from local_election_contest_emd e
            where e.contest_id = c.contest_id
              and e.emd_name = $3::text
          )
        )
      order by c.election_code, c.display_name;
    `,
    [city, sigungu, emd],
  );

  return result.rows;
}

async function fetchCandidatesByContest(contestIds: string[]) {
  const map = new Map<string, CandidateRecord[]>();

  if (contestIds.length === 0) return map;

  const result = await pool.query<CandidateRow>(
    `
      select
        candidate_id,
        contest_id,
        election_id,
        election_code,
        election_name,
        city_code,
        city_name,
        town_code,
        town_name,
        district_name_raw,
        name_ko,
        party_name,
        photo_url,
        detail_url,
        source_kind,
        source_file,
        payload
      from local_election_candidate
      where contest_id = any($1::text[])
      order by election_code, name_ko;
    `,
    [contestIds],
  );

  for (const row of result.rows) {
    const payload = (row.payload || {}) as Record<string, unknown>;
    const record: CandidateRecord = {
      candidate_id: row.candidate_id,
      contest_id: row.contest_id,
      election_id: row.election_id,
      election_code: row.election_code,
      election_name: row.election_name,
      city_code: row.city_code,
      city_name: row.city_name,
      town_code: row.town_code,
      town_name: row.town_name,
      district_name_raw: row.district_name_raw,
      name_ko: row.name_ko,
      name_hanja: (payload.name_hanja as string | null) ?? null,
      party_name: row.party_name ?? (payload.party_name as string | null) ?? null,
      gender: (payload.gender as string) || "",
      birthdate_text: (payload.birthdate_text as string | null) ?? null,
      age_text: (payload.age_text as string | null) ?? null,
      address: (payload.address as string) || "",
      job: (payload.job as string) || "",
      education: (payload.education as string) || "",
      career: (payload.career as string) || "",
      registration_date: (payload.registration_date as string) || "",
      crime_text: (payload.crime_text as string) || "",
      crime_parse_status: (payload.crime_parse_status as string) || "",
      crime_case_count:
        (payload.crime_case_count as number | null | undefined) ?? null,
      crime_items: (payload.crime_items as unknown[]) || [],
      photo_url: (payload.photo_url as string) || row.photo_url || "",
      detail_url: (payload.detail_url as string) || row.detail_url || "",
      source_scope_key: (payload.source_scope_key as string) || "",
      source_scope_label: (payload.source_scope_label as string) || "",
      source_kind: row.source_kind || (payload.source_kind as string) || "",
      source_file: row.source_file || (payload.source_file as string) || "",
    };

    const list = map.get(row.contest_id) || [];
    list.push(record);
    map.set(row.contest_id, list);
  }

  return map;
}

function groupContestsByElection(contests: ContestRow[]) {
  const grouped = new Map<string, ContestRow[]>();

  for (const contest of contests) {
    const list = grouped.get(contest.election_code) || [];
    list.push(contest);
    grouped.set(contest.election_code, list);
  }

  return grouped;
}
