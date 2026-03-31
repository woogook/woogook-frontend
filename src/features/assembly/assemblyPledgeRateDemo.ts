import { ASSEMBLY_PLEDGE_CATEGORY_LABELS } from "@/features/assembly/pledgeCategories";

/**
 * 이행률 요약 화면용 데모 퍼센트(정수). API 연동 후 삭제·대체.
 * `routing_llm_gate` 정책 카테고리 순서와 `ASSEMBLY_PLEDGE_CATEGORY_LABELS` 일치.
 */
export const ASSEMBLY_CATEGORY_RATE_PERCENT_MOCK: Record<
  (typeof ASSEMBLY_PLEDGE_CATEGORY_LABELS)[number],
  number
> = {
  "경제·산업·재정": 58,
  "노동·일자리·기업활력": 44,
  "복지·보건·돌봄·인구": 63,
  "교육·인재·과학기술·디지털·문화": 52,
  "주거·국토·교통·지역균형": 68,
  "환경·에너지·기후": 41,
  "농림축산·수산·식품": 36,
  "거버넌스·권리·안전·외교안보": 56,
};

/** 카테고리 산술평균을 반올림한 전체 이행률(데모). */
export function assemblyOverallRatePercentMock(): number {
  const labels = ASSEMBLY_PLEDGE_CATEGORY_LABELS;
  const sum = labels.reduce((acc, key) => acc + ASSEMBLY_CATEGORY_RATE_PERCENT_MOCK[key], 0);
  return Math.round(sum / labels.length);
}
