import { queryOptions } from "@tanstack/react-query";
import type { ZodType } from "zod";

import { CITIES, DISTRICTS, DONGS } from "@/app/data";
import {
  ballotResponseSchema,
  ballotsSearchParamsSchema,
  citiesResponseSchema,
  cityQuerySchema,
  citySigunguQuerySchema,
  emdResponseSchema,
  localElectionChatConversationCreateRequestSchema,
  localElectionChatConversationResponseSchema,
  localElectionChatMessageCreateRequestSchema,
  localElectionChatMessageResponseSchema,
  sigunguResponseSchema,
  assemblyMemberListResponseSchema,
  assemblyMemberMetaCardSchema,
  assemblyPledgeListResponseSchema,
  assemblyPledgeSummaryResponseSchema,
  type AssemblyMemberListResponse,
  type AssemblyMemberMetaCard,
  type AssemblyPledgeListResponse,
  type AssemblyPledgeSummaryResponse,
  type BallotsSearchParams,
  type LocalElectionChatConversationCreateRequest,
  type LocalElectionChatMessageCreateRequest,
} from "@/lib/schemas";

type RegionQueryResult = {
  items: string[];
  fallbackMessage?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallback;
}

async function requestJson<T>(
  input: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload, "요청을 처리하지 못했습니다."),
    );
  }

  return schema.parse(payload);
}

async function fetchJson<T>(input: string, schema: ZodType<T>): Promise<T> {
  return requestJson(input, schema);
}

async function fetchRegionQuery<T extends Record<K, string[]>, K extends string>(
  input: string,
  schema: ZodType<T>,
  key: K,
  fallback: string[],
  fallbackMessage: string,
) {
  try {
    const payload = await fetchJson(input, schema);
    return {
      items: payload[key],
    } satisfies RegionQueryResult;
  } catch (error) {
    console.error(error);
    return {
      items: [...fallback],
      fallbackMessage: error instanceof Error ? error.message : fallbackMessage,
    } satisfies RegionQueryResult;
  }
}

export const citiesQueryOptions = queryOptions({
  queryKey: ["regions", "cities"],
  queryFn: () =>
    fetchRegionQuery(
      "/api/regions/cities",
      citiesResponseSchema,
      "cities",
      [...CITIES],
      "지역 목록을 불러오지 못해 기본 목록을 사용합니다.",
    ),
  staleTime: 24 * 60 * 60 * 1000,
});

export function sigunguQueryOptions(city: string) {
  return queryOptions({
    queryKey: ["regions", "sigungu", city],
    queryFn: () => {
      const parsed = cityQuerySchema.parse({ city });
      return (
        fetchRegionQuery(
          `/api/regions/sigungu?city=${encodeURIComponent(parsed.city)}`,
          sigunguResponseSchema,
          "sigungu",
          DISTRICTS[parsed.city] || [],
          "구/군 목록을 불러오지 못해 기본 목록을 사용합니다.",
        )
      );
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function emdQueryOptions(city: string, sigungu: string) {
  return queryOptions({
    queryKey: ["regions", "emd", city, sigungu],
    queryFn: () => {
      const parsed = citySigunguQuerySchema.parse({ city, sigungu });
      return (
        fetchRegionQuery(
          `/api/regions/emd?city=${encodeURIComponent(parsed.city)}&sigungu=${encodeURIComponent(parsed.sigungu)}`,
          emdResponseSchema,
          "emd",
          DONGS[parsed.sigungu] || [],
          "동 목록을 불러오지 못해 기본 목록을 사용합니다.",
        )
      );
    },
    staleTime: 60 * 60 * 1000,
  });
}

export async function fetchBallots(params: BallotsSearchParams) {
  const parsed = ballotsSearchParamsSchema.parse(params);
  const query = new URLSearchParams({
    city: parsed.city,
    sigungu: parsed.sigungu,
  });

  if (parsed.emd) {
    query.set("emd", parsed.emd);
  }

  return fetchJson(`/api/ballots?${query.toString()}`, ballotResponseSchema);
}

export function ballotsQueryOptions(params: BallotsSearchParams) {
  const parsed = ballotsSearchParamsSchema.parse(params);

  return queryOptions({
    queryKey: ["ballots", parsed.city, parsed.sigungu, parsed.emd ?? ""],
    queryFn: () => fetchBallots(parsed),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

/**
 * 국회 공약 기준 의원 목록 (GET api/assembly/v1/members)
 * 브라우저는 동일 출처 Next 라우트만 호출하고 , route.ts 가 백엔드로 프록시한다. 
 */
export async function fetchAssemblyMembers(
  region: string,
  district: string,
): Promise<AssemblyMemberListResponse> {
  const query = new URLSearchParams({
    region: region.trim(),
    district: district.trim(),
  });
  return fetchJson(
    `/api/assembly/v1/members?${query.toString()}`,
    assemblyMemberListResponseSchema,
  );
}

/**
 * 구/군/시 선택 후 의원 목록을 불러올 때 사용하는 React Query 옵션.
 * district 가 비어 있으면 요청하지 않음(enabled) - 구 선택 전에는 호출 되지 않게  
 */
export function assemblyMembersQueryOptions(region: string, district: string) {
  const trimmedDistrict = district.trim();
  return queryOptions({
    queryKey: ["assembly", "members", region, trimmedDistrict],
    queryFn: () => fetchAssemblyMembers(region, trimmedDistrict),
    enabled: trimmedDistrict.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

/**
 * 국회 의원 메타 카드 (GET …/members/{mona_cd}/card) — assembly_member 한 행.
 */
export async function fetchAssemblyMemberMetaCard(
  monaCd: string,
): Promise<AssemblyMemberMetaCard> {
  const trimmed = monaCd.trim();
  return fetchJson(
    `/api/assembly/v1/members/${encodeURIComponent(trimmed)}/card`,
    assemblyMemberMetaCardSchema,
  );
}

export function assemblyMemberMetaCardQueryOptions(monaCd: string) {
  const trimmed = monaCd.trim();
  return queryOptions({
    queryKey: ["assembly", "member", "card", trimmed],
    queryFn: () => fetchAssemblyMemberMetaCard(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export async function fetchAssemblyPledgeSummary(
  monaCd: string,
): Promise<AssemblyPledgeSummaryResponse> {
  const trimmed = monaCd.trim();
  return fetchJson(
    `/api/assembly/v1/members/${encodeURIComponent(trimmed)}/pledge-summary`,
    assemblyPledgeSummaryResponseSchema,
  );
}

export function assemblyPledgeSummaryQueryOptions(monaCd: string) {
  const trimmed = monaCd.trim();
  return queryOptions({
    queryKey: ["assembly", "member", "pledge-summary", trimmed],
    queryFn: () => fetchAssemblyPledgeSummary(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export async function fetchAssemblyMemberPledges(params: {
  monaCd: string;
  category: string;
  limit?: number;
}): Promise<AssemblyPledgeListResponse> {
  const monaCd = params.monaCd.trim();
  const category = params.category.trim();
  const query = new URLSearchParams({
    category,
    limit: String(params.limit ?? 5),
  });
  return fetchJson(
    `/api/assembly/v1/members/${encodeURIComponent(monaCd)}/pledges?${query.toString()}`,
    assemblyPledgeListResponseSchema,
  );
}

export function assemblyMemberPledgesQueryOptions(params: {
  monaCd: string;
  category: string;
  limit?: number;
}) {
  const monaCd = params.monaCd.trim();
  const category = params.category.trim();
  const limit = params.limit ?? 5;
  return queryOptions({
    queryKey: ["assembly", "member", "pledges", monaCd, category, limit],
    queryFn: () => fetchAssemblyMemberPledges({ monaCd, category, limit }),
    enabled: monaCd.length > 0 && category.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export async function createLocalElectionChatConversation(
  request: LocalElectionChatConversationCreateRequest,
) {
  const payload = localElectionChatConversationCreateRequestSchema.parse(request);
  return requestJson(
    "/api/local-election/v1/chat/conversations",
    localElectionChatConversationResponseSchema,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getLocalElectionChatConversation(params: {
  conversationId: string;
  clientSessionId: string;
}) {
  const query = new URLSearchParams({
    client_session_id: params.clientSessionId,
  });

  return requestJson(
    `/api/local-election/v1/chat/conversations/${encodeURIComponent(params.conversationId)}?${query.toString()}`,
    localElectionChatConversationResponseSchema,
  );
}

export async function sendLocalElectionChatMessage(params: {
  conversationId: string;
  request: LocalElectionChatMessageCreateRequest;
}) {
  const payload = localElectionChatMessageCreateRequestSchema.parse(params.request);

  return requestJson(
    `/api/local-election/v1/chat/conversations/${encodeURIComponent(params.conversationId)}/messages`,
    localElectionChatMessageResponseSchema,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
