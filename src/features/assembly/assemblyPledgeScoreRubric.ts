import rubricJson from "./assemblyPledgeScoreRubric.json";

type RubricEntry = { headline: string; body: string };

export type PledgeRubricStep =
  | 0
  | 0.5
  | 1
  | 1.5
  | 2
  | 2.5
  | 3
  | 3.5
  | 4
  | 4.5
  | 5;

const raw = rubricJson as Record<string, RubricEntry | string>;

export const PLEDGE_SCORE_RUBRIC_SOURCE_NOTE = raw.sourceNote as string;

function rubricKey(step: PledgeRubricStep): string {
  if (step === 0.5) {
    return "0.5";
  }
  if (step === 4.5) {
    return "4.5";
  }
  if (step === 3.5) {
    return "3.5";
  }
  if (step === 2.5) {
    return "2.5";
  }
  if (step === 1.5) {
    return "1.5";
  }
  return String(step);
}

/** Snap score to nearest 0.5 in [0, 5]. */
export function snapScoreToRubricStep(score: number): PledgeRubricStep {
  const clamped = Math.min(5, Math.max(0, Math.round(score * 2) / 2));
  return clamped as PledgeRubricStep;
}

/** Headline + body for tooltip panel. */
export function getPledgeScoreRubricBody(step: PledgeRubricStep): RubricEntry {
  const entry = raw[rubricKey(step)];
  if (typeof entry === "object" && entry !== null && "headline" in entry) {
    return entry as RubricEntry;
  }
  return {
    headline: `${String(step)}\uC810`,
    body: "\ud3c9\uac00 \uae30\uc900 \uc815\ubcf4\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.",
  };
}
