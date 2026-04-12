"use client";

import { CircleHelp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  getPledgeScoreRubricBody,
  PLEDGE_SCORE_RUBRIC_SOURCE_NOTE,
  snapScoreToRubricStep,
} from "@/features/assembly/assemblyPledgeScoreRubric";
import type { PledgeExecutionProgress } from "@/features/assembly/pledgeExecutionProgress";
import {
  getPledgeProgressBadgeStyle,
  PledgeProgressBadge,
} from "@/features/assembly/components/PledgeProgressBadge";
import type { AssemblyPledgeProgressLabel } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/** 0~5 scale display (omit .0 for integers). */
function formatScoreSlash5(score: number): string {
  if (!Number.isFinite(score)) {
    return "";
  }
  const rounded = Math.round(score * 10) / 10;
  if (Number.isInteger(rounded)) {
    return String(Math.trunc(rounded));
  }
  return String(rounded);
}

type HybridProps = {
  progress: AssemblyPledgeProgressLabel;
  score: number;
};

const ARIA_SCORE_HELP = "\uc810\uc218 \uae30\uc900 \uc124\uba85 \uc5f4\uae30";
const ARIA_SCORE_PANEL = "\uacf5\uc57d \uc774\ud589 \uc810\uc218 \uc548\ub0b4";

/**
 * Hybrid badge: read-only pill (progress + score) + CircleHelp button for rubric panel.
 * Panel shows National Assembly rubric text for the snapped score step.
 */
function HybridWithScorePanel({ progress, score }: HybridProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const style = getPledgeProgressBadgeStyle(progress as PledgeExecutionProgress);
  const scoreText = formatScoreSlash5(score);
  const rubricStep = snapScoreToRubricStep(score);
  const rubric = getPledgeScoreRubricBody(rubricStep);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="inline-flex max-w-full flex-wrap items-center gap-1">
      <span
        className="inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
        style={{
          background: style.background,
          color: style.color,
          border: style.border,
        }}
      >
        <span>{progress}</span>
        <span aria-hidden className="mx-0.5 opacity-70">
          {"\u00b7"}
        </span>
        <span className="tabular-nums">{scoreText}/5</span>
      </span>
      <button
        type="button"
        className={cn(
          /* No button border: avoids a second ring around the CircleHelp glyph. */
          "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 outline-none ring-offset-2 transition-[background-color,transform]",
          "hover:bg-black/[0.04] active:scale-[0.96]",
          "focus-visible:ring-2 focus-visible:ring-slate-400",
        )}
        style={{
          background: open ? "var(--surface-alt)" : "transparent",
          color: "var(--text-secondary)",
        }}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={ARIA_SCORE_HELP}
        title={ARIA_SCORE_HELP}
        onClick={() => setOpen((prev) => !prev)}
      >
        <CircleHelp className="size-[18px] shrink-0" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={ARIA_SCORE_PANEL}
          className="absolute left-0 top-[calc(100%+6px)] z-30 w-[min(calc(100vw-2.5rem),20rem)] rounded-lg border p-3 shadow-lg"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <p className="text-[12px] font-semibold leading-snug" style={{ color: "var(--navy)" }}>
            {rubric.headline}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed">{rubric.body}</p>
          <p className="mt-3 border-t pt-2 text-[10px] leading-relaxed opacity-85" style={{ borderColor: "var(--border)" }}>
            {PLEDGE_SCORE_RUBRIC_SOURCE_NOTE}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function PledgeHybridProgressBadge({
  progress,
  score,
}: {
  progress: AssemblyPledgeProgressLabel;
  score?: number | null;
}) {
  const hasScore = typeof score === "number" && Number.isFinite(score);
  if (!hasScore) {
    return <PledgeProgressBadge progress={progress as PledgeExecutionProgress} />;
  }
  return (
    <div className="relative inline-flex max-w-full">
      <HybridWithScorePanel progress={progress} score={score} />
    </div>
  );
}
