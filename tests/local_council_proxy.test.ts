import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const runtimeRequire = createRequire(__filename);

function clearLocalCouncilProxyModuleCache() {
  for (const request of [
    "../src/app/api/local-council/v1/_shared",
    "../src/app/api/local-council/v1/resolve/route",
    "../src/app/api/local-council/v1/districts/[guCode]/roster/route",
    "../src/app/api/local-council/v1/persons/[personKey]/route",
  ]) {
    const resolved = runtimeRequire.resolve(request);
    delete runtimeRequire.cache[resolved];
  }
}

function loadResolveRoute() {
  clearLocalCouncilProxyModuleCache();
  return runtimeRequire("../src/app/api/local-council/v1/resolve/route") as typeof import("../src/app/api/local-council/v1/resolve/route");
}

function loadRosterRoute() {
  clearLocalCouncilProxyModuleCache();
  return runtimeRequire(
    "../src/app/api/local-council/v1/districts/[guCode]/roster/route",
  ) as typeof import("../src/app/api/local-council/v1/districts/[guCode]/roster/route");
}

function loadPersonRoute() {
  clearLocalCouncilProxyModuleCache();
  return runtimeRequire(
    "../src/app/api/local-council/v1/persons/[personKey]/route",
  ) as typeof import("../src/app/api/local-council/v1/persons/[personKey]/route");
}

function buildJsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

test("local council resolve route returns 400 when address is missing", async () => {
  delete process.env.WOOGOOK_BACKEND_BASE_URL;

  const { GET } = loadResolveRoute();
  const response = await GET(
    new Request("http://127.0.0.1:3000/api/local-council/v1/resolve"),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "address is required",
    message: "지역 정보가 필요합니다.",
  });
});

test("local council resolve route relays backend 404 for out-of-scope addresses", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalBackendBaseUrl = process.env.WOOGOOK_BACKEND_BASE_URL;
  const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalBackendBaseUrl === undefined) {
      delete process.env.WOOGOOK_BACKEND_BASE_URL;
    } else {
      process.env.WOOGOOK_BACKEND_BASE_URL = originalBackendBaseUrl;
    }
  });

  process.env.WOOGOOK_BACKEND_BASE_URL = "http://backend.test";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ input, init });
    return buildJsonResponse({ detail: "district not supported" }, 404);
  }) as typeof fetch;

  const { GET } = loadResolveRoute();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/resolve?address=서울특별시%20송파구%20잠실동%20123",
    ),
  );

  assert.equal(
    fetchCalls[0]?.input,
    "http://backend.test/api/local-council/v1/resolve?address=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C+%EC%86%A1%ED%8C%8C%EA%B5%AC+%EC%9E%A0%EC%8B%A4%EB%8F%99+123",
  );
  assert.equal(fetchCalls[0]?.init?.cache, "no-store");
  assert.equal(response.status, 404);
  assert.equal(
    response.headers.get("content-type"),
    "application/json; charset=utf-8",
  );
  assert.deepEqual(await response.json(), {
    detail: "district not supported",
  });
});

test("local council resolve route returns 503 when backend base URL is missing", async () => {
  delete process.env.WOOGOOK_BACKEND_BASE_URL;

  const { GET } = loadResolveRoute();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/resolve?address=서울특별시%20강동구%20천호동%20123",
    ),
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Missing WOOGOOK_BACKEND_BASE_URL",
    message: "현직자 조회가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
  });
});

test("local council roster route relays gu_code-based backend requests", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalBackendBaseUrl = process.env.WOOGOOK_BACKEND_BASE_URL;
  const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalBackendBaseUrl === undefined) {
      delete process.env.WOOGOOK_BACKEND_BASE_URL;
    } else {
      process.env.WOOGOOK_BACKEND_BASE_URL = originalBackendBaseUrl;
    }
  });

  process.env.WOOGOOK_BACKEND_BASE_URL = "http://backend.test";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ input, init });
    return buildJsonResponse({ council_members: [] }, 200);
  }) as typeof fetch;

  const { GET } = loadRosterRoute();
  const response = await GET(new Request("http://127.0.0.1:3000"), {
    params: Promise.resolve({ guCode: "11740" }),
  });

  assert.equal(
    fetchCalls[0]?.input,
    "http://backend.test/api/local-council/v1/districts/11740/roster",
  );
  assert.equal(fetchCalls[0]?.init?.cache, "no-store");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { council_members: [] });
});

test("local council person route encodes person keys before proxying", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalBackendBaseUrl = process.env.WOOGOOK_BACKEND_BASE_URL;
  const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const opaqueKey =
    "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022643";

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalBackendBaseUrl === undefined) {
      delete process.env.WOOGOOK_BACKEND_BASE_URL;
    } else {
      process.env.WOOGOOK_BACKEND_BASE_URL = originalBackendBaseUrl;
    }
  });

  process.env.WOOGOOK_BACKEND_BASE_URL = "http://backend.test";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ input, init });
    return buildJsonResponse({ person_name: "이수희" }, 200);
  }) as typeof fetch;

  const { GET } = loadPersonRoute();
  const response = await GET(new Request("http://127.0.0.1:3000"), {
    params: Promise.resolve({
      personKey: opaqueKey,
    }),
  });

  assert.equal(
    fetchCalls[0]?.input,
    `http://backend.test/api/local-council/v1/persons/${encodeURIComponent(opaqueKey)}`,
  );
  assert.equal(fetchCalls[0]?.init?.cache, "no-store");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    person_name: "이수희",
  });
});

test("local council proxy relays backend streams without buffering the full body", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalBackendBaseUrl = process.env.WOOGOOK_BACKEND_BASE_URL;
  const encoder = new TextEncoder();
  let textCalled = false;

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalBackendBaseUrl === undefined) {
      delete process.env.WOOGOOK_BACKEND_BASE_URL;
    } else {
      process.env.WOOGOOK_BACKEND_BASE_URL = originalBackendBaseUrl;
    }
  });

  process.env.WOOGOOK_BACKEND_BASE_URL = "http://backend.test";
  globalThis.fetch = (async () => {
    const backendResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('{"person_name":"이수희"}'));
          controller.close();
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      },
    );

    Object.defineProperty(backendResponse, "text", {
      configurable: true,
      value: async () => {
        textCalled = true;
        throw new Error("proxy should not buffer the backend response body");
      },
    });

      return backendResponse;
  }) as typeof fetch;

  const { GET } = loadPersonRoute();
  const response = await GET(new Request("http://127.0.0.1:3000"), {
    params: Promise.resolve({
      personKey:
        "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-type"),
    "application/json; charset=utf-8",
  );
  assert.equal(textCalled, false);
  assert.deepEqual(await response.json(), {
    person_name: "이수희",
  });
});
