import { NextResponse } from "next/server";
import jejuSample from "@/data/samples/sample_ballot_response_partially_ambiguous_jeju.json";
import seoulSample from "@/data/samples/sample_ballot_response_resolved_seoul.json";
import { buildCandidateArtifacts, buildElectionMeta } from "@/app/data";
import {
  loadCandidatePromiseOverlayIndex,
  type CandidateRecordWithPromiseOverlay,
} from "@/app/api/ballots/promise-overlay";
import {
  loadCandidateNewsOverlayIndex,
  type CandidateRecordWithNewsOverlay,
} from "@/app/api/ballots/news-overlay";
import { pool } from "@/lib/db";
import { getActiveLocalElectionElectionId } from "@/lib/local-election-config";
import {
  buildDatabaseUnavailableResponse,
  isDatabaseUnavailableError,
} from "@/lib/pg-error";
import {
  ballotResponseSchema,
  ballotsSearchParamsSchema,
  type AmbiguousBallot,
  type BallotItem,
  type BallotResponse,
  type CandidateRecord,
} from "@/lib/schemas";
import { logServerEvent, observeRoute } from "@/lib/observability/server";

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
  name_hanja: string | null;
  party_name: string | null;
  photo_url: string | null;
  detail_url: string | null;
  source_kind: string | null;
  source_file: string | null;
  payload: Record<string, unknown> | null;
};

export async function GET(request: Request) {
  return observeRoute(request, "ballots", async (context) => {
    const { searchParams } = new URL(request.url);
    const parsed = ballotsSearchParamsSchema.safeParse({
      city: searchParams.get("city"),
      sigungu: searchParams.get("sigungu"),
      emd: searchParams.get("emd"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "city and sigungu are required",
          message: "시/도와 구/군/시는 필수입니다.",
        },
        { status: 400 },
      );
    }

    const { city, sigungu, emd } = parsed.data;

    try {
      const contests = await fetchContests(city, sigungu, emd);

      if (contests.length === 0) {
        return NextResponse.json(
          ballotResponseSchema.parse({
            city_name_canonical: city,
            sigungu_name: sigungu,
            emd_name: emd ?? null,
            resolution_status: "ambiguous",
            ballot_count: 0,
            ballots: [],
            ambiguous_ballots: [],
            meta: buildElectionMeta(),
          }),
        );
      }

      const contestIds = contests.map((contest) => contest.contest_id);
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
          continue;
        }

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

      const resolutionStatus =
        ambiguousBallots.length > 0
          ? ballots.length > 0
            ? "partially_ambiguous"
            : "ambiguous"
          : "resolved";

      return NextResponse.json(
        ballotResponseSchema.parse({
          city_name_canonical: city,
          sigungu_name: sigungu,
          emd_name: emd ?? null,
          resolution_status: resolutionStatus,
          ballot_count: ballots.length,
          ballots,
          ambiguous_ballots: ambiguousBallots,
          meta: buildElectionMeta(contests[0].election_id, contests[0].election_name),
        }),
      );
    } catch (error) {
      await logServerEvent({
        level: "error",
        signalType: "server_error",
        component: "next-api",
        route: context.routeName,
        requestId: context.requestId,
        correlationId: context.correlationId,
        httpMethod: request.method,
        errorName: error instanceof Error ? error.name : "BallotsQueryError",
        errorMessage:
          error instanceof Error ? error.message : "Failed to load ballots",
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (isDatabaseUnavailableError(error)) {
        const fallback = buildFallbackBallotResponse(city, sigungu, emd);
        if (fallback) {
          return NextResponse.json(fallback);
        }
        return buildDatabaseUnavailableResponse("ballots");
      }

      return NextResponse.json(
        {
          error: "Failed to load ballots",
          message:
            "투표구 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        },
        { status: 500 },
      );
    }
  });
}

function buildFallbackBallotResponse(
  city: string,
  sigungu: string,
  emd: string | undefined,
): BallotResponse | null {
  const key = `${city}::${sigungu}::${emd || ""}`;

  if (key === "서울특별시::강남구::개포1동") {
    return enrichFallbackResponse(seoulSample as BallotResponse);
  }

  if (key === "제주특별자치도::제주시::노형동") {
    return enrichFallbackResponse(jejuSample as BallotResponse);
  }

  return null;
}

function enrichFallbackResponse(response: BallotResponse): BallotResponse {
  return ballotResponseSchema.parse({
    ...response,
    ballots: response.ballots.map((ballot) => ({
      ...ballot,
      candidates: ballot.candidates.map((candidate) =>
        buildCandidateArtifacts(candidate as CandidateRecord),
      ),
    })),
    meta: buildElectionMeta(
      response.ballots[0]?.candidates[0]?.election_id ||
        response.ballots[0]?.contest_id.split(":")[0] ||
        "0020260603",
      response.ballots[0]?.election_name || "제9회 전국동시지방선거",
    ),
  });
}

async function fetchContests(city: string, sigungu: string, emd?: string) {
  const electionId = getActiveLocalElectionElectionId();
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
      where c.election_id = $1
        and c.city_name_canonical = $2
        and (c.sigungu_name is null or c.sigungu_name = $3)
        and (
          $4::text is null
          or c.geographic_scope in ('city_province', 'sigungu')
          or exists (
            select 1
            from local_election_contest_emd e
            where e.contest_id = c.contest_id
              and e.emd_name = $4::text
          )
        )
      order by c.election_code, c.display_name;
    `,
    [electionId, city, sigungu, emd ?? null],
  );

  return result.rows;
}

async function fetchCandidatesByContest(contestIds: string[]) {
  const map = new Map<string, CandidateRecord[]>();

  if (contestIds.length === 0) return map;

  const result = await pool.query<CandidateRow>(
    `
      select
        cand.candidate_id,
        cand.contest_id,
        cand.election_id,
        cand.election_code,
        cand.election_name,
        cand.city_code,
        cand.city_name,
        cand.town_code,
        cand.town_name,
        cand.district_name_raw,
        member.name as name_ko,
        (cand.payload ->> 'name_hanja') as name_hanja,
        member.party_name,
        member.profile_image_url as photo_url,
        cand.detail_url,
        cand.source_kind,
        cand.source_file,
        cand.payload
      from local_election_candidacy cand
      join member on member.member_id = cand.member_id
      where cand.contest_id = any($1::text[])
      order by cand.election_code, member.name;
    `,
    [contestIds],
  );

  const promiseOverlayIndex = await loadCandidatePromiseOverlayIndex();
  const newsOverlayIndex = await loadCandidateNewsOverlayIndex(
    result.rows.map((row) => ({
      candidate_id: row.candidate_id,
      contest_id: row.contest_id,
    })),
  );

  for (const row of result.rows) {
    const payload = (row.payload || {}) as Record<string, unknown>;
    const record = buildCandidateArtifacts({
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
      name_hanja: row.name_hanja ?? (payload.name_hanja as string | null) ?? null,
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
      promise_overlay: promiseOverlayIndex.get(row.candidate_id) ?? null,
      news_overlay: newsOverlayIndex.get(row.candidate_id) ?? null,
    } satisfies CandidateRecordWithPromiseOverlay & CandidateRecordWithNewsOverlay);

    const candidates = map.get(row.contest_id) || [];
    candidates.push(record);
    map.set(row.contest_id, candidates);
  }

  return map;
}

function groupContestsByElection(contests: ContestRow[]) {
  const grouped = new Map<string, ContestRow[]>();

  for (const contest of contests) {
    const contestsByElection = grouped.get(contest.election_code) || [];
    contestsByElection.push(contest);
    grouped.set(contest.election_code, contestsByElection);
  }

  return grouped;
}
