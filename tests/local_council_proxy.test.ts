import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const runtimeRequire = createRequire(__filename);

function clearLocalCouncilProxyModuleCache() {
  for (const request of [
    "../src/app/api/local-council/v1/_shared",
    "../src/app/api/local-council/v1/profile-photo/route",
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

function loadProfilePhotoRoute() {
  clearLocalCouncilProxyModuleCache();
  return runtimeRequire(
    "../src/app/api/local-council/v1/profile-photo/route",
  ) as typeof import("../src/app/api/local-council/v1/profile-photo/route");
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

test("local council profile photo route returns 400 when pageUrl is missing", async () => {
  const { GET } = loadProfilePhotoRoute();
  const response = await GET(
    new Request("http://127.0.0.1:3000/api/local-council/v1/profile-photo"),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "pageUrl is required",
    message: "공식 프로필 페이지 주소가 필요합니다.",
  });
});

test("local council profile photo route fetches the official page first and reuses cookies for the image request", async (t) => {
  const originalFetch = globalThis.fetch;
  const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ input, init });
    const url = String(input);

    if (url === "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010") {
      assert.equal(init?.redirect, "manual");
      assert.ok(init?.signal);
      return new Response(
        '<html><body><img class="bg_mayor" src="/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025" alt="강동구청장 이수희"></body></html>',
        {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "set-cookie": "JSESSIONID=abc; Path=/, WMONID=def; Path=/",
          },
        },
      );
    }

    if (
      url ===
      "https://www.gangdong.go.kr/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025"
    ) {
      assert.equal(init?.redirect, "manual");
      assert.ok(init?.signal);
      assert.equal(init?.headers && new Headers(init.headers).get("cookie"), "JSESSIONID=abc; WMONID=def");
      return new Response(Uint8Array.from([137, 80, 78, 71]), {
        status: 200,
        headers: {
          "content-type": "image/png",
        },
      });
    }

    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  const { GET } = loadProfilePhotoRoute();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/profile-photo?pageUrl=https%3A%2F%2Fwww.gangdong.go.kr%2Fweb%2Fmayor%2Fcontents%2Fgdo010_010",
    ),
  );

  assert.equal(fetchCalls.length, 2);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.deepEqual(Array.from(new Uint8Array(await response.arrayBuffer())), [137, 80, 78, 71]);
});

test("local council profile photo route rejects non-html profile pages", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url === "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010") {
      return new Response("not html", {
        status: 200,
        headers: {
          "content-type": "image/png",
        },
      });
    }

    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  const { GET } = loadProfilePhotoRoute();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/profile-photo?pageUrl=https%3A%2F%2Fwww.gangdong.go.kr%2Fweb%2Fmayor%2Fcontents%2Fgdo010_010",
    ),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "profile page unavailable",
    message: "공식 프로필 사진을 불러오지 못했습니다.",
  });
});

test("local council profile photo route rejects oversized profile pages before reading the body", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url === "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010") {
      return new Response("<html></html>", {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "content-length": String(1_048_577),
        },
      });
    }

    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  const { GET } = loadProfilePhotoRoute();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/profile-photo?pageUrl=https%3A%2F%2Fwww.gangdong.go.kr%2Fweb%2Fmayor%2Fcontents%2Fgdo010_010",
    ),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "profile page unavailable",
    message: "공식 프로필 사진을 불러오지 못했습니다.",
  });
});

test("local council profile photo route rejects oversized streamed profile pages without content-length", async (t) => {
  const originalFetch = globalThis.fetch;
  const fetchCalls: string[] = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    fetchCalls.push(url);

    if (url === "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010") {
      const encoder = new TextEncoder();
      const oversizedChunk = "a".repeat(1_048_577);

      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode("<html><body>"));
            controller.enqueue(encoder.encode(oversizedChunk));
            controller.enqueue(encoder.encode("</body></html>"));
            controller.close();
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        },
      );
    }

    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  const { GET } = loadProfilePhotoRoute();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/profile-photo?pageUrl=https%3A%2F%2Fwww.gangdong.go.kr%2Fweb%2Fmayor%2Fcontents%2Fgdo010_010",
    ),
  );

  assert.deepEqual(fetchCalls, [
    "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010",
  ]);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "profile page unavailable",
    message: "공식 프로필 사진을 불러오지 못했습니다.",
  });
});

test("local council profile photo route rejects redirected image fetches", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url === "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010") {
      return new Response(
        '<html><body><img class="bg_mayor" src="/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025" alt="강동구청장 이수희"></body></html>',
        {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        },
      );
    }

    if (
      url ===
      "https://www.gangdong.go.kr/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025"
    ) {
      return new Response(null, {
        status: 302,
        headers: {
          location: "https://evil.example/profile.png",
        },
      });
    }

    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  const { GET } = loadProfilePhotoRoute();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/profile-photo?pageUrl=https%3A%2F%2Fwww.gangdong.go.kr%2Fweb%2Fmayor%2Fcontents%2Fgdo010_010",
    ),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "profile image unavailable",
    message: "공식 프로필 사진을 불러오지 못했습니다.",
  });
});

test("local council profile photo route follows same-host redirects for canonical page and image URLs", async (t) => {
  const originalFetch = globalThis.fetch;
  const fetchCalls: string[] = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    fetchCalls.push(url);

    if (url === "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010") {
      assert.equal(init?.redirect, "manual");
      return new Response(null, {
        status: 302,
        headers: {
          location: "/web/mayor/contents/gdo010_010?menuId=canonical",
        },
      });
    }

    if (
      url ===
      "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010?menuId=canonical"
    ) {
      return new Response(
        '<html><body><img class="bg_mayor" src="/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025" alt="강동구청장 이수희"></body></html>',
        {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        },
      );
    }

    if (
      url ===
      "https://www.gangdong.go.kr/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025"
    ) {
      return new Response(null, {
        status: 301,
        headers: {
          location: "/design/theme/mayor/new/image/sub/img_mayor_canonical.png?ver=2025",
        },
      });
    }

    if (
      url ===
      "https://www.gangdong.go.kr/design/theme/mayor/new/image/sub/img_mayor_canonical.png?ver=2025"
    ) {
      return new Response(Uint8Array.from([137, 80, 78, 71]), {
        status: 200,
        headers: {
          "content-type": "image/png",
        },
      });
    }

    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  const { GET } = loadProfilePhotoRoute();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/profile-photo?pageUrl=https%3A%2F%2Fwww.gangdong.go.kr%2Fweb%2Fmayor%2Fcontents%2Fgdo010_010",
    ),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(fetchCalls, [
    "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010",
    "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010?menuId=canonical",
    "https://www.gangdong.go.kr/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025",
    "https://www.gangdong.go.kr/design/theme/mayor/new/image/sub/img_mayor_canonical.png?ver=2025",
  ]);
});

test("local council profile photo route allows same-host http-to-https redirects", async (t) => {
  const originalFetch = globalThis.fetch;
  const fetchCalls: string[] = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    fetchCalls.push(url);

    if (url === "http://www.gangdong.go.kr/web/mayor/contents/gdo010_010") {
      assert.equal(init?.redirect, "manual");
      return new Response(null, {
        status: 301,
        headers: {
          location: "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010",
        },
      });
    }

    if (url === "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010") {
      return new Response(
        '<html><body><img class="bg_mayor" src="https://www.gangdong.go.kr/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025" alt="강동구청장 이수희"></body></html>',
        {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        },
      );
    }

    if (
      url ===
      "https://www.gangdong.go.kr/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025"
    ) {
      return new Response(Uint8Array.from([137, 80, 78, 71]), {
        status: 200,
        headers: {
          "content-type": "image/png",
        },
      });
    }

    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  const { GET } = loadProfilePhotoRoute();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/profile-photo?pageUrl=http%3A%2F%2Fwww.gangdong.go.kr%2Fweb%2Fmayor%2Fcontents%2Fgdo010_010",
    ),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(fetchCalls, [
    "http://www.gangdong.go.kr/web/mayor/contents/gdo010_010",
    "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010",
    "https://www.gangdong.go.kr/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025",
  ]);
});

test("local council profile photo route forwards redirect-set cookies across same-host hops", async (t) => {
  const originalFetch = globalThis.fetch;
  const seenCookies: string[] = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    seenCookies.push(new Headers(init?.headers).get("cookie") ?? "");

    if (url === "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010") {
      return new Response(null, {
        status: 302,
        headers: {
          location: "/web/mayor/contents/gdo010_010?menuId=canonical",
          "set-cookie": "redirectSession=abc; Path=/",
        },
      });
    }

    if (
      url ===
      "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010?menuId=canonical"
    ) {
      assert.equal(new Headers(init?.headers).get("cookie"), "redirectSession=abc");
      return new Response(
        '<html><body><img class="bg_mayor" src="/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025" alt="강동구청장 이수희"></body></html>',
        {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        },
      );
    }

    if (
      url ===
      "https://www.gangdong.go.kr/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025"
    ) {
      assert.equal(new Headers(init?.headers).get("cookie"), "redirectSession=abc");
      return new Response(Uint8Array.from([137, 80, 78, 71]), {
        status: 200,
        headers: {
          "content-type": "image/png",
        },
      });
    }

    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  const { GET } = loadProfilePhotoRoute();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/profile-photo?pageUrl=https%3A%2F%2Fwww.gangdong.go.kr%2Fweb%2Fmayor%2Fcontents%2Fgdo010_010",
    ),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(seenCookies, ["", "redirectSession=abc", "redirectSession=abc"]);
});

test("local council profile photo route rejects same-host https-to-http downgrade redirects", async (t) => {
  const originalFetch = globalThis.fetch;
  const fetchCalls: string[] = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    fetchCalls.push(url);

    if (url === "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010") {
      return new Response(null, {
        status: 302,
        headers: {
          location: "http://www.gangdong.go.kr/web/mayor/contents/gdo010_010",
        },
      });
    }

    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  const { GET } = loadProfilePhotoRoute();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/profile-photo?pageUrl=https%3A%2F%2Fwww.gangdong.go.kr%2Fweb%2Fmayor%2Fcontents%2Fgdo010_010",
    ),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(fetchCalls, [
    "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010",
  ]);
  assert.deepEqual(await response.json(), {
    error: "profile page unavailable",
    message: "공식 프로필 사진을 불러오지 못했습니다.",
  });
});

test("local council profile photo route rejects non-image upstream responses after resolving the profile image URL", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url === "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010") {
      return new Response(
        '<html><body><img class="bg_mayor" src="/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025" alt="강동구청장 이수희"></body></html>',
        {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        },
      );
    }

    if (
      url ===
      "https://www.gangdong.go.kr/design/theme/mayor/new/image/sub/img_mayor.png?ver=2025"
    ) {
      return new Response("<html>not an image</html>", {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    }

    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  const { GET } = loadProfilePhotoRoute();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/profile-photo?pageUrl=https%3A%2F%2Fwww.gangdong.go.kr%2Fweb%2Fmayor%2Fcontents%2Fgdo010_010",
    ),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "profile image unavailable",
    message: "공식 프로필 사진을 불러오지 못했습니다.",
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

test("local council resolve route aborts slow backend requests with a route-specific timeout", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalBackendBaseUrl = process.env.WOOGOOK_BACKEND_BASE_URL;
  const originalObservabilityTimeout =
    process.env.WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS;
  let observedSignal: AbortSignal | undefined;

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalBackendBaseUrl === undefined) {
      delete process.env.WOOGOOK_BACKEND_BASE_URL;
    } else {
      process.env.WOOGOOK_BACKEND_BASE_URL = originalBackendBaseUrl;
    }
    if (originalObservabilityTimeout === undefined) {
      delete process.env.WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS;
    } else {
      process.env.WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS =
        originalObservabilityTimeout;
    }
  });

  process.env.WOOGOOK_BACKEND_BASE_URL = "http://backend.test";
  process.env.WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS = "4321";
  globalThis.fetch = ((_, init) => {
    observedSignal = init?.signal;

    return new Promise<Response>((_, reject) => {
      observedSignal?.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    });
  }) as typeof fetch;

  const { GET } = loadResolveRoute();
  const startedAt = Date.now();
  const response = await GET(
    new Request(
      "http://127.0.0.1:3000/api/local-council/v1/resolve?address=서울특별시%20강동구%20천호동%20123",
    ),
  );

  assert.ok(observedSignal instanceof AbortSignal);
  assert.ok(Date.now() - startedAt < 3000);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Local council backend unavailable",
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
