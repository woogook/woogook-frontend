import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBackendPath,
  relayToBackend,
} from "./local-election-backend.ts";

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
