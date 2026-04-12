import type { PledgeExecutionProgress } from "@/features/assembly/pledgeExecutionProgress";

/** 하이브리드 배지 등에서 동일 톤 재사용 */
export const PLEDGE_PROGRESS_BADGE_STYLE: Record<
  PledgeExecutionProgress,
  { background: string; color: string; border: string }
> = {
  완료단계: {
    background: "#ecfdf5",
    color: "#047857",
    border: "1px solid #6ee7b7",
  },
  진행중: {
    background: "var(--amber-bg)",
    color: "var(--amber)",
    border: "1px solid var(--amber-light)",
  },
  미착수: {
    background: "var(--surface-alt)",
    color: "var(--text-tertiary)",
    border: "1px solid var(--border)",
  },
  /** 중립·주의 톤: 본문 제목과 구분되면서도 과한 경고색은 피함 */
  판단불가: {
    background: "#f3f4f6",
    color: "#4b5563",
    border: "1px solid #e5e7eb",
  },
};

/**
 * 이행률 막대·범례 점 채움색.
 * 배지와 같은 의미 색상을 쓰되, 막대에서는 배경색보다 진한 강조색을 사용해 시인성을 확보한다.
 */
export const PLEDGE_PROGRESS_BAR_SEGMENT_BACKGROUND: Record<PledgeExecutionProgress, string> = {
  완료단계: "#5f9f83",
  진행중: "#d4a843",
  미착수: "#c9c5bc",
  판단불가: "#a8b0bd",
};

export function getPledgeProgressBadgeStyle(
  progress: PledgeExecutionProgress,
): { background: string; color: string; border: string } {
  return PLEDGE_PROGRESS_BADGE_STYLE[progress];
}

export function PledgeProgressBadge({ progress }: { progress: PledgeExecutionProgress }) {
  const s = getPledgeProgressBadgeStyle(progress);
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
      style={{
        background: s.background,
        color: s.color,
        border: s.border,
      }}
    >
      {progress}
    </span>
  );
}
