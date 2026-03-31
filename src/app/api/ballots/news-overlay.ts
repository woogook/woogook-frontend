import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { CandidateIssueMatch, CandidateRecord, EvidenceStatus, IssueKey } from "@/lib/schemas";

export type CandidateNewsOverlay = {
  evidence_status: EvidenceStatus;
  summary_text: string | null;
  info_gap_flags: string[];
  issue_matches: CandidateIssueMatch[];
};

type ChatContextBundle = {
  brief?: {
    summary_text?: string;
    bullet_points?: string[];
    claim_count?: number;
    info_gaps?: string[];
  };
  issue_matches?: Array<{
    issue_key?: IssueKey;
    bucket?: "direct" | "weak" | "generic";
    citation_label?: string;
  }>;
};

type CandidateLookup = Pick<CandidateRecord, "candidate_id" | "contest_id">;

function bucketToLevel(
  bucket: "direct" | "weak" | "generic" | undefined,
): CandidateIssueMatch["level"] {
  if (bucket === "direct") return "high";
  if (bucket === "weak") return "partial";
  return "insufficient";
}

function buildIssueMatches(
  rawMatches: ChatContextBundle["issue_matches"],
): CandidateIssueMatch[] {
  const grouped = new Map<
    IssueKey,
    { level: CandidateIssueMatch["level"]; reasons: string[]; matched_keywords: string[] }
  >();

  for (const match of rawMatches ?? []) {
    if (!match.issue_key) continue;
    const current = grouped.get(match.issue_key);
    const nextLevel = bucketToLevel(match.bucket);
    const reasons = match.citation_label
      ? [`${match.citation_label}에서 관련 신호가 확인됩니다.`]
      : ["후보 뉴스 번들에서 관련 신호가 확인됩니다."];

    if (!current) {
      grouped.set(match.issue_key, {
        level: nextLevel,
        reasons,
        matched_keywords: [],
      });
      continue;
    }

    const levelOrder: Record<CandidateIssueMatch["level"], number> = {
      insufficient: 0,
      partial: 1,
      high: 2,
      very_high: 3,
    };
    current.level =
      levelOrder[nextLevel] > levelOrder[current.level] ? nextLevel : current.level;
    for (const reason of reasons) {
      if (!current.reasons.includes(reason)) current.reasons.push(reason);
    }
  }

  return Array.from(grouped.entries()).map(([issueKey, item]) => ({
    issue_key: issueKey,
    level: item.level,
    reasons: item.reasons,
    matched_keywords: item.matched_keywords,
  }));
}

function resolveEvidenceStatus(bundle: ChatContextBundle): EvidenceStatus {
  const issueMatches = bundle.issue_matches ?? [];
  if (issueMatches.some((item) => item.bucket === "direct")) {
    return "enough";
  }
  if ((bundle.brief?.claim_count ?? 0) > 0 || issueMatches.length > 0) {
    return "limited";
  }
  return "missing";
}

async function loadCandidateNewsOverlay(
  candidate: CandidateLookup,
): Promise<CandidateNewsOverlay | null> {
  const candidateRoot = path.resolve(
    process.cwd(),
    "../woogook-backend/뉴스/output/artifacts/entity/news/local_election_candidate",
    candidate.contest_id,
    candidate.candidate_id,
  );

  try {
    const runDirs = (await readdir(candidateRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const latestRun = runDirs.at(-1);
    if (!latestRun) {
      return null;
    }

    const chatProjection = path.join(
      candidateRoot,
      latestRun,
      "projections/chat/chat_context_bundle.json",
    );
    const raw = await readFile(chatProjection, "utf-8");
    const bundle = JSON.parse(raw) as ChatContextBundle;
    return {
      evidence_status: resolveEvidenceStatus(bundle),
      summary_text:
        bundle.brief?.summary_text ||
        bundle.brief?.bullet_points?.find((item) => item.trim().length > 0) ||
        null,
      info_gap_flags: bundle.brief?.info_gaps ?? [],
      issue_matches: buildIssueMatches(bundle.issue_matches),
    };
  } catch {
    return null;
  }
}

export async function loadCandidateNewsOverlayIndex(
  candidates: CandidateLookup[],
): Promise<Map<string, CandidateNewsOverlay>> {
  const entries = await Promise.all(
    candidates.map(async (candidate) => [
      candidate.candidate_id,
      await loadCandidateNewsOverlay(candidate),
    ] as const),
  );

  return new Map(
    entries.filter((entry): entry is [string, CandidateNewsOverlay] => entry[1] !== null),
  );
}

export type CandidateRecordWithNewsOverlay = CandidateRecord & {
  news_overlay?: CandidateNewsOverlay | null;
};
