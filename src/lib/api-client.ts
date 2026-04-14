import { queryOptions } from "@tanstack/react-query";
import { z, type ZodType } from "zod";

import { CITIES, DISTRICTS, DONGS } from "@/app/data";
import sampleLocalCouncilGangdongResolve from "@/data/samples/sample_local_council_gangdong_resolve.json";
import sampleLocalCouncilGangdongPersonDossiers from "@/data/samples/sample_local_council_gangdong_person_dossiers.json";
import {
  createBrowserCorrelationHeaders,
  reportBrowserError,
  reportClientApiFailure,
} from "@/lib/observability/client";
import {
  ballotResponseSchema,
  ballotsSearchParamsSchema,
  citiesResponseSchema,
  cityQuerySchema,
  citySigunguQuerySchema,
  emdResponseSchema,
  localCouncilDistrictRosterResponseSchema,
  localElectionChatConversationCreateRequestSchema,
  localElectionChatConversationResponseSchema,
  localElectionChatMessageCreateRequestSchema,
  localElectionChatMessageResponseSchema,
  localCouncilPersonDossierResponseSchema,
  localCouncilResolveResponseSchema,
  type LocalCouncilDataSource,
  type LocalCouncilDistrictRosterResponse,
  type LocalCouncilPersonDossierResponse,
  type LocalCouncilResolveResponse,
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

function parseResponseWithSchema<T>(payload: unknown, schema: ZodType<T>): T {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[requestJson] schema parse error", error);
      throw new ApiError(
        502,
        "응답 형식이 예상과 다릅니다. 잠시 후 다시 시도해주세요.",
      );
    }
    throw error;
  }
}

async function requestJson<T>(
  input: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const { headers, correlationId } = createBrowserCorrelationHeaders(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers,
    });
  } catch (error) {
    if (error instanceof Error) {
      void reportClientApiFailure({
        route: input,
        httpMethod: init?.method ?? "GET",
        errorMessage: error.message,
        correlationId,
      });
    }
    throw error;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    void reportClientApiFailure({
      route: input,
      httpMethod: init?.method ?? "GET",
      httpStatus: response.status,
      errorMessage: getErrorMessage(payload, "요청을 처리하지 못했습니다."),
      correlationId,
    });
    throw new ApiError(
      response.status,
      getErrorMessage(payload, "요청을 처리하지 못했습니다."),
    );
  }

  return parseResponseWithSchema(payload, schema);
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
    if (error instanceof Error) {
      void reportBrowserError(error, {
        route: input,
        fallbackMessage,
      });
    }
    console.warn("[regions] 기본 목록으로 대체합니다.", error);
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
  const query = new URLSearchParams({ category });
  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
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
  const limit = params.limit ?? null;
  return queryOptions({
    queryKey: ["assembly", "member", "pledges", monaCd, category, limit],
    queryFn: () =>
      fetchAssemblyMemberPledges({
        monaCd,
        category,
        ...(limit !== null ? { limit } : {}),
      }),
    enabled: monaCd.length > 0 && category.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export type LocalCouncilResult<T> = {
  data: T;
  dataSource: LocalCouncilDataSource;
};

export function mergeLocalCouncilDataSources(
  ...sources: Array<LocalCouncilDataSource | null | undefined>
): LocalCouncilDataSource {
  return sources.every((source) => source === "backend")
    ? "backend"
    : "local_sample";
}

type LocalCouncilAddressSelection = {
  city: string;
  district: string;
  dong?: string;
};

const sampleLocalCouncilPersonDossierIndex = z
  .record(z.string(), localCouncilPersonDossierResponseSchema)
  .parse(sampleLocalCouncilGangdongPersonDossiers);
const sampleLocalCouncilGangdongRoster =
  localCouncilDistrictRosterResponseSchema.parse(sampleLocalCouncilGangdongResolve.roster);

export function buildLocalCouncilAddress({
  city,
  district,
  dong,
}: LocalCouncilAddressSelection) {
  return [city, district, dong].map((part) => part?.trim()).filter(Boolean).join(" ");
}

function isGangdongSelection({ city, district }: LocalCouncilAddressSelection) {
  return city.trim() === "서울특별시" && district.trim() === "강동구";
}

function isGangdongGuCode(guCode: string) {
  return guCode.trim() === "11740";
}

function isBackendUnavailableError(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === 503;
  }
  return error instanceof TypeError;
}

export async function fetchLocalCouncilResolve(
  selection: LocalCouncilAddressSelection,
): Promise<LocalCouncilResult<LocalCouncilResolveResponse>> {
  const address = buildLocalCouncilAddress(selection);
  const query = new URLSearchParams({ address });

  try {
    const data = await fetchJson(
      `/api/local-council/v1/resolve?${query.toString()}`,
      localCouncilResolveResponseSchema,
    );
    return { data, dataSource: "backend" };
  } catch (error) {
    if (isBackendUnavailableError(error) && isGangdongSelection(selection)) {
      return {
        data: localCouncilResolveResponseSchema.parse(sampleLocalCouncilGangdongResolve),
        dataSource: "local_sample",
      };
    }

    if (isBackendUnavailableError(error)) {
      throw new ApiError(
        503,
        "현재 로컬 미리보기는 서울특별시 강동구만 준비되어 있습니다.",
      );
    }

    throw error;
  }
}

export async function fetchLocalCouncilRoster(
  guCode: string,
): Promise<LocalCouncilResult<LocalCouncilDistrictRosterResponse>> {
  try {
    const data = await fetchJson(
      `/api/local-council/v1/districts/${encodeURIComponent(guCode)}/roster`,
      localCouncilDistrictRosterResponseSchema,
    );
    return { data, dataSource: "backend" };
  } catch (error) {
    if (isBackendUnavailableError(error) && isGangdongGuCode(guCode)) {
      return {
        data: sampleLocalCouncilGangdongRoster,
        dataSource: "local_sample",
      };
    }

    if (isBackendUnavailableError(error)) {
      throw new ApiError(
        503,
        "현재 로컬 미리보기는 서울특별시 강동구만 준비되어 있습니다.",
      );
    }

    throw error;
  }
}

export async function fetchLocalCouncilPerson(
  personKey: string,
): Promise<LocalCouncilResult<LocalCouncilPersonDossierResponse>> {
  try {
    const data = await fetchJson(
      `/api/local-council/v1/persons/${encodeURIComponent(personKey)}`,
      localCouncilPersonDossierResponseSchema,
    );
    return { data, dataSource: "backend" };
  } catch (error) {
    const sample = sampleLocalCouncilPersonDossierIndex[personKey];
    if (isBackendUnavailableError(error) && sample) {
      return {
        data: sample,
        dataSource: "local_sample",
      };
    }
    throw error;
  }
}

export function localCouncilResolveQueryOptions(selection: LocalCouncilAddressSelection) {
  return queryOptions({
    queryKey: [
      "local-council",
      "resolve",
      selection.city,
      selection.district,
      selection.dong ?? "",
    ],
    queryFn: () => fetchLocalCouncilResolve(selection),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export function localCouncilPersonQueryOptions(personKey: string) {
  return queryOptions({
    queryKey: ["local-council", "person", personKey],
    queryFn: () => fetchLocalCouncilPerson(personKey),
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
