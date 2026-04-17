import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import sampleLocalCouncilGangdongResolve from "../src/data/samples/sample_local_council_gangdong_resolve.json";
import { localCouncilResolveResponseSchema } from "../src/lib/schemas";

type ObservabilityClientModule = typeof import("../src/lib/observability/client");

function loadLocalCouncilApiClient(options?: {
  observabilityClient?: Partial<ObservabilityClientModule>;
}) {
  const runtimeRequire = createRequire(import.meta.url);
  const moduleLoader = Module as typeof Module & {
    _load: (request: string, parent: unknown, isMain: boolean) => unknown;
    _resolveFilename: (
      request: string,
      parent: unknown,
      isMain: boolean,
      options: unknown,
    ) => string;
  };
  const originalLoad = moduleLoader._load;
  const originalResolveFilename = moduleLoader._resolveFilename;

  const observabilityClient = {
    CORRELATION_HEADER: "x-correlation-id",
    createBrowserCorrelationHeaders(init?: HeadersInit) {
      return {
        headers: new Headers(init),
        correlationId: "test-correlation-id",
      };
    },
    reportBrowserError: async () => undefined,
    reportClientApiFailure: async () => undefined,
    ...options?.observabilityClient,
  } satisfies Partial<ObservabilityClientModule> & {
    CORRELATION_HEADER: string;
    createBrowserCorrelationHeaders: typeof import("../src/lib/observability/client").createBrowserCorrelationHeaders;
    reportBrowserError: typeof import("../src/lib/observability/client").reportBrowserError;
    reportClientApiFailure: typeof import("../src/lib/observability/client").reportClientApiFailure;
  };

  const resolveAliasTarget = (relativeTarget: string) => {
    const hasExtension = path.extname(relativeTarget).length > 0;
    const candidateRoots = [path.join(process.cwd(), "src")];
    const candidateExtensions = hasExtension
      ? [""]
      : [".ts", ".tsx", ".js", ".jsx", ".json"];

    for (const root of candidateRoots) {
      for (const extension of candidateExtensions) {
        const targetPath = path.join(root, `${relativeTarget}${extension}`);
        if (fs.existsSync(targetPath)) {
          return targetPath;
        }
      }
    }

    throw new Error(`Failed to resolve aliased module: ${relativeTarget}`);
  };

  moduleLoader._load = (request, parent, isMain) => {
    if (request === "@/lib/observability/client") {
      return observabilityClient;
    }

    return originalLoad(request, parent, isMain);
  };

  moduleLoader._resolveFilename = (request, parent, isMain, options) => {
    if (request.startsWith("@/")) {
      return resolveAliasTarget(request.slice(2));
    }

    return originalResolveFilename(request, parent, isMain, options);
  };

  try {
    delete runtimeRequire.cache[runtimeRequire.resolve("../src/lib/api-client")];

    return runtimeRequire("../src/lib/api-client") as typeof import("../src/lib/api-client");
  } finally {
    moduleLoader._load = originalLoad;
    moduleLoader._resolveFilename = originalResolveFilename;
  }
}

function buildServiceUnavailableResponse(message: string) {
  return buildJsonResponse({ message }, 503);
}

function buildJsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

test("fetchLocalCouncilResolve falls back to the Gangdong sample when backend is unavailable", async () => {
  const { fetchLocalCouncilResolve } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  globalThis.fetch = async () =>
    buildServiceUnavailableResponse("현직자 조회 API가 잠시 응답하지 않습니다.");

  try {
    process.env.NODE_ENV = "development";
    const result = await fetchLocalCouncilResolve({
      city: "서울특별시",
      district: "강동구",
      dong: "천호동",
    });

    assert.equal(result.dataSource, "local_sample");
    assert.equal(result.data.district.district_slug, "seoul-gangdong");
    assert.equal(result.data.roster.council_members.length > 0, true);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("fetchLocalCouncilResolve falls back to the Gangdong sample when fetch rejects before reaching backend", async () => {
  const { fetchLocalCouncilResolve } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };

  try {
    process.env.NODE_ENV = "development";
    const result = await fetchLocalCouncilResolve({
      city: "서울특별시",
      district: "강동구",
      dong: "천호동",
    });

    assert.equal(result.dataSource, "local_sample");
    assert.equal(result.data.district.district_slug, "seoul-gangdong");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("fetchLocalCouncilResolve returns the Gangdong-only limitation message for other districts when backend is unavailable", async () => {
  const { ApiError, fetchLocalCouncilResolve } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    buildServiceUnavailableResponse("현직자 조회 API가 잠시 응답하지 않습니다.");

  try {
    await assert.rejects(
      () =>
        fetchLocalCouncilResolve({
          city: "서울특별시",
          district: "송파구",
          dong: "잠실동",
        }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 503 &&
        error.message ===
          "현재 로컬 미리보기는 서울특별시 강동구만 준비되어 있습니다.",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchLocalCouncilResolve maps backend 404 detail responses to the supported-scope message", async () => {
  const { ApiError, fetchLocalCouncilResolve } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    buildJsonResponse(
      {
        detail: "unsupported local council address: 서울특별시 송파구 잠실동 123",
      },
      404,
    );

  try {
    await assert.rejects(
      () =>
        fetchLocalCouncilResolve({
          city: "서울특별시",
          district: "송파구",
          dong: "잠실동",
        }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 404 &&
        error.message === "현재는 서울특별시 강동구만 준비되어 있습니다.",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchLocalCouncilResolve preserves unrelated backend 404 detail responses", async () => {
  const { ApiError, fetchLocalCouncilResolve } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    buildJsonResponse(
      {
        detail: "local council resolve route is temporarily unavailable",
      },
      404,
    );

  try {
    await assert.rejects(
      () =>
        fetchLocalCouncilResolve({
          city: "서울특별시",
          district: "송파구",
          dong: "잠실동",
        }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 404 &&
        error.message === "local council resolve route is temporarily unavailable",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchLocalCouncilResolve falls back to the Gangdong sample when backend returns a Gangdong roster-missing 404", async () => {
  const { fetchLocalCouncilResolve } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  globalThis.fetch = async () =>
    buildJsonResponse(
      {
        detail: "local council roster not found: 11740",
      },
      404,
    );

  try {
    process.env.NODE_ENV = "development";
    const result = await fetchLocalCouncilResolve({
      city: "서울특별시",
      district: "강동구",
      dong: "천호동",
    });

    assert.equal(result.dataSource, "local_sample");
    assert.deepEqual(
      result.data,
      localCouncilResolveResponseSchema.parse(sampleLocalCouncilGangdongResolve),
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("fetchLocalCouncilResolve surfaces a production error when backend returns a Gangdong roster-missing 404", async () => {
  const { ApiError, fetchLocalCouncilResolve } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  globalThis.fetch = async () =>
    buildJsonResponse(
      {
        detail: "local council roster not found: 11740",
      },
      404,
    );

  try {
    process.env.NODE_ENV = "production";
    await assert.rejects(
      () =>
        fetchLocalCouncilResolve({
          city: "서울특별시",
          district: "강동구",
          dong: "천호동",
        }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 503 &&
        error.message ===
          "현직 지방의원 공식 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("fetchLocalCouncilResolve surfaces a production error when the Gangdong backend is unavailable", async () => {
  const { ApiError, fetchLocalCouncilResolve } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  globalThis.fetch = async () =>
    buildServiceUnavailableResponse("현직자 조회 API가 잠시 응답하지 않습니다.");

  try {
    process.env.NODE_ENV = "production";
    await assert.rejects(
      () =>
        fetchLocalCouncilResolve({
          city: "서울특별시",
          district: "강동구",
          dong: "천호동",
        }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 503 &&
        error.message ===
          "현직 지방의원 공식 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("fetchLocalCouncilRoster falls back to the Gangdong sample when backend is unavailable", async () => {
  const { fetchLocalCouncilRoster } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  globalThis.fetch = async () =>
    buildServiceUnavailableResponse("현직자 명단 API가 잠시 응답하지 않습니다.");

  try {
    process.env.NODE_ENV = "development";
    const result = await fetchLocalCouncilRoster("11740");

    assert.equal(result.dataSource, "local_sample");
    assert.equal(result.data.council_members.length > 0, true);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("fetchLocalCouncilRoster surfaces a production error when backend is unavailable", async () => {
  const { ApiError, fetchLocalCouncilRoster } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  globalThis.fetch = async () =>
    buildServiceUnavailableResponse("현직자 명단 API가 잠시 응답하지 않습니다.");

  try {
    process.env.NODE_ENV = "production";
    await assert.rejects(
      () => fetchLocalCouncilRoster("11740"),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 503 &&
        error.message ===
          "현직 지방의원 공식 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("fetchLocalCouncilPerson surfaces a production error instead of sample fallback when backend is unavailable", async () => {
  const { ApiError, fetchLocalCouncilPerson } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  globalThis.fetch = async () =>
    buildServiceUnavailableResponse("현직자 상세 API가 잠시 응답하지 않습니다.");

  try {
    process.env.NODE_ENV = "production";
    await assert.rejects(
      () =>
        fetchLocalCouncilPerson(
          "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
        ),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 503 &&
        error.message ===
          "선택한 지방의원 공식 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("fetchLocalCouncilPerson surfaces a production error when backend returns projection-missing 404", async () => {
  const { ApiError, fetchLocalCouncilPerson } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  globalThis.fetch = async () =>
    buildJsonResponse(
      {
        detail:
          "local council person not found: seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
      },
      404,
    );

  try {
    process.env.NODE_ENV = "production";
    await assert.rejects(
      () =>
        fetchLocalCouncilPerson(
          "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
        ),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 503 &&
        error.message ===
          "선택한 지방의원 공식 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("mergeLocalCouncilDataSources marks mixed resolve/roster inputs as local_sample", () => {
  const { mergeLocalCouncilDataSources } = loadLocalCouncilApiClient();

  assert.equal(
    mergeLocalCouncilDataSources(),
    "local_sample",
  );
  assert.equal(
    mergeLocalCouncilDataSources("backend", "backend"),
    "backend",
  );
  assert.equal(
    mergeLocalCouncilDataSources("local_sample", "backend"),
    "local_sample",
  );
});

test("buildLocalCouncilRosterScreenResult falls back to the resolve roster payload", () => {
  const { buildLocalCouncilRosterScreenResult } = loadLocalCouncilApiClient();

  const result = buildLocalCouncilRosterScreenResult({
    resolved: {
      data: localCouncilResolveResponseSchema.parse(sampleLocalCouncilGangdongResolve),
      dataSource: "backend",
    },
  });

  assert.equal(result.dataSource, "backend");
  assert.equal(result.data.district.gu_code, "11740");
  assert.equal(result.data.roster.council_members.length > 0, true);
});

test("fetchLocalCouncilPerson falls back to the local sample when backend is unavailable", async () => {
  const { fetchLocalCouncilPerson } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  globalThis.fetch = async () =>
    buildServiceUnavailableResponse("현직자 상세 API가 잠시 응답하지 않습니다.");

  try {
    process.env.NODE_ENV = "development";
    const result = await fetchLocalCouncilPerson(
      "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
    );

    assert.equal(result.dataSource, "local_sample");
    assert.equal(Boolean(result.data.person_name), true);
    assert.equal(
      result.data.overlay?.basis?.target_member_id,
      "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("fetchLocalCouncilPerson falls back to the local sample for opaque fallback keys", async () => {
  const { fetchLocalCouncilPerson } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;
  const opaqueKey =
    "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022643";

  globalThis.fetch = async () =>
    buildServiceUnavailableResponse("현직자 상세 API가 잠시 응답하지 않습니다.");

  try {
    process.env.NODE_ENV = "development";
    const result = await fetchLocalCouncilPerson(opaqueKey);

    assert.equal(result.dataSource, "local_sample");
    assert.equal(result.data.overlay?.basis?.target_member_id, opaqueKey);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("fetchLocalCouncilPerson surfaces backend detail payloads for missing people", async () => {
  const { ApiError, fetchLocalCouncilPerson } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    buildJsonResponse(
      {
        detail: "선택한 인물 정보를 찾지 못했습니다.",
      },
      404,
    );

  try {
    await assert.rejects(
      () => fetchLocalCouncilPerson("missing-person-key"),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 404 &&
        error.message === "선택한 인물 정보를 찾지 못했습니다.",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchLocalCouncilPerson falls back to the local sample when fetch rejects before reaching backend", async () => {
  const { fetchLocalCouncilPerson } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };

  try {
    process.env.NODE_ENV = "development";
    const result = await fetchLocalCouncilPerson(
      "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
    );

    assert.equal(result.dataSource, "local_sample");
    assert.equal(
      result.data.overlay?.basis?.target_member_id,
      "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("fetchLocalCouncilPerson accepts older dossier responses missing overlay and diagnostics", async () => {
  const { fetchLocalCouncilPerson } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;

  console.error = () => undefined;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        person_name: "김가동",
        office_type: "basic_council",
        summary: {
          headline: "김가동 공식 근거 요약",
          grounded_summary: "요약",
          summary_mode: "fallback",
          summary_basis: {},
        },
        evidence: [],
        official_profile: {},
        committees: [],
        bills: [],
        meeting_activity: [],
        finance_activity: [],
        elected_basis: {},
        source_refs: [],
        spot_check: null,
        freshness: {},
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

  try {
    const result = await fetchLocalCouncilPerson(
      "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
    );

    assert.equal(result.data.person_name, "김가동");
    assert.equal(result.data.overlay, undefined);
    assert.equal(result.data.diagnostics, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});

test("fetchLocalCouncilPerson falls back to the local sample for huboid keys from live backend", async () => {
  const { fetchLocalCouncilPerson } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;
  const huboidKey = "seoul-gangdong:council-member:600000001";

  globalThis.fetch = async () =>
    buildServiceUnavailableResponse("현직자 상세 API가 잠시 응답하지 않습니다.");

  try {
    process.env.NODE_ENV = "development";
    const result = await fetchLocalCouncilPerson(huboidKey);

    assert.equal(result.dataSource, "local_sample");
    assert.equal(result.data.person_name, "김가동");
    assert.equal(result.data.overlay?.basis?.target_member_id, huboidKey);
    assert.equal(result.data.diagnostics?.spot_check?.person_key, huboidKey);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  }
});
