import seoulData from "@/data/samples/sample_ballot_response_resolved_seoul.json";
import jejuData from "@/data/samples/sample_ballot_response_partially_ambiguous_jeju.json";
import { getLocalElectionPresetByElectionId } from "@/lib/local-election-config";
import type { CandidateRecordWithPromiseOverlay } from "@/app/api/ballots/promise-overlay";
import type { CandidateRecordWithNewsOverlay } from "@/app/api/ballots/news-overlay";
import type {
  BallotItem,
  BallotResponse,
  CandidateBrief,
  CandidateCompareEntry,
  CandidateIssueMatch,
  CandidateRecord,
  DataPhase,
  ElectionMeta,
  EvidenceStatus,
  IssueKey,
  IssueMatchLevel,
  PromiseSourceStatus,
  UserIssueProfile,
} from "@/lib/schemas";

export type {
  AmbiguousBallot,
  AmbiguousOption,
  BallotItem,
  BallotResponse,
  CandidateBrief,
  CandidateCompareEntry,
  CandidateIssueMatch,
  CandidateRecord,
  DataPhase,
  ElectionMeta,
  EvidenceStatus,
  IssueKey,
  IssueMatchLevel,
  PromiseSourceStatus,
  SourceRef,
  SourceType,
  UserIssueProfile,
} from "@/lib/schemas";

export type ResolutionStatus = BallotResponse["resolution_status"];

export interface IssueDefinition {
  key: IssueKey;
  label: string;
  shortLabel: string;
  helperText: string;
  aliases: string[];
}

export interface IssueCriterionEntry {
  id: string;
  label: string;
  issue_key: IssueKey | null;
  source: "selected" | "custom";
}

export const ISSUE_DEFINITIONS: IssueDefinition[] = [
  {
    key: "transport",
    label: "교통·인프라",
    shortLabel: "교통",
    helperText: "버스, 지하철, 도로, 환승, 주차",
    aliases: ["교통", "인프라", "버스", "지하철", "철도", "도로", "환승", "주차"],
  },
  {
    key: "housing",
    label: "주거",
    shortLabel: "주거",
    helperText: "주택, 전세, 월세, 재개발, 재건축",
    aliases: ["주거", "주택", "전세", "월세", "임대", "재개발", "재건축", "주거비"],
  },
  {
    key: "education",
    label: "교육",
    shortLabel: "교육",
    helperText: "학교, 학군, 학생, 교사, 대학",
    aliases: ["교육", "학교", "학군", "학생", "교사", "대학", "방과후"],
  },
  {
    key: "care",
    label: "돌봄",
    shortLabel: "돌봄",
    helperText: "보육, 어린이집, 유치원, 아동, 육아",
    aliases: ["돌봄", "보육", "어린이집", "유치원", "육아", "아동"],
  },
  {
    key: "jobs",
    label: "일자리",
    shortLabel: "일자리",
    helperText: "고용, 취업, 창업, 산업, 노동",
    aliases: ["일자리", "고용", "취업", "창업", "산업", "노동"],
  },
  {
    key: "safety",
    label: "안전",
    shortLabel: "안전",
    helperText: "재난, 침수, 방범, 치안, 소방",
    aliases: ["안전", "치안", "재난", "침수", "방범", "소방"],
  },
  {
    key: "climate",
    label: "환경·기후",
    shortLabel: "기후",
    helperText: "환경, 탄소, 미세먼지, 공원, 녹지",
    aliases: ["기후", "환경", "탄소", "미세먼지", "공원", "녹지", "재활용", "에너지"],
  },
  {
    key: "welfare",
    label: "복지",
    shortLabel: "복지",
    helperText: "보건, 의료, 노인, 장애인, 취약계층",
    aliases: ["복지", "의료", "보건", "장애인", "노인", "취약계층", "사회보장"],
  },
  {
    key: "youth",
    label: "청년",
    shortLabel: "청년",
    helperText: "청년주거, 청년일자리, 대학생, 청소년",
    aliases: ["청년", "청소년", "청년주거", "청년일자리", "대학생"],
  },
  {
    key: "commerce",
    label: "상권",
    shortLabel: "상권",
    helperText: "소상공인, 시장, 골목상권, 지역경제",
    aliases: ["상권", "소상공인", "시장", "골목상권", "자영업", "지역경제"],
  },
];

const ISSUE_MAP = new Map<IssueKey, IssueDefinition>(
  ISSUE_DEFINITIONS.map((issue) => [issue.key, issue]),
);

const ISSUE_ALIAS_MAP = new Map<string, IssueKey>();
for (const issue of ISSUE_DEFINITIONS) {
  ISSUE_ALIAS_MAP.set(normalizeLookup(issue.key), issue.key);
  ISSUE_ALIAS_MAP.set(normalizeLookup(issue.label), issue.key);
  ISSUE_ALIAS_MAP.set(normalizeLookup(issue.shortLabel), issue.key);
  for (const alias of issue.aliases) {
    ISSUE_ALIAS_MAP.set(normalizeLookup(alias), issue.key);
  }
}

const PARTY_COLORS: Record<string, string> = {
  더불어민주당: "#004EA2",
  국민의힘: "#E61E2B",
  진보당: "#D6001C",
  개혁신당: "#FF7210",
  정의당: "#FFCC00",
  녹색정의당: "#006241",
  조국혁신당: "#004098",
};

const OFFICE_LEVEL_LABELS: Record<string, string> = {
  metro_head: "광역단체장",
  basic_head: "기초단체장",
  metro_council: "광역의원",
  basic_council: "기초의원",
  education_head: "교육감",
  education_member: "교육의원",
};

const OFFICE_ROLE_DESCRIPTIONS: Record<string, string> = {
  metro_head: "광역행정 집행과 예산 운영을 총괄합니다.",
  basic_head: "지역 행정을 집행하고 생활 정책을 실행합니다.",
  metro_council: "조례·예산·행정 감시를 통해 광역 정책을 다룹니다.",
  basic_council: "조례·예산·행정 감시를 통해 생활 의제를 다룹니다.",
  education_head: "교육 정책과 학교 운영 방향을 총괄합니다.",
  education_member: "교육 예산과 조례, 교육 행정을 감시합니다.",
};

const AUTHORITY_MATRIX: Record<string, Record<IssueKey, "direct" | "oversight" | "limited" | "low">> = {
  metro_head: Object.fromEntries(
    ISSUE_DEFINITIONS.map((issue) => [issue.key, "direct"]),
  ) as Record<IssueKey, "direct">,
  basic_head: Object.fromEntries(
    ISSUE_DEFINITIONS.map((issue) => [issue.key, "direct"]),
  ) as Record<IssueKey, "direct">,
  metro_council: Object.fromEntries(
    ISSUE_DEFINITIONS.map((issue) => [issue.key, "oversight"]),
  ) as Record<IssueKey, "oversight">,
  basic_council: Object.fromEntries(
    ISSUE_DEFINITIONS.map((issue) => [issue.key, "oversight"]),
  ) as Record<IssueKey, "oversight">,
  education_head: {
    transport: "limited",
    housing: "limited",
    education: "direct",
    care: "direct",
    jobs: "limited",
    safety: "limited",
    climate: "limited",
    welfare: "limited",
    youth: "direct",
    commerce: "low",
  },
  education_member: {
    transport: "limited",
    housing: "low",
    education: "oversight",
    care: "oversight",
    jobs: "low",
    safety: "limited",
    climate: "low",
    welfare: "limited",
    youth: "oversight",
    commerce: "low",
  },
};

export const SAMPLE_SEOUL: BallotResponse = seoulData as BallotResponse;
export const SAMPLE_JEJU: BallotResponse = jejuData as BallotResponse;

export function getPartyColor(partyName: string | null): string {
  if (!partyName) return "#71717a";
  return PARTY_COLORS[partyName] || "#71717a";
}

export function getIssueLabel(issueKey: IssueKey): string {
  return ISSUE_MAP.get(issueKey)?.label || issueKey;
}

export function getIssueShortLabel(issueKey: IssueKey): string {
  return ISSUE_MAP.get(issueKey)?.shortLabel || issueKey;
}

export function getIssueHelperText(issueKey: IssueKey): string {
  return ISSUE_MAP.get(issueKey)?.helperText || "";
}

export function getIssueMatchLevelLabel(level: IssueMatchLevel): string {
  const map: Record<IssueMatchLevel, string> = {
    very_high: "관련 매우 높음",
    high: "관련 높음",
    partial: "일부 관련",
    insufficient: "관련 정보 부족",
  };
  return map[level];
}

export function getEvidenceStatusLabel(status: EvidenceStatus): string {
  const map: Record<EvidenceStatus, string> = {
    enough: "근거 충분",
    limited: "근거 제한적",
    missing: "근거 부족",
  };
  return map[status];
}

export function getPromiseSourceStatusLabel(status: PromiseSourceStatus): string {
  const map: Record<PromiseSourceStatus, string> = {
    official: "공식 공약 확보",
    public_statement: "공개 발언 기준",
    not_open_yet: "공식 공약 공개 전",
    not_secured: "공식 공약 미확보",
  };
  return map[status];
}

export function getDataPhaseLabel(phase: DataPhase): string {
  const map: Record<DataPhase, string> = {
    pre_registration: "후보 등록 전",
    registered: "후보 등록 기간",
    campaign: "선거운동 기간",
    completed: "선거 종료 후",
  };
  return map[phase];
}

export function getOfficeLevelLabel(officeLevel: string): string {
  return OFFICE_LEVEL_LABELS[officeLevel] || officeLevel;
}

export function getOfficeRoleDescription(officeLevel: string): string {
  return (
    OFFICE_ROLE_DESCRIPTIONS[officeLevel] ||
    "해당 선출직의 권한 범위를 함께 확인하세요."
  );
}

export function getAuthorityHint(
  officeLevel: string,
  issueKey: IssueKey,
): string {
  const matrix = AUTHORITY_MATRIX[officeLevel];
  const scope = matrix?.[issueKey] || "limited";
  if (scope === "direct") {
    return "이 이슈는 해당 선출직의 직접 권한과 연결될 가능성이 높습니다.";
  }
  if (scope === "oversight") {
    return "이 이슈는 조례·예산·행정 감시 권한을 통해 연결해 봐야 합니다.";
  }
  if (scope === "limited") {
    return "이 이슈는 직접 집행보다 간접 영향 또는 협업 영역일 수 있습니다.";
  }
  return "이 이슈는 해당 선출직의 직접 권한 범위와 거리가 있습니다.";
}

export function getRepresentationLabel(type: string): string {
  const map: Record<string, string> = {
    single: "지역구",
    district: "지역구",
    proportional: "비례대표",
  };
  return map[type] || type;
}

export function getContestTitle(ballot: BallotItem): string {
  const areaPrimary =
    ballot.display_name ||
    ballot.parent_area_name ||
    ballot.sigungu_name ||
    ballot.city_name_canonical ||
    "";
  const city = ballot.city_name_canonical || "";

  if (ballot.office_level === "metro_head") {
    const suffixMatch = areaPrimary.match(/(특별자치도|특별자치시|광역시|특별시|도)$/);
    const suffix = suffixMatch?.[1];
    const root = suffix ? areaPrimary.slice(0, -suffix.length) : areaPrimary;

    if (suffix === "특별자치도" || suffix === "도") {
      const base = root ? `${root}도` : areaPrimary;
      return `${base}지사선거`;
    }
    if (suffix === "특별자치시" || suffix === "광역시" || suffix === "특별시") {
      const base = root || areaPrimary;
      return `${base}시장선거`;
    }
    return `${areaPrimary}선거`;
  }

  if (ballot.office_level === "basic_head") {
    const base = areaPrimary || city;
    if (!base) return ballot.election_name;
    if (/시$/.test(base)) return `${base}시장선거`;
    if (/군$/.test(base)) return `${base}군수선거`;
    if (/구$/.test(base)) return `${base}구청장선거`;
    return `${base} 단체장선거`;
  }

  if (ballot.office_level === "metro_council") {
    if (
      ballot.representation_type === "proportional" ||
      ballot.ballot_subject_type === "party_list"
    ) {
      const base = city || areaPrimary;
      return base ? `${base} 광역의원비례대표선거` : "광역의원비례대표선거";
    }
    const base = areaPrimary || city;
    return base ? `${base} 광역의원선거` : ballot.election_name;
  }

  if (ballot.office_level === "basic_council") {
    if (
      ballot.representation_type === "proportional" ||
      ballot.ballot_subject_type === "party_list"
    ) {
      const base = areaPrimary || city;
      return base ? `${base} 기초의원비례대표선거` : "기초의원비례대표선거";
    }
    const base = areaPrimary || city;
    return base ? `${base} 기초의원선거` : ballot.election_name;
  }

  return ballot.election_name;
}

export function parseCareer(career: string): string[] {
  if (!career) return [];
  return career
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getCandidateCrimeDetails(candidate: CandidateRecord): string[] {
  const details: string[] = [];

  for (const item of candidate.crime_items || []) {
    if (typeof item === "string") {
      const text = item.trim();
      if (text) details.push(text);
      continue;
    }

    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    const rawText = asNonEmptyText(record.raw_text);
    if (rawText) {
      details.push(rawText);
      continue;
    }

    const charge = asNonEmptyText(record.charge_text);
    const sentence = asNonEmptyText(record.sentence_text);
    const decisionDate = asNonEmptyText(record.decision_date_text);
    const caseCount = asNonEmptyText(record.case_count_text);
    const parts = [charge, sentence, decisionDate].filter(Boolean);

    if (parts.length > 0) {
      details.push(
        caseCount ? `${caseCount} · ${parts.join(" / ")}` : parts.join(" / "),
      );
    }
  }

  return Array.from(new Set(details));
}

export function parseBirthAge(
  text: string | null,
): { age: string; birth: string } | null {
  if (!text) return null;
  const match = text.match(/^(.+?)\s*\((\d+세)\)$/);
  if (match) return { birth: match[1], age: match[2] };
  return { birth: text, age: "" };
}

export function makeEmptyIssueProfile(
  electionId: string,
  contestId: string,
): UserIssueProfile {
  return {
    election_id: electionId,
    contest_id: contestId,
    selected_issue_keys: [],
    custom_keywords: [],
    normalized_issue_keys: [],
    updated_at: new Date().toISOString(),
  };
}

export function hasActiveIssues(profile: UserIssueProfile | null | undefined): boolean {
  if (!profile) return false;
  return (
    profile.selected_issue_keys.length > 0 ||
    profile.custom_keywords.length > 0 ||
    profile.normalized_issue_keys.length > 0
  );
}

export function getActiveIssueProfile(
  profile: UserIssueProfile | null | undefined,
): UserIssueProfile | null {
  return hasActiveIssues(profile) ? profile : null;
}

export function normalizeCustomIssueKeywords(customKeywords: string[]): IssueKey[] {
  const normalized = new Set<IssueKey>();
  for (const keyword of customKeywords) {
    const resolved = ISSUE_ALIAS_MAP.get(normalizeLookup(keyword));
    if (resolved) normalized.add(resolved);
  }
  return Array.from(normalized);
}

export function buildNormalizedIssueKeys(
  selectedIssueKeys: IssueKey[],
  customKeywords: string[],
): IssueKey[] {
  return Array.from(
    new Set<IssueKey>([
      ...selectedIssueKeys,
      ...normalizeCustomIssueKeywords(customKeywords),
    ]),
  );
}

export function resolveIssueKeyFromKeyword(keyword: string): IssueKey | null {
  return ISSUE_ALIAS_MAP.get(normalizeLookup(keyword)) || null;
}

export function buildIssueCriterionEntries(
  selectedIssueKeys: IssueKey[],
  customKeywords: string[],
): IssueCriterionEntry[] {
  const entries: IssueCriterionEntry[] = selectedIssueKeys.map((issueKey) => ({
    id: `selected:${issueKey}`,
    label: getIssueLabel(issueKey),
    issue_key: issueKey,
    source: "selected",
  }));

  const seenCustom = new Set<string>();
  for (const keyword of customKeywords) {
    const trimmed = keyword.trim();
    if (!trimmed) continue;

    const normalizedKeyword = normalizeLookup(trimmed);
    if (seenCustom.has(normalizedKeyword)) continue;
    seenCustom.add(normalizedKeyword);

    entries.push({
      id: `custom:${normalizedKeyword}`,
      label: trimmed,
      issue_key: resolveIssueKeyFromKeyword(trimmed),
      source: "custom",
    });
  }

  return entries;
}

export function getIssueCriterionEntries(
  issueProfile: UserIssueProfile | null | undefined,
): IssueCriterionEntry[] {
  if (!issueProfile) return [];
  return buildIssueCriterionEntries(
    issueProfile.selected_issue_keys,
    issueProfile.custom_keywords,
  );
}

export function getIssueCriterionHint(
  officeLevel: string,
  criterion: IssueCriterionEntry,
): string {
  if (!criterion.issue_key) {
    return "아직 자동 분류되지 않은 자유 키워드입니다. 후보 정보와 원문 출처를 함께 확인해주세요.";
  }
  return getAuthorityHint(officeLevel, criterion.issue_key);
}

export function formatKoreanDate(input: string | Date | null | undefined): string {
  if (!input) return "정보 없음";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return String(input);
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatKoreanDateTime(input: string | Date | null | undefined): string {
  if (!input) return "정보 없음";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return String(input);
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function buildElectionMeta(
  electionId: string = "0020260603",
  electionName?: string,
  now: Date = new Date(),
): ElectionMeta {
  const preset = getLocalElectionPresetByElectionId(electionId);
  const electionDay = new Date(preset.electionDay);
  const registrationStart = new Date(preset.registrationStart);
  const registrationEnd = new Date(preset.registrationEnd);
  const campaignStart = new Date(preset.campaignStart);

  let dataPhase: DataPhase = "completed";
  if (now < registrationStart) {
    dataPhase = "pre_registration";
  } else if (now <= registrationEnd) {
    dataPhase = "registered";
  } else if (now < campaignStart) {
    dataPhase = "registered";
  } else if (now <= electionDay) {
    dataPhase = "campaign";
  }

  return {
    election_id: preset.electionId,
    election_name: electionName || preset.electionName,
    election_day: preset.electionDay,
    data_phase: dataPhase,
    as_of: now.toISOString(),
  };
}

export function buildCandidateIssueMatches(
  candidate: CandidateRecordWithPromiseOverlay & CandidateRecordWithNewsOverlay,
): CandidateIssueMatch[] {
  const promiseOverlay = candidate.promise_overlay;
  if (promiseOverlay && promiseOverlay.issue_matches.length > 0) {
    return promiseOverlay.issue_matches;
  }
  const newsOverlay = candidate.news_overlay;
  if (newsOverlay && newsOverlay.issue_matches.length > 0) {
    return newsOverlay.issue_matches;
  }

  const normalizedJob = normalizeLookup(candidate.job);
  const normalizedEducation = normalizeLookup(candidate.education);
  const normalizedCareer = normalizeLookup(candidate.career);

  return ISSUE_DEFINITIONS.map((issue) => {
    const matchedKeywords = new Set<string>();
    const reasons: string[] = [];
    let hitCount = 0;

    const jobHits = issue.aliases.filter((keyword) =>
      normalizedJob.includes(normalizeLookup(keyword)),
    );
    if (jobHits.length > 0) {
      hitCount += 1;
      jobHits.forEach((keyword) => matchedKeywords.add(keyword));
      reasons.push(`직업 정보에서 ${jobHits.slice(0, 2).join(", ")} 관련 표현을 확인했습니다.`);
    }

    const educationHits = issue.aliases.filter((keyword) =>
      normalizedEducation.includes(normalizeLookup(keyword)),
    );
    if (educationHits.length > 0) {
      hitCount += 1;
      educationHits.forEach((keyword) => matchedKeywords.add(keyword));
      reasons.push(`학력 정보에서 ${educationHits.slice(0, 2).join(", ")} 관련 표현을 확인했습니다.`);
    }

    const careerHits = issue.aliases.filter((keyword) =>
      normalizedCareer.includes(normalizeLookup(keyword)),
    );
    if (careerHits.length > 0) {
      hitCount += 1;
      careerHits.forEach((keyword) => matchedKeywords.add(keyword));
      reasons.push(`주요 경력에서 ${careerHits.slice(0, 2).join(", ")} 관련 표현을 확인했습니다.`);
    }

    let level: IssueMatchLevel = "insufficient";
    if (matchedKeywords.size >= 3 || hitCount >= 3) {
      level = "very_high";
    } else if (matchedKeywords.size >= 2 || hitCount >= 2) {
      level = "high";
    } else if (matchedKeywords.size >= 1) {
      level = "partial";
    }

    if (level === "insufficient") {
      reasons.push(
        `현재 확보한 구조화 공개 자료에서 ${issue.shortLabel} 직접 언급을 찾기 어렵습니다.`,
      );
    }

    return {
      issue_key: issue.key,
      level,
      reasons,
      matched_keywords: Array.from(matchedKeywords),
    };
  });
}

export function buildCandidateBrief(
  candidate: CandidateRecordWithPromiseOverlay & CandidateRecordWithNewsOverlay,
): CandidateBrief {
  const promiseOverlay = candidate.promise_overlay;
  const newsOverlay = candidate.news_overlay;
  if (promiseOverlay && promiseOverlay.promise_item_count > 0) {
    const issueLabels = promiseOverlay.issue_keys.map((issueKey) => getIssueShortLabel(issueKey));
    const isMock = promiseOverlay.promise_source_status === "public_statement";
    return {
      summary_lines: [
        promiseOverlay.representative_title
          ? `대표 공약: ${promiseOverlay.representative_title}`
          : "대표 공약 요약은 추가 확인이 필요합니다.",
        newsOverlay?.summary_text
          ? `뉴스 단서: ${newsOverlay.summary_text}`
          : issueLabels.length > 0
            ? `주요 공약 분야: ${issueLabels.slice(0, 2).join("·")}`
            : `공약 자료 ${promiseOverlay.promise_item_count}건이 확인됩니다.`,
        `공약 자료 ${promiseOverlay.promise_item_count}건이 확인됩니다.`,
      ],
      differentiator: promiseOverlay.representative_title || candidate.job || null,
      evidence_status:
        !isMock || newsOverlay?.evidence_status === "enough" || newsOverlay?.evidence_status === "limited"
          ? "enough"
          : "limited",
      promise_source_status: promiseOverlay.promise_source_status,
      info_gap_flags: [
        isMock
          ? "일부 공약은 로컬 검증용 mock 데이터입니다."
          : "공약 세부 실행 계획은 원문 확인 필요",
      ],
    };
  }

  if (newsOverlay && newsOverlay.evidence_status !== "missing") {
    return {
      summary_lines: [
        newsOverlay.summary_text || "후보 뉴스 번들 기준 관련 근거가 확인됩니다.",
        "공식 공약은 아직 직접 확보되지 않았고 뉴스 보조 근거 중심입니다.",
      ],
      differentiator: newsOverlay.summary_text,
      evidence_status: newsOverlay.evidence_status,
      promise_source_status: "not_secured",
      info_gap_flags:
        newsOverlay.info_gap_flags.length > 0
          ? newsOverlay.info_gap_flags
          : ["공식 공약은 아직 직접 확보되지 않았습니다."],
    };
  }

  const careerLines = parseCareer(candidate.career);
  const summaryLines = [
    candidate.job
      ? `${candidate.job}으로 공개되어 있습니다.`
      : "직업 공개 정보가 충분하지 않습니다.",
    careerLines[0]
      ? `대표 경력: ${careerLines[0]}`
      : "대표 경력 공개 정보가 충분하지 않습니다.",
    candidate.crime_text
      ? `전과 공개 정보: ${candidate.crime_text}`
      : "전과 공개 정보는 별도 확인이 필요합니다.",
  ];

  const infoGapFlags: string[] = [];
  if (!candidate.career) infoGapFlags.push("주요 경력 공개 자료 부족");
  if (!candidate.education) infoGapFlags.push("학력 공개 자료 부족");
  if (!candidate.detail_url) infoGapFlags.push("원문 상세 링크 미확보");

  const evidenceStatus: EvidenceStatus =
    candidate.job && candidate.career && candidate.education && candidate.detail_url
      ? "enough"
      : candidate.job || candidate.career || candidate.education
        ? "limited"
        : "missing";

  return {
    summary_lines: summaryLines,
    differentiator: careerLines[1] || careerLines[0] || candidate.job || null,
    evidence_status: evidenceStatus,
    promise_source_status: "not_secured",
    info_gap_flags: infoGapFlags,
  };
}

export function buildCandidateCompareEntry(
  candidate: CandidateRecordWithPromiseOverlay & CandidateRecordWithNewsOverlay,
): CandidateCompareEntry {
  const promiseOverlay = candidate.promise_overlay;
  const newsOverlay = candidate.news_overlay;
  const careerLines = parseCareer(candidate.career);
  const issueMatches = candidate.issue_matches || buildCandidateIssueMatches(candidate);
  const strongIssues = issueMatches
    .filter((match) => match.level === "very_high" || match.level === "high")
    .map((match) => getIssueShortLabel(match.issue_key));

  if (promiseOverlay && promiseOverlay.promise_item_count > 0) {
    const issueLabels = promiseOverlay.issue_keys.map((issueKey) => getIssueShortLabel(issueKey));
    const isMock = promiseOverlay.promise_source_status === "public_statement";
    return {
      facts: [
        { label: "정당", value: candidate.party_name || "무소속" },
        { label: "직업", value: candidate.job || "정보 없음" },
        { label: "대표 공약", value: promiseOverlay.representative_title || "정보 없음" },
      ],
      summary: [
        issueLabels.length > 0
          ? `공약 자료 기준 ${issueLabels.slice(0, 2).join("·")} 관련 방향이 직접 확인됩니다.`
          : "공약 자료가 확보되어 후보별 정책 방향을 직접 비교할 수 있습니다.",
        promiseOverlay.representative_title
          ? `대표 공약은 '${promiseOverlay.representative_title}'입니다.`
          : "대표 공약 문구는 추가 확인이 필요합니다.",
      ],
      source_refs: [
        {
          label: promiseOverlay.source_label || "공약 자료",
          source_type: isMock ? "auxiliary" : "official",
          as_of: candidate.registration_date || null,
          url: promiseOverlay.source_url,
        },
      ],
      info_gap_flags: [
        isMock
          ? "일부 공약은 로컬 검증용 mock 데이터입니다."
          : "세부 실행 계획은 공약 원문 확인 필요",
      ],
    };
  }

  if (newsOverlay && newsOverlay.evidence_status !== "missing") {
    return {
      facts: [
        { label: "정당", value: candidate.party_name || "무소속" },
        { label: "직업", value: candidate.job || "정보 없음" },
        { label: "뉴스 근거", value: newsOverlay.summary_text || "후보 뉴스 번들" },
      ],
      summary: [
        newsOverlay.summary_text || "후보 뉴스 번들 기준 관련 근거가 확인됩니다.",
        "공식 공약이 아니라 뉴스 보조 근거 중심의 비교입니다.",
      ],
      source_refs: [
        {
          label: "후보 뉴스 번들",
          source_type: "auxiliary",
          as_of: candidate.registration_date || null,
          url: null,
        },
      ],
      info_gap_flags:
        newsOverlay.info_gap_flags.length > 0
          ? newsOverlay.info_gap_flags
          : ["공식 공약은 아직 직접 확보되지 않았습니다."],
    };
  }

  return {
    facts: [
      { label: "정당", value: candidate.party_name || "무소속" },
      { label: "직업", value: candidate.job || "정보 없음" },
      { label: "학력", value: candidate.education || "정보 없음" },
      { label: "전과기록", value: candidate.crime_text || "정보 없음" },
      { label: "등록일", value: candidate.registration_date || "정보 없음" },
      { label: "주소", value: candidate.address || "정보 없음" },
      {
        label: "주요 경력",
        value: careerLines.length > 0 ? careerLines.slice(0, 2).join(" / ") : "정보 없음",
      },
    ],
    summary: strongIssues.length > 0
      ? [
          `구조화 공개 자료 기준 ${strongIssues.join(", ")} 관련 단서가 확인됩니다.`,
          "다만 공식 공약 자료가 아니라 직업·경력·공개 정보 중심의 초기 판단입니다.",
        ]
      : [
          "현재 확보한 구조화 공개 자료만으로는 정책 이슈 직접 언급이 제한적입니다.",
          "세부 판단 전 원문 출처와 추가 자료를 함께 확인하는 것이 좋습니다.",
        ],
    source_refs: [
      {
        label:
          candidate.source_scope_label ||
          "중앙선거관리위원회 후보자 공개 자료",
        source_type: "official",
        as_of: candidate.registration_date || null,
        url: candidate.detail_url || null,
      },
    ],
    info_gap_flags: buildCandidateBrief(candidate).info_gap_flags,
  };
}

export function buildCandidateArtifacts(
  candidate: CandidateRecordWithPromiseOverlay & CandidateRecordWithNewsOverlay,
): CandidateRecord {
  const issueMatches = buildCandidateIssueMatches(candidate);
  const brief = buildCandidateBrief(candidate);
  return {
    ...candidate,
    issue_matches: issueMatches,
    brief,
    compare_entry: buildCandidateCompareEntry({
      ...candidate,
      issue_matches: issueMatches,
      brief,
    }),
  };
}

export function getRelevantIssueMatches(
  candidate: CandidateRecordWithPromiseOverlay & CandidateRecordWithNewsOverlay,
  issueProfile: UserIssueProfile | null | undefined,
): CandidateIssueMatch[] {
  if (!issueProfile || issueProfile.normalized_issue_keys.length === 0) {
    return [];
  }
  const map = new Map(
    (candidate.issue_matches || []).map((match) => [match.issue_key, match]),
  );
  return issueProfile.normalized_issue_keys
    .map((key) => map.get(key))
    .filter((match): match is CandidateIssueMatch => !!match)
    .sort((left, right) => getIssueMatchScore(right.level) - getIssueMatchScore(left.level));
}

export function getCandidateIssueSortScore(
  candidate: CandidateRecordWithPromiseOverlay & CandidateRecordWithNewsOverlay,
  issueProfile: UserIssueProfile | null | undefined,
): number {
  const matches = getRelevantIssueMatches(candidate, issueProfile);
  if (matches.length === 0) return -1;
  return matches.reduce(
    (total, match, index) => total + getIssueMatchScore(match.level) * (10 - index),
    0,
  );
}

export function getIssueProfileLabelList(
  issueProfile: UserIssueProfile | null | undefined,
): string[] {
  return getIssueCriterionEntries(issueProfile).map((entry) => entry.label);
}

export const CITIES = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
] as const;

export const DISTRICTS: Record<string, string[]> = {
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

export const DONGS: Record<string, string[]> = {
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
  제주시: ["노형동", "연동", "아라동", "오라동", "이도동", "일도동", "이호동"],
};

function getIssueMatchScore(level: IssueMatchLevel): number {
  const scoreMap: Record<IssueMatchLevel, number> = {
    very_high: 4,
    high: 3,
    partial: 2,
    insufficient: 1,
  };
  return scoreMap[level];
}

function normalizeLookup(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

function asNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
