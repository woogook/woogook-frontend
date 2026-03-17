// ── Types matching real BallotResponse API ─────────────

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
}

// ── Sample data imports ────────────────────────────────

import seoulData from "../../2026_data/sample_ballot_response_resolved_seoul.json";
import jejuData from "../../2026_data/sample_ballot_response_partially_ambiguous_jeju.json";

export const SAMPLE_SEOUL: BallotResponse = seoulData as BallotResponse;
export const SAMPLE_JEJU: BallotResponse = jejuData as BallotResponse;

// ── Helpers ────────────────────────────────────────────

const PARTY_COLORS: Record<string, string> = {
  "더불어민주당": "#004EA2",
  "국민의힘": "#E61E2B",
  "진보당": "#D6001C",
  "개혁신당": "#FF7210",
  "정의당": "#FFCC00",
  "녹색정의당": "#006241",
  "조국혁신당": "#004098",
};

export function getPartyColor(partyName: string | null): string {
  if (!partyName) return "#71717a";
  return PARTY_COLORS[partyName] || "#71717a";
}

export function getOfficeLevelLabel(officeLevel: string): string {
  const map: Record<string, string> = {
    metro_head: "광역단체장",
    basic_head: "기초단체장",
    metro_council: "광역의원",
    basic_council: "기초의원",
    education_head: "교육감",
  };
  return map[officeLevel] || officeLevel;
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
  const areaPrimary = ballot.display_name || ballot.parent_area_name || ballot.sigungu_name || ballot.city_name_canonical || "";
  const city = ballot.city_name_canonical || "";

  // 광역단체장: 시장/지사
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

  // 기초단체장: 시장/군수/구청장
  if (ballot.office_level === "basic_head") {
    const base = areaPrimary || city;
    if (!base) return ballot.election_name;
    if (/시$/.test(base)) return `${base}시장선거`;
    if (/군$/.test(base)) return `${base}군수선거`;
    if (/구$/.test(base)) return `${base}구청장선거`;
    return `${base} 단체장선거`;
  }

  // 광역의원 (지역구/비례)
  if (ballot.office_level === "metro_council") {
    if (ballot.representation_type === "proportional" || ballot.ballot_subject_type === "party_list") {
      const base = city || areaPrimary;
      return base ? `${base} 광역의원비례대표선거` : "광역의원비례대표선거";
    }
    const base = areaPrimary || city;
    return base ? `${base} 광역의원선거` : ballot.election_name;
  }

  // 기초의원 (지역구/비례)
  if (ballot.office_level === "basic_council") {
    if (ballot.representation_type === "proportional" || ballot.ballot_subject_type === "party_list") {
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
  return career.split("\n").filter(Boolean);
}

export function parseBirthAge(text: string | null): { age: string; birth: string } | null {
  if (!text) return null;
  const match = text.match(/^(.+?)\s*\((\d+세)\)$/);
  if (match) return { birth: match[1], age: match[2] };
  return { birth: text, age: "" };
}

// ── Address regions for selector ───────────────────────

export const CITIES = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
  "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도",
  "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도",
  "경상남도", "제주특별자치도",
] as const;

export const DISTRICTS: Record<string, string[]> = {
  서울특별시: [
    "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구",
    "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구",
    "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구",
    "서초구", "강남구", "송파구", "강동구",
  ],
  제주특별자치도: ["제주시", "서귀포시"],
};

export const DONGS: Record<string, string[]> = {
  강남구: ["개포1동", "개포2동", "역삼동", "삼성동", "대치동", "청담동", "논현동", "압구정동", "신사동"],
  제주시: ["노형동", "연동", "아라동", "오라동", "이도동", "일도동", "이호동"],
};
