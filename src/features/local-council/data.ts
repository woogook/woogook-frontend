import type {
  LocalCouncilDataSource,
  LocalCouncilDiagnostics,
  LocalCouncilFreshness,
  LocalCouncilPersonDossierResponse,
  LocalCouncilRosterPerson,
  LocalCouncilSpotCheck,
} from "@/lib/schemas";

export function getLocalCouncilOfficeLabel(officeType: string) {
  const labels: Record<string, string> = {
    basic_head: "구청장",
    basic_council: "구의원",
    metro_council: "시·도의원",
  };
  return labels[officeType] || officeType;
}

export function getLocalCouncilOfficeExplanation(officeType: string) {
  const labels: Record<string, string> = {
    basic_head: "구청장은 구 행정을 총괄하는 단체장입니다.",
    basic_council: "구의원은 구의회에서 조례와 예산, 감시 역할을 맡습니다.",
    metro_council: "시·도의원은 광역의회에서 지역 정책과 예산을 다룹니다.",
  };
  return labels[officeType] || null;
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

export interface LocalCouncilLabelValue {
  label: string;
  value: string;
}

export interface LocalCouncilDiagnosticsViewModel {
  statusRows: LocalCouncilLabelValue[];
  dataGapFlags: string[];
  needsHumanReview: string[];
  spotCheckTitle: string | null;
  spotCheckRows: LocalCouncilLabelValue[];
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

function getStringValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getStringArrayValue(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => getStringValue(item))
    .filter((item): item is string => Boolean(item));
}

function getRecordValue(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getDisplayText(value: unknown) {
  const text = getStringValue(value);
  if (text) {
    return text;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("ko-KR");
  }

  return null;
}

function getLocalCouncilFreshnessBasisKindLabel(basisKind: string) {
  const labels: Record<string, string> = {
    source_fetched_at: "수집 시각",
    published_batch_finished_at: "발행 배치 완료 시각",
    snapshot_batch_finished_at: "스냅샷 배치 완료 시각",
  };
  return labels[basisKind] || basisKind;
}

function getLocalCouncilFreshnessSourceModeLabel(sourceMode: string) {
  const labels: Record<string, string> = {
    stored_projection_only: "저장된 projection만 사용",
    stored_artifacts_only: "저장된 산출물만 사용",
    live_api: "실시간 API",
  };
  return labels[sourceMode] || sourceMode;
}

export function getLocalCouncilFreshnessDetailRows(
  freshness: Record<string, unknown> | LocalCouncilFreshness,
) {
  const rows: LocalCouncilLabelValue[] = [];
  const basisKind = getStringValue(freshness.basis_kind);
  const basisTimestamp = getStringValue(freshness.basis_timestamp);
  const generatedAt = getStringValue(freshness.generated_at);
  const sourceMode = getStringValue(freshness.source_mode);
  const note = getStringValue(freshness.note);
  const isSnapshotBased = freshness.is_snapshot_based;

  if (basisKind) {
    rows.push({ label: "기준 종류", value: getLocalCouncilFreshnessBasisKindLabel(basisKind) });
  }
  if (basisTimestamp) {
    rows.push({ label: "기준 시각", value: basisTimestamp });
  }
  if (generatedAt) {
    rows.push({ label: "생성 시각", value: generatedAt });
  }
  if (sourceMode) {
    rows.push({ label: "수집 모드", value: getLocalCouncilFreshnessSourceModeLabel(sourceMode) });
  }
  if (typeof isSnapshotBased === "boolean") {
    rows.push({ label: "스냅샷 기반", value: isSnapshotBased ? "예" : "아니오" });
  }
  if (note) {
    rows.push({ label: "메모", value: note });
  }

  return rows;
}

export function getLocalCouncilSummaryEvidenceDigest(
  summary: LocalCouncilPersonDossierResponse["summary"] | Record<string, unknown>,
) {
  return getStringArrayValue(summary.evidence_digest);
}

export function getLocalCouncilSummaryBasisLabels(
  summaryBasis: Record<string, unknown>,
) {
  const sourceKinds = getStringArrayValue(summaryBasis.source_kinds);
  return sourceKinds.map((sourceKind) => getLocalCouncilSourceLabel(sourceKind));
}

export function getLocalCouncilSummaryFallbackReason(
  summary: LocalCouncilPersonDossierResponse["summary"] | Record<string, unknown>,
) {
  return getStringValue(summary.fallback_reason);
}

function describeReviewItem(value: unknown) {
  const record = getRecordValue(value);
  if (!record) {
    return getDisplayText(value);
  }

  const reasonCode =
    getStringValue(record.reason_code) ??
    getStringValue(record.reason) ??
    getStringValue(record.code);
  const note = getStringValue(record.note);
  const personKey = getStringValue(record.person_key);
  const sourceKind = getStringValue(record.source_kind);
  const parts = [reasonCode, note, personKey, sourceKind].filter(
    (item): item is string => Boolean(item),
  );

  if (parts.length > 0) {
    return parts.join(" · ");
  }

  const fallbackText = getDisplayText(record.label);
  return fallbackText || null;
}

function getLocalCouncilSpotCheckTitle(spotCheck: LocalCouncilSpotCheck | null) {
  if (!spotCheck) {
    return null;
  }

  if (spotCheck.kind === "member_source_docid") {
    return "구의원 spot-check";
  }

  if (spotCheck.kind === "district_head") {
    return "구청장 spot-check";
  }

  if (spotCheck.kind) {
    return "spot-check";
  }

  return null;
}

function buildSpotCheckRows(
  spotCheck: LocalCouncilSpotCheck | null,
): LocalCouncilLabelValue[] {
  if (!spotCheck) {
    return [];
  }

  const rows: LocalCouncilLabelValue[] = [];
  const kind = getStringValue(spotCheck.kind);
  const personKey = getStringValue(spotCheck.person_key);
  const councilSlug = getStringValue(spotCheck.council_slug);
  const memberSourceDocid = getStringValue(spotCheck.member_source_docid);
  const sourceKind = getStringValue(spotCheck.source_kind);

  if (kind) {
    rows.push({ label: "유형", value: kind });
  }
  if (personKey) {
    rows.push({ label: "대상", value: personKey });
  }
  if (councilSlug) {
    rows.push({ label: "의회", value: councilSlug });
  }
  if (memberSourceDocid) {
    rows.push({ label: "member_source_docid", value: memberSourceDocid });
  }
  if (sourceKind) {
    rows.push({ label: "source_kind", value: getLocalCouncilSourceLabel(sourceKind) });
  }

  return rows;
}

export function buildLocalCouncilDiagnosticsViewModel(
  diagnostics: LocalCouncilDiagnostics | Record<string, unknown> | null | undefined,
): LocalCouncilDiagnosticsViewModel {
  if (!diagnostics || typeof diagnostics !== "object" || Array.isArray(diagnostics)) {
    return {
      statusRows: [],
      dataGapFlags: [],
      needsHumanReview: [],
      spotCheckTitle: null,
      spotCheckRows: [],
    };
  }

  const record = diagnostics as Record<string, unknown>;
  const statusRows: LocalCouncilLabelValue[] = [];
  const statusKeys: Array<[string, string]> = [
    ["발행 상태", "publish_status"],
    ["최종 발행 상태", "final_publish_status"],
    ["agentic 검토", "agentic_review_status"],
    ["agentic 보강", "agentic_enrichment_status"],
  ];

  for (const [label, key] of statusKeys) {
    const value = getStringValue(record[key]);
    if (value) {
      statusRows.push({ label, value });
    }
  }

  const dataGapFlags = getStringArrayValue(record.data_gap_flags);
  const needsHumanReview = Array.isArray(record.needs_human_review)
    ? record.needs_human_review
        .map((item) => describeReviewItem(item))
        .filter((item): item is string => Boolean(item))
    : [];
  const spotCheck = getRecordValue(record.spot_check);
  const normalizedSpotCheck = spotCheck
    ? (spotCheck as LocalCouncilSpotCheck)
    : null;

  return {
    statusRows,
    dataGapFlags,
    needsHumanReview,
    spotCheckTitle: getLocalCouncilSpotCheckTitle(normalizedSpotCheck),
    spotCheckRows: buildSpotCheckRows(normalizedSpotCheck),
  };
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
