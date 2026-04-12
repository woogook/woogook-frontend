/**
 * 공약 이행 진행도 — UI 뱃지·필터용.
 * API 스키마와 맞출 때 이름·값만 동기화하면 됩니다.
 */
export const PLEDGE_EXECUTION_PROGRESS = [
  "미착수",
  "진행중",
  "완료",
  "판단불가",
] as const;

export type PledgeExecutionProgress = (typeof PLEDGE_EXECUTION_PROGRESS)[number];
