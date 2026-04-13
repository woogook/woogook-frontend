import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

type ObservabilityClientModule = typeof import("../src/lib/observability/client");

function loadRegionQueryModules(options?: {
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

  moduleLoader._load = (request, parent, isMain) => {
    if (request === "@/lib/observability/client") {
      return observabilityClient;
    }

    return originalLoad(request, parent, isMain);
  };

  const resolveAliasTarget = (relativeTarget: string) => {
    const hasExtension = path.extname(relativeTarget).length > 0;
    const candidateRoots = [
      path.join(process.cwd(), "tmp/region-fallback-test/src"),
      path.join(process.cwd(), "src"),
    ];
    const candidateExtensions = hasExtension ? [""] : [".ts", ".tsx", ".js", ".jsx", ".json"];

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

  moduleLoader._resolveFilename = (request, parent, isMain, options) => {
    if (request.startsWith("@/")) {
      return resolveAliasTarget(request.slice(2));
    }

    return originalResolveFilename(request, parent, isMain, options);
  };

  try {
    delete runtimeRequire.cache[runtimeRequire.resolve("../src/app/data")];
    delete runtimeRequire.cache[runtimeRequire.resolve("../src/lib/api-client")];

    const { CITIES } = runtimeRequire("../src/app/data") as typeof import("../src/app/data");
    const { citiesQueryOptions } = runtimeRequire("../src/lib/api-client") as typeof import("../src/lib/api-client");

    return { CITIES, citiesQueryOptions };
  } finally {
    moduleLoader._load = originalLoad;
    moduleLoader._resolveFilename = originalResolveFilename;
  }
}

test("citiesQueryOptions falls back without console.error when backend is unavailable", async () => {
  const { CITIES, citiesQueryOptions } = loadRegionQueryModules();
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const errorCalls: unknown[][] = [];
  const warnCalls: unknown[][] = [];

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        message:
          "로컬 Postgres가 실행 중이지 않습니다. Docker Desktop과 postgres 컨테이너를 먼저 실행해주세요.",
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

  console.error = (...args: unknown[]) => {
    errorCalls.push(args);
  };
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };

  try {
    const queryFn = citiesQueryOptions.queryFn as NonNullable<
      typeof citiesQueryOptions.queryFn
    >;
    const result = await queryFn(
      {
        queryKey: ["regions", "cities"] as const,
        client: undefined as never,
        signal: new AbortController().signal,
        meta: undefined,
      } as Parameters<typeof queryFn>[0],
    );

    assert.deepEqual(result.items, CITIES);
    assert.equal(
      result.fallbackMessage,
      "로컬 Postgres가 실행 중이지 않습니다. Docker Desktop과 postgres 컨테이너를 먼저 실행해주세요.",
    );
    assert.equal(errorCalls.length, 0);
    assert.equal(warnCalls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  }
});

test("citiesQueryOptions reports observability errors while keeping fallback warning behavior", async () => {
  const reportBrowserErrorCalls: Array<{
    error: Error;
    context?: Record<string, unknown>;
  }> = [];
  const { citiesQueryOptions } = loadRegionQueryModules({
    observabilityClient: {
      reportBrowserError: async (error, context) => {
        reportBrowserErrorCalls.push({ error, context });
      },
    },
  });
  const originalFetch = globalThis.fetch;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const warnCalls: unknown[][] = [];
  const errorCalls: unknown[][] = [];

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        message: "지역 목록 API가 일시적으로 응답하지 않습니다.",
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };
  console.error = (...args: unknown[]) => {
    errorCalls.push(args);
  };

  try {
    const queryFn = citiesQueryOptions.queryFn as NonNullable<
      typeof citiesQueryOptions.queryFn
    >;

    await queryFn(
      {
        queryKey: ["regions", "cities"] as const,
        client: undefined as never,
        signal: new AbortController().signal,
        meta: undefined,
      } as Parameters<typeof queryFn>[0],
    );

    assert.equal(warnCalls.length, 1);
    assert.equal(errorCalls.length, 0);
    assert.equal(reportBrowserErrorCalls.length, 1);
    assert.equal(reportBrowserErrorCalls[0]?.error.message, "지역 목록 API가 일시적으로 응답하지 않습니다.");
    assert.deepEqual(reportBrowserErrorCalls[0]?.context, {
      route: "/api/regions/cities",
      fallbackMessage: "지역 목록을 불러오지 못해 기본 목록을 사용합니다.",
    });
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  }
});
