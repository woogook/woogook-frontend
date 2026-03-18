import seoulData from "../../2026_data/sample_ballot_response_resolved_seoul.json";
import jejuData from "../../2026_data/sample_ballot_response_partially_ambiguous_jeju.json";

export type IssueKey =
  | "transport"
  | "housing"
  | "education"
  | "care"
  | "jobs"
  | "safety"
  | "climate"
  | "welfare"
  | "youth"
  | "commerce";

export type IssueMatchLevel =
  | "very_high"
  | "high"
  | "partial"
  | "insufficient";

export type EvidenceStatus = "enough" | "limited" | "missing";
export type PromiseSourceStatus =
  | "official"
  | "public_statement"
  | "not_open_yet"
  | "not_secured";
export type SourceType = "official" | "semi_official" | "auxiliary";
export type DataPhase =
  | "pre_registration"
  | "registered"
  | "campaign"
  | "completed";

export interface SourceRef {
  label: string;
  source_type: SourceType;
  as_of: string | null;
  url: string | null;
}

export interface CandidateIssueMatch {
  issue_key: IssueKey;
  level: IssueMatchLevel;
  reasons: string[];
  matched_keywords: string[];
}

export interface CandidateBrief {
  summary_lines: string[];
  differentiator: string | null;
  evidence_status: EvidenceStatus;
  promise_source_status: PromiseSourceStatus;
  info_gap_flags: string[];
}

export interface CandidateCompareFact {
  label: string;
  value: string;
}

export interface CandidateCompareEntry {
  facts: CandidateCompareFact[];
  summary: string[];
  source_refs: SourceRef[];
  info_gap_flags: string[];
}

export interface ElectionMeta {
  election_id: string;
  election_name: string;
  election_day: string;
  data_phase: DataPhase;
  as_of: string;
}

export interface UserIssueProfile {
  election_id: string;
  contest_id: string;
  selected_issue_keys: IssueKey[];
  custom_keywords: string[];
  normalized_issue_keys: IssueKey[];
  updated_at: string;
}

export interface CandidateRecord {
  candidate_id: string;
  contest_id: string;
  election_id: string;
  election_code: string;
  election_name: string;
  city_code: number;
  city_name: string;
  town_code: string | null;
  town_name: string | null;
  district_name_raw: string;
  name_ko: string;
  name_hanja: string | null;
  party_name: string | null;
  gender: string;
  birthdate_text: string | null;
  age_text: string | null;
  address: string;
  job: string;
  education: string;
  career: string;
  registration_date: string;
  crime_text: string;
  crime_parse_status: string;
  crime_case_count: number | null;
  crime_items: unknown[];
  photo_url: string;
  detail_url: string;
  source_scope_key: string;
  source_scope_label: string;
  source_kind: string;
  source_file: string;
  brief?: CandidateBrief | null;
  issue_matches?: CandidateIssueMatch[];
  compare_entry?: CandidateCompareEntry | null;
}

export interface BallotItem {
  contest_id: string;
  election_code: string;
  election_name: string;
  ballot_subject_type: "candidate_person" | "party_list";
  office_level: string;
  representation_type: "single" | "district" | "proportional";
  special_region_type: string;
  geographic_scope: string;
  city_code: number;
  city_name_canonical: string;
  sigungu_name: string | null;
  display_name: string;
  parent_area_name: string | null;
  seats: number | null;
  candidates: CandidateRecord[];
}

export interface AmbiguousOption {
  contest_id: string;
  display_name: string;
  parent_area_name: string;
}

export interface AmbiguousBallot {
  election_code: string;
  election_name: string;
  options: AmbiguousOption[];
}

export type ResolutionStatus = "resolved" | "partially_ambiguous" | "ambiguous";

export interface BallotResponse {
  city_name_canonical: string;
  sigungu_name: string;
  emd_name: string;
  resolution_status: ResolutionStatus;
  ballot_count: number;
  ballots: BallotItem[];
  ambiguous_ballots: AmbiguousBallot[];
  meta?: ElectionMeta | null;
}

export interface IssueDefinition {
  key: IssueKey;
  label: string;
  shortLabel: string;
  helperText: string;
  aliases: string[];
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

const CURRENT_LOCAL_ELECTION = {
  electionId: "0020260603",
  electionName: "제9회 전국동시지방선거",
  electionDay: "2026-06-03",
  registrationStart: "2026-05-14",
  registrationEnd: "2026-05-15",
  campaignStart: "2026-05-21",
} as const;

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
  electionId: string = CURRENT_LOCAL_ELECTION.electionId,
  electionName: string = CURRENT_LOCAL_ELECTION.electionName,
  now: Date = new Date(),
): ElectionMeta {
  const electionDay = new Date(CURRENT_LOCAL_ELECTION.electionDay);
  const registrationStart = new Date(CURRENT_LOCAL_ELECTION.registrationStart);
  const registrationEnd = new Date(CURRENT_LOCAL_ELECTION.registrationEnd);
  const campaignStart = new Date(CURRENT_LOCAL_ELECTION.campaignStart);

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
    election_id: electionId,
    election_name: electionName,
    election_day: CURRENT_LOCAL_ELECTION.electionDay,
    data_phase: dataPhase,
    as_of: now.toISOString(),
  };
}

export function buildCandidateIssueMatches(
  candidate: CandidateRecord,
): CandidateIssueMatch[] {
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
  candidate: CandidateRecord,
): CandidateBrief {
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
  candidate: CandidateRecord,
): CandidateCompareEntry {
  const careerLines = parseCareer(candidate.career);
  const issueMatches = candidate.issue_matches || buildCandidateIssueMatches(candidate);
  const strongIssues = issueMatches
    .filter((match) => match.level === "very_high" || match.level === "high")
    .map((match) => getIssueShortLabel(match.issue_key));

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
  candidate: CandidateRecord,
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
  candidate: CandidateRecord,
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
  candidate: CandidateRecord,
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
  if (!issueProfile) return [];
  const normalized = issueProfile.normalized_issue_keys.map(getIssueShortLabel);
  return Array.from(new Set([...normalized, ...issueProfile.custom_keywords]));
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
