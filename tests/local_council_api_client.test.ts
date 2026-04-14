import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

type ObservabilityClientModule = typeof import("../src/lib/observability/client");

function loadLocalCouncilApiClient(options?: {
  observabilityClient?: Partial<ObservabilityClientModule>;
}) {
  const runtimeRequire = createRequire(__filename);
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
  return new Response(JSON.stringify({ message }), {
    status: 503,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

test("fetchLocalCouncilResolve falls back to the Gangdong sample when backend is unavailable", async () => {
  const { fetchLocalCouncilResolve } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    buildServiceUnavailableResponse("현직자 조회 API가 잠시 응답하지 않습니다.");

  try {
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
  }
});

test("fetchLocalCouncilResolve falls back to the Gangdong sample when fetch rejects before reaching backend", async () => {
  const { fetchLocalCouncilResolve } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };

  try {
    const result = await fetchLocalCouncilResolve({
      city: "서울특별시",
      district: "강동구",
      dong: "천호동",
    });

    assert.equal(result.dataSource, "local_sample");
    assert.equal(result.data.district.district_slug, "seoul-gangdong");
  } finally {
    globalThis.fetch = originalFetch;
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

test("fetchLocalCouncilPerson falls back to the local sample when backend is unavailable", async () => {
  const { fetchLocalCouncilPerson } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    buildServiceUnavailableResponse("현직자 상세 API가 잠시 응답하지 않습니다.");

  try {
    const result = await fetchLocalCouncilPerson(
      "seoul-gangdong:council-member:600000001",
    );

    assert.equal(result.dataSource, "local_sample");
    assert.equal(Boolean(result.data.person_name), true);
    assert.equal(
      result.data.overlay?.basis?.target_member_id,
      "seoul-gangdong:council-member:600000001",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchLocalCouncilPerson falls back to the local sample when fetch rejects before reaching backend", async () => {
  const { fetchLocalCouncilPerson } = loadLocalCouncilApiClient();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };

  try {
    const result = await fetchLocalCouncilPerson(
      "seoul-gangdong:council-member:600000001",
    );

    assert.equal(result.dataSource, "local_sample");
    assert.equal(
      result.data.overlay?.basis?.target_member_id,
      "seoul-gangdong:council-member:600000001",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
