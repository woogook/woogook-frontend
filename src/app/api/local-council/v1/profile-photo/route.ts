import { NextResponse } from "next/server";

import { observeRoute } from "@/lib/observability/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_HOST_SUFFIXES = [".go.kr", ".or.kr"] as const;
const PROFILE_PAGE_FETCH_TIMEOUT_MS = 8_000;
const MAX_PROFILE_PAGE_BYTES = 1_048_576;
const MAX_PROFILE_PAGE_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const ALLOWED_REDIRECT_PROTOCOLS = new Set(["http:", "https:"]);

type SameHostRedirectResult = {
  response: Response;
  finalUrl: URL;
  cookieHeader: string | null;
};

function buildTimeoutSignal() {
  return AbortSignal.timeout(PROFILE_PAGE_FETCH_TIMEOUT_MS);
}

function isHtmlResponse(headers: Headers) {
  const contentType = headers.get("content-type")?.toLowerCase() ?? "";
  return (
    contentType.includes("text/html") ||
    contentType.includes("application/xhtml+xml")
  );
}

function isOversizedHtmlResponse(headers: Headers) {
  const rawContentLength = headers.get("content-length");
  if (!rawContentLength) {
    return false;
  }

  const contentLength = Number.parseInt(rawContentLength, 10);
  return Number.isFinite(contentLength) && contentLength > MAX_PROFILE_PAGE_BYTES;
}

function isImageResponse(headers: Headers) {
  const contentType = headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.startsWith("image/");
}

function isAllowedRedirectProtocol(protocol: string) {
  return ALLOWED_REDIRECT_PROTOCOLS.has(protocol);
}

function parseAllowedPageUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const isAllowedHost = ALLOWED_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
    );

    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      !isAllowedHost
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function splitSetCookieHeader(value: string) {
  return value
    .split(/,(?=\s*[^;,=\s]+=[^;]+)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getCookieHeader(headers: Headers) {
  const getSetCookie = (headers as Headers & {
    getSetCookie?: () => string[];
  }).getSetCookie;
  const cookieParts =
    typeof getSetCookie === "function"
      ? getSetCookie
          .call(headers)
          .flatMap((cookieValue) => splitSetCookieHeader(cookieValue))
      : splitSetCookieHeader(headers.get("set-cookie") ?? "");

  const cookies = cookieParts
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter((cookie): cookie is string => Boolean(cookie));

  return cookies.length > 0 ? cookies.join("; ") : null;
}

function getRequestCookieHeader(headersInit: HeadersInit | undefined) {
  if (!headersInit) {
    return null;
  }
  return new Headers(headersInit).get("cookie")?.trim() || null;
}

function mergeCookieHeaders(
  existingCookieHeader: string | null,
  nextCookieHeader: string | null,
) {
  const mergedCookies = new Map<string, string>();

  for (const cookieHeader of [existingCookieHeader, nextCookieHeader]) {
    if (!cookieHeader) {
      continue;
    }
    for (const part of cookieHeader.split(";")) {
      const trimmedPart = part.trim();
      if (!trimmedPart) {
        continue;
      }
      const separatorIndex = trimmedPart.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      const name = trimmedPart.slice(0, separatorIndex).trim();
      const value = trimmedPart.slice(separatorIndex + 1).trim();
      if (!name) {
        continue;
      }
      mergedCookies.set(name, value);
    }
  }

  if (mergedCookies.size <= 0) {
    return null;
  }

  return Array.from(mergedCookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function resolveSameHostRedirectUrl(currentUrl: URL, response: Response) {
  const location = response.headers.get("location");
  if (!location) {
    return null;
  }

  try {
    const nextUrl = new URL(location, currentUrl);
    if (
      nextUrl.hostname.toLowerCase() !== currentUrl.hostname.toLowerCase() ||
      !isAllowedRedirectProtocol(currentUrl.protocol) ||
      !isAllowedRedirectProtocol(nextUrl.protocol) ||
      (currentUrl.protocol === "https:" && nextUrl.protocol !== "https:")
    ) {
      return null;
    }
    return nextUrl;
  } catch {
    return null;
  }
}

async function fetchWithSameHostRedirects(
  inputUrl: URL,
  init: Omit<RequestInit, "redirect" | "signal">,
): Promise<SameHostRedirectResult> {
  let currentUrl = inputUrl;
  let cookieHeader = getRequestCookieHeader(init.headers);

  for (let redirectCount = 0; redirectCount <= MAX_PROFILE_PAGE_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      ...init,
      headers: cookieHeader ? { ...init.headers, cookie: cookieHeader } : init.headers,
      redirect: "manual",
      signal: buildTimeoutSignal(),
    });
    cookieHeader = mergeCookieHeaders(cookieHeader, getCookieHeader(response.headers));

    if (!REDIRECT_STATUSES.has(response.status)) {
      return {
        response,
        finalUrl: currentUrl,
        cookieHeader,
      };
    }

    const redirectedUrl = resolveSameHostRedirectUrl(currentUrl, response);
    if (!redirectedUrl) {
      return {
        response,
        finalUrl: currentUrl,
        cookieHeader,
      };
    }
    currentUrl = redirectedUrl;
  }

  return {
    response: new Response(null, { status: 508 }),
    finalUrl: currentUrl,
    cookieHeader,
  };
}

async function readHtmlResponseWithLimit(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }

      totalBytes += value.byteLength;
      if (totalBytes > MAX_PROFILE_PAGE_BYTES) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(combined);
}

function extractImageUrlFromHtml(html: string, pageUrl: URL) {
  const patterns = [
    /<img[^>]+class="[^"]*\bbg_mayor\b[^"]*"[^>]+src="([^"]+)"/i,
    /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i,
    /<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i,
    /<link[^>]+rel="image_src"[^>]+href="([^"]+)"/i,
    /<img[^>]+src="([^"]+)"/i,
  ];

  for (const pattern of patterns) {
    const matched = html.match(pattern)?.[1]?.trim();
    if (!matched) {
      continue;
    }

    try {
      const resolved = new URL(matched, pageUrl);
      if (resolved.hostname.toLowerCase() !== pageUrl.hostname.toLowerCase()) {
        continue;
      }
      if (pageUrl.protocol === "https:" && resolved.protocol !== "https:") {
        continue;
      }

      return resolved;
    } catch {
      continue;
    }
  }

  return null;
}

export async function GET(request: Request) {
  return observeRoute(request, "local-council/v1/profile-photo", async () => {
    const requestUrl = new URL(request.url);
    const pageUrl = parseAllowedPageUrl(requestUrl.searchParams.get("pageUrl")?.trim() ?? null);

    if (!pageUrl) {
      return NextResponse.json(
        {
          error: "pageUrl is required",
          message: "공식 프로필 페이지 주소가 필요합니다.",
        },
        { status: 400 },
      );
    }

    try {
      const pageResult = await fetchWithSameHostRedirects(pageUrl, {
        cache: "no-store",
      });
      const pageResponse = pageResult.response;

      if (!pageResponse.ok) {
        return NextResponse.json(
          {
            error: "profile page unavailable",
            message: "공식 프로필 사진을 불러오지 못했습니다.",
          },
          { status: 502 },
        );
      }
      if (!isHtmlResponse(pageResponse.headers) || isOversizedHtmlResponse(pageResponse.headers)) {
        return NextResponse.json(
          {
            error: "profile page unavailable",
            message: "공식 프로필 사진을 불러오지 못했습니다.",
          },
          { status: 502 },
        );
      }

      const html = await readHtmlResponseWithLimit(pageResponse);
      if (html === null) {
        return NextResponse.json(
          {
            error: "profile page unavailable",
            message: "공식 프로필 사진을 불러오지 못했습니다.",
          },
          { status: 502 },
        );
      }

      const imageUrl = extractImageUrlFromHtml(html, pageResult.finalUrl);

      if (!imageUrl) {
        return NextResponse.json(
          {
            error: "profile image unavailable",
            message: "공식 프로필 사진을 찾지 못했습니다.",
          },
          { status: 404 },
        );
      }

      const imageResult = await fetchWithSameHostRedirects(imageUrl, {
        cache: "no-store",
        headers: pageResult.cookieHeader
          ? { cookie: pageResult.cookieHeader }
          : undefined,
      });
      const imageResponse = imageResult.response;

      if (!imageResponse.ok || !imageResponse.body || !isImageResponse(imageResponse.headers)) {
        return NextResponse.json(
          {
            error: "profile image unavailable",
            message: "공식 프로필 사진을 불러오지 못했습니다.",
          },
          { status: 502 },
        );
      }

      return new Response(imageResponse.body, {
        status: 200,
        headers: {
          "cache-control": "public, max-age=3600",
          "content-type":
            imageResponse.headers.get("content-type") ?? "image/png",
        },
      });
    } catch {
      return NextResponse.json(
        {
          error: "profile image unavailable",
          message: "공식 프로필 사진을 불러오지 못했습니다.",
        },
        { status: 502 },
      );
    }
  });
}
