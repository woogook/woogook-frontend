import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBackendPath,
  relayToBackend,
} from "./local-election-backend.ts";
import { ballotResponseSchema } from "./schemas.ts";
import type { CandidateRecord } from "./schemas.ts";

test("buildBackendPath maps frontend params to backend query names", () => {
  const path = buildBackendPath("/api/local-election/v1/ballots", {
    city_name_canonical: "서울특별시",
    sigungu_name: "강남구",
    emd_name: "개포1동",
  });

  assert.equal(
    path,
    "/api/local-election/v1/ballots?city_name_canonical=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C&sigungu_name=%EA%B0%95%EB%82%A8%EA%B5%AC&emd_name=%EA%B0%9C%ED%8F%AC1%EB%8F%99",
  );
});

test("buildBackendPath omits empty query values", () => {
  const path = buildBackendPath("/api/local-election/v1/regions/emd", {
    city_name_canonical: "서울특별시",
    sigungu_name: "강남구",
    emd_name: undefined,
  });

  assert.equal(
    path,
    "/api/local-election/v1/regions/emd?city_name_canonical=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C&sigungu_name=%EA%B0%95%EB%82%A8%EA%B5%AC",
  );
});

test("relayToBackend forwards backend response", async () => {
  const originalFetch = globalThis.fetch;
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (input, init) => {
    fetchCalls.push({ input: String(input), init });
    return new Response(JSON.stringify({ cities: ["서울특별시"] }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  }) as typeof fetch;

  try {
    const response = await relayToBackend({
      baseUrl: "https://api.woogook.kr/",
      path: "/api/local-election/v1/regions/cities",
      unavailableBody: {
        error: "Local election backend unavailable",
        message: "지역 데이터를 불러올 수 없습니다.",
      },
    });

    assert.equal(fetchCalls[0]?.input, "https://api.woogook.kr/api/local-election/v1/regions/cities");
    assert.equal(fetchCalls[0]?.init?.cache, "no-store");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { cities: ["서울특별시"] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("relayToBackend returns 503 when backend base url is missing", async () => {
  const response = await relayToBackend({
    baseUrl: "",
    path: "/api/local-election/v1/regions/cities",
    missingBaseUrlBody: {
      error: "Missing WOOGOOK_BACKEND_BASE_URL",
      message: "지역 데이터를 불러올 준비가 아직 되지 않았습니다.",
    },
    unavailableBody: {
      error: "Local election backend unavailable",
      message: "지역 데이터를 불러올 수 없습니다.",
    },
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Missing WOOGOOK_BACKEND_BASE_URL",
    message: "지역 데이터를 불러올 준비가 아직 되지 않았습니다.",
  });
});

test("ballotResponseSchema accepts live backend nullable candidate fields", () => {
  const candidate = {
    candidate_id: "cand-1",
    contest_id: "0020220601:3:1100:all:서울특별시",
    election_id: "0020220601",
    election_code: "3",
    election_name: "시·도지사선거",
    city_code: 1100,
    city_name: "서울특별시",
    town_code: null,
    town_name: null,
    district_name_raw: "서울특별시",
    name_ko: "홍길동",
    name_hanja: null,
    party_name: null,
    gender: "남",
    birthdate_text: null,
    age_text: null,
    address: null,
    job: "정치인",
    education: "대학교 졸업",
    career: "(전) 구의원",
    registration_date: null,
    crime_text: null,
    crime_parse_status: null,
    crime_case_count: null,
    crime_items: [],
    photo_url: null,
    detail_url: null,
    source_scope_key: "historical_3_1100",
    source_scope_label: "NEC 과거선거정보 · historical_3_1100",
    source_kind: "nec_processed_registered_candidate",
    source_file: "all_candidates.jsonl",
    promise_overlay: null,
    news_overlay: null,
    brief: null,
    issue_matches: [],
    compare_entry: null,
  } satisfies Partial<CandidateRecord> & {
    address: null;
    registration_date: null;
    crime_text: null;
    crime_parse_status: null;
    photo_url: null;
    detail_url: null;
    promise_overlay: null;
    news_overlay: null;
  };

  const parsed = ballotResponseSchema.parse({
    city_name_canonical: "서울특별시",
    sigungu_name: "강남구",
    emd_name: "강남구",
    resolution_status: "partially_ambiguous",
    ballot_count: 1,
    ballots: [
      {
        contest_id: "0020220601:3:1100:all:서울특별시",
        election_code: "3",
        election_name: "시·도지사선거",
        ballot_subject_type: "candidate_person",
        office_level: "metro_head",
        representation_type: "single",
        special_region_type: "general",
        geographic_scope: "city_province",
        city_code: 1100,
        city_name_canonical: "서울특별시",
        sigungu_name: null,
        display_name: "서울특별시",
        parent_area_name: null,
        seats: 1,
        candidates: [candidate],
      },
    ],
    ambiguous_ballots: [],
    meta: {
      election_id: "0020220601",
      election_name: "시·도지사선거",
      election_day: "2022-06-01",
      data_phase: "completed",
      as_of: "2026-04-15T19:55:10.399090+09:00",
    },
  });

  assert.equal(parsed.ballots[0]?.candidates[0]?.address, null);
  assert.equal(parsed.ballots[0]?.candidates[0]?.registration_date, null);
  assert.equal(parsed.ballots[0]?.candidates[0]?.photo_url, null);
  assert.equal(parsed.ballots[0]?.candidates[0]?.promise_overlay, null);
  assert.equal(parsed.ballots[0]?.candidates[0]?.news_overlay, null);
});
