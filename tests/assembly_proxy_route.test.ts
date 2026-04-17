import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";
import test from "node:test";

type ProxyCall = {
  path?: string;
  requestArg: unknown;
};

const runtimeRequire = createRequire(__filename);

function loadAssemblyRoute<T>(modulePath: string, proxyCalls: ProxyCall[]) {
  const moduleLoader = Module as typeof Module & {
    _load: (request: string, parent: unknown, isMain: boolean) => unknown;
  };
  const originalLoad = moduleLoader._load;

  moduleLoader._load = (request, parent, isMain) => {
    if (request === "@/app/api/_shared/backend-proxy") {
      return {
        proxyToBackendWithObservability: ({
          request: requestArg,
          path,
        }: {
          request: unknown;
          path?: string;
        }) => {
          proxyCalls.push({ requestArg, path });
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
            },
          });
        },
      };
    }

    if (request === "@/lib/observability/server") {
      return {
        observeRoute: async (
          _request: Request,
          _route: string,
          handler: () => Promise<Response>,
        ) => handler(),
        logServerEvent: async () => undefined,
      };
    }

    return originalLoad(request, parent, isMain);
  };

  try {
    delete runtimeRequire.cache[runtimeRequire.resolve(modulePath)];
    return runtimeRequire(modulePath) as T;
  } finally {
    moduleLoader._load = originalLoad;
  }
}

test("assembly members route forwards request and query to proxy", async () => {
  const proxyCalls: ProxyCall[] = [];
  const { GET } = loadAssemblyRoute<typeof import("../src/app/api/assembly/v1/members/route")>(
    "../src/app/api/assembly/v1/members/route",
    proxyCalls,
  );
  const request = new Request(
    "http://127.0.0.1:3000/api/assembly/v1/members?region=%EC%84%9C%EC%9A%B8&district=%EA%B0%95%EB%8F%99%EA%B5%AC",
  );

  const response = await GET(request);

  assert.equal(response.status, 200);
  assert.equal(proxyCalls.length, 1);
  assert.equal(proxyCalls[0]?.requestArg, request);
  assert.equal(
    proxyCalls[0]?.path,
    "/api/assembly/v1/members?region=%EC%84%9C%EC%9A%B8&district=%EA%B0%95%EB%8F%99%EA%B5%AC",
  );
});

test("assembly member card route forwards request to proxy", async () => {
  const proxyCalls: ProxyCall[] = [];
  const { GET } = loadAssemblyRoute<typeof import("../src/app/api/assembly/v1/members/[mona_cd]/card/route")>(
    "../src/app/api/assembly/v1/members/[mona_cd]/card/route",
    proxyCalls,
  );
  const request = new Request("http://127.0.0.1:3000/api/assembly/v1/members/123/card");

  const response = await GET(request, {
    params: Promise.resolve({ mona_cd: "seoul member/123" }),
  });

  assert.equal(response.status, 200);
  assert.equal(proxyCalls.length, 1);
  assert.equal(proxyCalls[0]?.requestArg, request);
  assert.equal(
    proxyCalls[0]?.path,
    "/api/assembly/v1/members/seoul%20member%2F123/card",
  );
});

test("assembly member pledge summary route forwards request to proxy", async () => {
  const proxyCalls: ProxyCall[] = [];
  const { GET } = loadAssemblyRoute<
    typeof import("../src/app/api/assembly/v1/members/[mona_cd]/pledge-summary/route")
  >(
    "../src/app/api/assembly/v1/members/[mona_cd]/pledge-summary/route",
    proxyCalls,
  );
  const request = new Request(
    "http://127.0.0.1:3000/api/assembly/v1/members/123/pledge-summary",
  );

  const response = await GET(request, {
    params: Promise.resolve({ mona_cd: "member:summary" }),
  });

  assert.equal(response.status, 200);
  assert.equal(proxyCalls.length, 1);
  assert.equal(proxyCalls[0]?.requestArg, request);
  assert.equal(
    proxyCalls[0]?.path,
    "/api/assembly/v1/members/member%3Asummary/pledge-summary",
  );
});

test("assembly member pledges route forwards request and search params to proxy", async () => {
  const proxyCalls: ProxyCall[] = [];
  const { GET } = loadAssemblyRoute<typeof import("../src/app/api/assembly/v1/members/[mona_cd]/pledges/route")>(
    "../src/app/api/assembly/v1/members/[mona_cd]/pledges/route",
    proxyCalls,
  );
  const request = new Request(
    "http://127.0.0.1:3000/api/assembly/v1/members/123/pledges?category=%EA%B5%90%ED%86%B5&limit=5",
  );

  const response = await GET(request, {
    params: Promise.resolve({ mona_cd: "member pledges" }),
  });

  assert.equal(response.status, 200);
  assert.equal(proxyCalls.length, 1);
  assert.equal(proxyCalls[0]?.requestArg, request);
  assert.equal(
    proxyCalls[0]?.path,
    "/api/assembly/v1/members/member%20pledges/pledges?category=%EA%B5%90%ED%86%B5&limit=5",
  );
});
