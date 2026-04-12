import type { PledgeExecutionProgress } from "@/features/assembly/pledgeExecutionProgress";

const BADGE_STYLE: Record<
  PledgeExecutionProgress,
  { background: string; color: string; border: string }
> = {
  완료: {
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
  판단불가: {
    background: "var(--surface-alt)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
  },
};

export function PledgeProgressBadge({ progress }: { progress: PledgeExecutionProgress }) {
  const s = BADGE_STYLE[progress];
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
