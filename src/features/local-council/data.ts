import type {
  LocalCouncilDataSource,
  LocalCouncilPersonDossierResponse,
  LocalCouncilRosterPerson,
} from "@/lib/schemas";

export function getLocalCouncilOfficeLabel(officeType: string) {
  const labels: Record<string, string> = {
    basic_head: "구청장",
    basic_council: "구의원",
    metro_council: "시·도의원",
  };
  return labels[officeType] || officeType;
}

export function getLocalCouncilSummaryModeLabel(
  summaryMode: LocalCouncilPersonDossierResponse["summary"]["summary_mode"],
) {
  const labels: Record<
    LocalCouncilPersonDossierResponse["summary"]["summary_mode"],
    string
  > = {
    agentic: "근거 요약",
    fallback: "기본 요약",
    none: "요약 없음",
  };
  return labels[summaryMode];
}

export function getLocalCouncilDataSourceLabel(dataSource: LocalCouncilDataSource) {
  return dataSource === "local_sample" ? "로컬 미리보기 데이터" : "공식 근거 데이터";
}

export function getLocalCouncilSourceLabel(sourceKind: string) {
  const labels: Record<string, string> = {
    nec_current_holder: "중앙선거관리위원회 현직자 근거",
    nec_council_elected_basis: "중앙선거관리위원회 당선 근거",
    local_council_portal_members: "지방의정포털 의원 정보",
    gangdong_district_head_official_profile: "강동구청장실 공식 프로필",
    gangdong_council_official_activity: "강동구의회 공식 활동",
    local_finance_365: "지방재정365",
    local_sample: "로컬 미리보기 샘플",
  };
  return labels[sourceKind] || sourceKind;
}

export function getLocalCouncilFreshnessLabel(freshness: Record<string, unknown>) {
  const timestamp = freshness.basis_timestamp;
  if (typeof timestamp !== "string" || !timestamp.trim()) {
    return "기준 시각 확인 필요";
  }
  return `기준 ${timestamp}`;
}

export function getLocalCouncilSourceCoverageSummary(
  sourceCoverage: Record<string, unknown>,
) {
  const coverageLabels: Record<string, string> = {
    district_head_official_profile: "구청장 프로필",
    district_head_official_activity: "구청장 활동",
    district_head_finance_activity: "구청장 재정",
    council_member_elected_basis: "구의원 당선 근거",
    council_member_official_activity: "구의원 활동",
  };

  const availableLabels = Object.entries(sourceCoverage)
    .filter(([, value]) => typeof value === "string" && value.trim() === "present")
    .map(([key]) => coverageLabels[key] || key);

  if (availableLabels.length === 0) {
    return "근거 범위 확인 필요";
  }

  if (availableLabels.length <= 2) {
    return `${availableLabels.join(" · ")} 준비`;
  }

  return `${availableLabels.slice(0, 2).join(" · ")} 외 ${availableLabels.length - 2}개 준비`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isLocalCouncilRosterPerson(
  value: unknown,
): value is LocalCouncilRosterPerson {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    isNonEmptyString(record.person_key) &&
    isNonEmptyString(record.person_name) &&
    isNonEmptyString(record.office_type)
  );
}

export function getRosterPersonInitial(person: LocalCouncilRosterPerson) {
  return person.person_name.slice(0, 1) || "?";
}

export function getPayloadText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (typeof value === "number") {
      return value.toLocaleString("ko-KR");
    }
  }
  return null;
}
