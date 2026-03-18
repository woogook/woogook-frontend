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
  sigunguResponseSchema,
  type BallotsSearchParams,
} from "@/lib/schemas";

type RegionQueryResult = {
  items: string[];
  fallbackMessage?: string;
};

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

async function fetchJson<T>(input: string, schema: ZodType<T>): Promise<T> {
  const response = await fetch(input, {
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "요청을 처리하지 못했습니다."));
  }

  return schema.parse(payload);
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
