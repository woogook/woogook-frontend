export const REGION_FALLBACK_CITIES = [
  "서울특별시",
  "제주특별자치도",
] as const;

export const REGION_FALLBACK_SIGUNGU: Record<string, string[]> = {
  서울특별시: [
    "종로구",
    "중구",
    "용산구",
    "성동구",
    "광진구",
    "동대문구",
    "중랑구",
    "성북구",
    "강북구",
    "도봉구",
    "노원구",
    "은평구",
    "서대문구",
    "마포구",
    "양천구",
    "강서구",
    "구로구",
    "금천구",
    "영등포구",
    "동작구",
    "관악구",
    "서초구",
    "강남구",
    "송파구",
    "강동구",
  ],
  제주특별자치도: ["제주시", "서귀포시"],
};

export const REGION_FALLBACK_EMD: Record<string, string[]> = {
  강남구: [
    "개포1동",
    "개포2동",
    "역삼동",
    "삼성동",
    "대치동",
    "청담동",
    "논현동",
    "압구정동",
    "신사동",
  ],
  강동구: ["천호동"],
  제주시: ["노형동", "연동", "아라동", "오라동", "이도동", "일도동", "이호동"],
};

export function getFallbackRegionItems(
  key: "cities" | "sigungu" | "emd",
  options?: {
    city?: string;
    sigungu?: string;
  },
) {
  if (key === "cities") {
    return [...REGION_FALLBACK_CITIES];
  }

  if (key === "sigungu") {
    return options?.city ? [...(REGION_FALLBACK_SIGUNGU[options.city] ?? [])] : [];
  }

  return options?.sigungu ? [...(REGION_FALLBACK_EMD[options.sigungu] ?? [])] : [];
}

export function buildRegionFallbackMessage(message: string, hasFallbackItems: boolean) {
  if (!hasFallbackItems) {
    return message;
  }

  return `${message} 일부 기본 지역 목록으로 계속 진행합니다.`;
}
