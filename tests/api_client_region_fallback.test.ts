import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";
import path from "node:path";
import test from "node:test";

function loadRegionQueryModules() {
  const runtimeRequire = createRequire(__filename);
  const moduleLoader = Module as typeof Module & {
    _resolveFilename: (
      request: string,
      parent: unknown,
      isMain: boolean,
      options: unknown,
    ) => string;
  };
  const originalResolveFilename = moduleLoader._resolveFilename;

  moduleLoader._resolveFilename = (request, parent, isMain, options) => {
    if (request.startsWith("@/")) {
      const relativeTarget = request.slice(2);
      const hasExtension = path.extname(relativeTarget).length > 0;

      return path.join(
        process.cwd(),
        "tmp/region-fallback-test/src",
        hasExtension ? relativeTarget : `${relativeTarget}.js`,
      );
    }

    return originalResolveFilename(request, parent, isMain, options);
  };

  try {
    const { CITIES } = runtimeRequire("../src/app/data") as typeof import("../src/app/data");
    const { citiesQueryOptions } = runtimeRequire("../src/lib/api-client") as typeof import("../src/lib/api-client");

    return { CITIES, citiesQueryOptions };
  } finally {
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
