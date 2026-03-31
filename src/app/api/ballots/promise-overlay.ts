import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { getActiveLocalElectionElectionId } from "@/lib/local-election-config";
import type {
  CandidateIssueMatch,
  CandidateRecord,
  IssueKey,
  PromiseSourceStatus,
} from "@/lib/schemas";

export type CandidatePromiseOverlay = {
  promise_item_count: number;
  representative_title: string | null;
  issue_keys: IssueKey[];
  source_label: string | null;
  source_url: string | null;
  promise_source_status: PromiseSourceStatus;
  issue_matches: CandidateIssueMatch[];
};

type PromiseItemRecord = {
  election_id: string;
  candidate_id: string;
  title: string;
  issue_keys?: IssueKey[];
  keywords?: string[];
  source_label?: string | null;
  source_url?: string | null;
};

const ISSUE_LABELS: Record<IssueKey, string> = {
  transport: "교통",
  housing: "주거",
  education: "교육",
  care: "돌봄",
  jobs: "일자리",
  safety: "안전",
  climate: "환경·기후",
  welfare: "복지",
  youth: "청년",
  commerce: "상권",
};

let overlayCache:
  | {
      path: string;
      mtimeMs: number;
      electionId: string;
      index: Map<string, CandidatePromiseOverlay>;
    }
  | null = null;

function resolvePromiseCatalogPath(): string | null {
  if (getActiveLocalElectionElectionId() !== "0020220601") {
    return null;
  }
  return path.resolve(
    process.cwd(),
    "../woogook-backend/지방선거/data/회차별/2022-8회/공약/local_election_promises_2022.jsonl",
  );
}

function buildIssueMatches(
  issueEntries: Map<IssueKey, { titles: string[]; keywords: string[] }>,
): CandidateIssueMatch[] {
  return Array.from(issueEntries.entries()).map(([issueKey, entry]) => {
    const uniqueTitles = Array.from(new Set(entry.titles.filter(Boolean)));
    const uniqueKeywords = Array.from(new Set(entry.keywords.filter(Boolean)));
    return {
      issue_key: issueKey,
      level: "high",
      reasons: [
        `공약 자료에서 ${ISSUE_LABELS[issueKey]} 관련 공약 ${uniqueTitles.length}건이 확인됩니다.`,
        uniqueTitles[0] ? `대표 공약: ${uniqueTitles[0]}` : "대표 공약 문구는 추가 확인이 필요합니다.",
      ],
      matched_keywords: uniqueKeywords.slice(0, 4),
    };
  });
}

function buildOverlayIndex(
  lines: string,
  electionId: string,
): Map<string, CandidatePromiseOverlay> {
  const grouped = new Map<
    string,
    {
      titles: string[];
      issue_keys: IssueKey[];
      source_label: string | null;
      source_url: string | null;
      is_mock: boolean;
      issue_entries: Map<IssueKey, { titles: string[]; keywords: string[] }>;
    }
  >();

  for (const line of lines.split(/\r?\n/)) {
    const stripped = line.trim();
    if (!stripped) continue;
    const item = JSON.parse(stripped) as PromiseItemRecord;
    if (item.election_id !== electionId || !item.candidate_id) continue;

    const current = grouped.get(item.candidate_id) ?? {
      titles: [],
      issue_keys: [],
      source_label: null,
      source_url: null,
      is_mock: false,
      issue_entries: new Map<IssueKey, { titles: string[]; keywords: string[] }>(),
    };

    current.titles.push(item.title);
    for (const issueKey of item.issue_keys ?? []) {
      if (!current.issue_keys.includes(issueKey)) {
        current.issue_keys.push(issueKey);
      }
      const issueEntry = current.issue_entries.get(issueKey) ?? {
        titles: [],
        keywords: [],
      };
      issueEntry.titles.push(item.title);
      issueEntry.keywords.push(...(item.keywords ?? []));
      current.issue_entries.set(issueKey, issueEntry);
    }

    if (!current.source_label && item.source_label) {
      current.source_label = item.source_label;
    }
    if (!current.source_url && item.source_url) {
      current.source_url = item.source_url;
    }
    if ((item.source_label || "").includes("mock")) {
      current.is_mock = true;
    }

    grouped.set(item.candidate_id, current);
  }

  const overlayByCandidate = new Map<string, CandidatePromiseOverlay>();
  for (const [candidateId, entry] of grouped.entries()) {
    overlayByCandidate.set(candidateId, {
      promise_item_count: entry.titles.length,
      representative_title: entry.titles[0] ?? null,
      issue_keys: entry.issue_keys,
      source_label: entry.source_label,
      source_url: entry.source_url,
      promise_source_status: entry.is_mock ? "public_statement" : "official",
      issue_matches: buildIssueMatches(entry.issue_entries),
    });
  }

  return overlayByCandidate;
}

export async function loadCandidatePromiseOverlayIndex(): Promise<
  Map<string, CandidatePromiseOverlay>
> {
  const electionId = getActiveLocalElectionElectionId();
  const promisePath = resolvePromiseCatalogPath();
  if (!promisePath) {
    return new Map();
  }

  const fileStat = await stat(promisePath).catch(() => null);
  if (!fileStat) {
    return new Map();
  }

  if (
    overlayCache &&
    overlayCache.path === promisePath &&
    overlayCache.mtimeMs === fileStat.mtimeMs &&
    overlayCache.electionId === electionId
  ) {
    return overlayCache.index;
  }

  const raw = await readFile(promisePath, "utf-8");
  const index = buildOverlayIndex(raw, electionId);
  overlayCache = {
    path: promisePath,
    mtimeMs: fileStat.mtimeMs,
    electionId,
    index,
  };
  return index;
}

export type CandidateRecordWithPromiseOverlay = CandidateRecord & {
  promise_overlay?: CandidatePromiseOverlay | null;
};
