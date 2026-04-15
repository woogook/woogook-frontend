import type {
  LocalCouncilDataSource,
  LocalCouncilDiagnostics,
  LocalCouncilFreshness,
  LocalCouncilOverlay,
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
  qualitySignalRows: LocalCouncilLabelValue[];
  sourceContractRows: LocalCouncilLabelValue[];
  sourceContractIssues: string[];
  sourceContractExplanationLines: string[];
  explanationLines: string[];
}

export interface LocalCouncilSourceContractSummaryViewModel {
  status: string | null;
  issueCount: number;
  issueRows: string[];
  explanationLines: string[];
}

export interface LocalCouncilOverlayItemViewModel {
  title: string;
  snippet: string | null;
  sourceName: string;
  sourceUrl: string | null;
  publishedAt: string | null;
  confidenceLabel: string | null;
  supportTierLabel: string;
  provenanceSummary: string | null;
}

export interface LocalCouncilOverlaySectionViewModel {
  channel: string;
  channelLabel: string;
  title: string;
  summary: string | null;
  items: LocalCouncilOverlayItemViewModel[];
}

export interface LocalCouncilOverlayViewModel {
  status: string;
  statusLabel: string;
  supportTierLabel: string;
  generatedAt: string | null;
  targetMemberId: string | null;
  allowedSourceLabels: string[];
  disclaimers: string[];
  sections: LocalCouncilOverlaySectionViewModel[];
  summaryLine: string;
  hasContent: boolean;
}

const qualitySignalLabels: Record<string, string> = {
  official_profile: "공식 프로필",
  committees: "상임위",
  bills: "의안",
  meeting_activity: "회의 활동",
  finance_activity: "재정 활동",
};

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

export function getLocalCouncilParticipationTypeLabel(participationType: string) {
  const labels: Record<string, string> = {
    primary_sponsor: "대표발의",
    co_sponsor: "공동발의",
    submitted_by_district_head: "구청장 제출",
    listed_activity: "의안 참여 기록",
  };
  return labels[participationType] || participationType;
}

export function getLocalCouncilRecordGroundingLevelLabel(level: string) {
  const labels: Record<string, string> = {
    record_listed: "공식 기록 목록 확인",
    record_located: "공식 기록 위치 확인",
  };
  return labels[level] || level;
}

export function getLocalCouncilContentGroundingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    not_eligible: "내용 검토 대상 아님",
    queued: "내용 검토 대기",
    supported: "내용 검토 완료",
    mention_only: "직접 활동 확인 전",
    unclear: "판단 유보",
    human_review_required: "사람 검토 필요",
    unavailable: "내용 검토 전",
  };
  return labels[status] || status;
}

export function getLocalCouncilActivityTypeLabel(activityType: string) {
  const labels: Record<string, string> = {
    plenary: "본회의",
    standing_committee: "상임위 회의",
    special_committee: "특위 회의",
    district_question: "구정질문",
    five_minute_speech: "5분자유발언",
    administrative_audit: "행정사무감사",
    budget_review: "예산심사",
    general_meeting: "회의 활동",
  };
  return labels[activityType] || activityType;
}

export function getLocalCouncilDataGapFlagLabel(flag: string) {
  const labels: Record<string, string> = {
    "uncollected:district_head_minutes_person_linkage":
      "구청장 개인 회의 활동 linkage는 아직 수집/검토 전입니다.",
    "uncollected:meeting_content_grounding":
      "회의 내용 grounding은 아직 수행되지 않았습니다.",
    "uncollected:bill_detail_summary":
      "의안 상세 원문 기반 요약은 아직 준비되지 않았습니다.",
  };
  return labels[flag] || flag;
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

function getUniqueStringArrayValue(values: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    deduped.push(value);
  }
  return deduped;
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

function getLocalCouncilOverlayStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ready: "준비 완료",
    partial: "부분 준비",
    stale: "오래된 보강",
    unavailable: "준비 중",
    disabled: "비활성화",
  };
  return labels[status] || status;
}

function getLocalCouncilOverlaySupportTierLabel(supportTier: string) {
  const labels: Record<string, string> = {
    supplemental: "보강 정보",
    exploratory: "탐색형 보강",
  };
  return labels[supportTier] || supportTier;
}

function getLocalCouncilOverlayChannelLabel(channel: string) {
  const labels: Record<string, string> = {
    news_article: "뉴스",
    sns: "SNS",
    council_site: "의회·공개자료",
  };
  return labels[channel] || channel;
}

function getLocalCouncilOverlayConfidenceLabel(confidence: string | null) {
  if (!confidence) {
    return null;
  }
  const labels: Record<string, string> = {
    high: "신뢰 높음",
    medium: "신뢰 보통",
    low: "신뢰 낮음",
  };
  return labels[confidence] || confidence;
}

function buildLocalCouncilOverlayProvenanceSummary(
  provenance: Record<string, unknown> | null,
) {
  if (!provenance) {
    return null;
  }
  const tokens = [
    getStringValue(provenance.source_kind),
    getStringValue(provenance.document_id),
    getStringValue(provenance.profile_pack_run_id),
  ].filter((item): item is string => Boolean(item));
  return tokens.length > 0 ? tokens.join(" · ") : null;
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

function getLocalCouncilSourceContractIssueLine(issue: Record<string, unknown>) {
  const issueCode = getStringValue(issue.issue_code);
  const sourceKind = getStringValue(issue.source_kind);
  const role = getStringValue(issue.role);
  const field = getStringValue(issue.field);
  const value = getStringValue(issue.value);
  const parts = [
    issueCode,
    sourceKind ? getLocalCouncilSourceLabel(sourceKind) : null,
    role,
  ].filter((item): item is string => Boolean(item));

  if (field && value) {
    parts.push(`${field}=${value}`);
  } else if (field) {
    parts.push(field);
  }

  return parts.join(" · ");
}

function getLocalCouncilQualitySignalValue(
  signal: Record<string, unknown>,
) {
  const count = signal.count;
  const countLabel =
    typeof count === "number" && Number.isFinite(count)
      ? `${Math.max(0, Math.floor(count))}건`
      : null;
  const status = getStringValue(signal.status);
  const confidence = getStringValue(signal.confidence);
  const severity = getStringValue(signal.severity);

  return [countLabel, status, confidence, severity]
    .filter((item): item is string => Boolean(item))
    .join(" · ");
}

function buildQualitySignalRows(
  value: unknown,
): LocalCouncilLabelValue[] {
  const record = getRecordValue(value);
  if (!record) {
    return [];
  }

  const preferredOrder = [
    "official_profile",
    "committees",
    "bills",
    "meeting_activity",
    "finance_activity",
  ];
  const knownRows: LocalCouncilLabelValue[] = [];
  const seen = new Set<string>();

  for (const key of preferredOrder) {
    const signal = getRecordValue(record[key]);
    if (!signal) {
      continue;
    }
    const displayValue = getLocalCouncilQualitySignalValue(signal);
    if (!displayValue) {
      continue;
    }
    seen.add(key);
    knownRows.push({
      label: qualitySignalLabels[key] ?? key,
      value: displayValue,
    });
  }

  const otherRows = Object.entries(record)
    .filter(([key]) => !seen.has(key))
    .map(([key, rawValue]) => {
      const signal = getRecordValue(rawValue);
      if (!signal) {
        return null;
      }
      const displayValue = getLocalCouncilQualitySignalValue(signal);
      if (!displayValue) {
        return null;
      }
      return {
        label: qualitySignalLabels[key] ?? key,
        value: displayValue,
      };
    })
    .filter((row): row is LocalCouncilLabelValue => Boolean(row));

  return [...knownRows, ...otherRows];
}

function buildSourceContractSummaryRows(
  value: unknown,
): LocalCouncilLabelValue[] {
  const record = getRecordValue(value);
  if (!record) {
    return [];
  }

  const rows: LocalCouncilLabelValue[] = [];
  const status = getStringValue(record.status);
  const issueCount = record.issue_count;

  if (status) {
    rows.push({ label: "출처 계약 상태", value: status });
  }
  if (typeof issueCount === "number" && Number.isFinite(issueCount)) {
    rows.push({
      label: "출처 계약 이슈",
      value: `${Math.max(0, Math.floor(issueCount))}건`,
    });
  }

  return rows;
}

function buildSourceContractIssueRows(
  value: unknown,
) {
  const record = getRecordValue(value);
  if (!record || !Array.isArray(record.issues)) {
    return [];
  }

  return getUniqueStringArrayValue(
    record.issues
      .map((item) => {
        if (typeof item === "string") {
          return getStringValue(item);
        }
        const issueRecord = getRecordValue(item);
        return issueRecord ? getLocalCouncilSourceContractIssueLine(issueRecord) : null;
      })
      .filter((item): item is string => Boolean(item)),
  );
}

export function getLocalCouncilExplainabilityLines(
  values: Array<unknown>,
) {
  const lines: string[] = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      lines.push(...getStringArrayValue(value));
      continue;
    }
    const record = getRecordValue(value);
    if (!record) {
      continue;
    }
    lines.push(...getStringArrayValue(record.explanation_lines));
  }
  return getUniqueStringArrayValue(lines);
}

export function buildLocalCouncilSourceContractSummaryViewModel(
  values: Array<unknown>,
): LocalCouncilSourceContractSummaryViewModel | null {
  let hasSummary = false;
  let status: string | null = null;
  let issueCount: number | null = null;
  const issueRows: string[] = [];
  const explanationLines: unknown[] = [];

  for (const value of values) {
    const record = getRecordValue(value);
    if (!record) {
      continue;
    }
    const nextStatus = getStringValue(record.status);
    const rawIssueCount = record.issue_count;
    const nextIssueCount =
      typeof rawIssueCount === "number" && Number.isFinite(rawIssueCount)
        ? Math.max(0, Math.floor(rawIssueCount))
        : null;
    const nextIssueRows = buildSourceContractIssueRows(record);
    const nextExplanationLines = record.explanation_lines;

    if (
      nextIssueRows.length === 0 &&
      nextIssueCount === null &&
      !nextStatus &&
      !nextExplanationLines
    ) {
      continue;
    }

    hasSummary = true;
    if (nextStatus && !status) {
      status = nextStatus;
    }
    if (nextIssueCount !== null) {
      issueCount =
        issueCount === null ? nextIssueCount : Math.max(issueCount, nextIssueCount);
    }
    issueRows.push(...nextIssueRows);
    if (nextExplanationLines) {
      explanationLines.push(nextExplanationLines);
    }
  }

  if (!hasSummary) {
    return null;
  }

  const uniqueIssueRows = getUniqueStringArrayValue(issueRows);
  return {
    status,
    issueCount: Math.max(issueCount ?? 0, uniqueIssueRows.length),
    issueRows: uniqueIssueRows,
    explanationLines: getLocalCouncilExplainabilityLines(explanationLines),
  };
}

export function buildLocalCouncilOverlayViewModel(
  overlay: LocalCouncilOverlay | Record<string, unknown> | null | undefined,
): LocalCouncilOverlayViewModel {
  const record = getRecordValue(overlay);
  const status = getStringValue(record?.status) || "unavailable";
  const supportTier = getStringValue(record?.support_tier) || "supplemental";
  const basis = getRecordValue(record?.basis) || {};
  const allowedSourceLabels = Array.from(
    new Set(
      getStringArrayValue(basis.allowed_sources).map((item) =>
        getLocalCouncilOverlayChannelLabel(item),
      ),
    ),
  );
  const sections = Array.isArray(record?.sections)
    ? record.sections
        .map((section) => {
          const sectionRecord = getRecordValue(section);
          if (!sectionRecord) {
            return null;
          }
          const channel = getStringValue(sectionRecord.channel);
          const title = getStringValue(sectionRecord.title);
          if (!channel || !title) {
            return null;
          }
          const items = Array.isArray(sectionRecord.items)
            ? sectionRecord.items
                .map((item) => {
                  const itemRecord = getRecordValue(item);
                  const itemTitle = getStringValue(itemRecord?.title);
                  if (!itemRecord || !itemTitle) {
                    return null;
                  }
                  const confidence = getStringValue(itemRecord.confidence);
                  const itemSupportTier =
                    getStringValue(itemRecord.support_tier) || supportTier;
                  return {
                    title: itemTitle,
                    snippet: getStringValue(itemRecord.snippet),
                    sourceName: getStringValue(itemRecord.source_name) || "보강 정보",
                    sourceUrl: getStringValue(itemRecord.source_url),
                    publishedAt: getStringValue(itemRecord.published_at),
                    confidenceLabel: getLocalCouncilOverlayConfidenceLabel(confidence),
                    supportTierLabel: getLocalCouncilOverlaySupportTierLabel(
                      itemSupportTier,
                    ),
                    provenanceSummary: buildLocalCouncilOverlayProvenanceSummary(
                      getRecordValue(itemRecord.provenance),
                    ),
                  } satisfies LocalCouncilOverlayItemViewModel;
                })
                .filter(
                  (
                    item,
                  ): item is LocalCouncilOverlayItemViewModel => Boolean(item),
                )
            : [];
          if (items.length === 0) {
            return null;
          }
          return {
            channel,
            channelLabel: getLocalCouncilOverlayChannelLabel(channel),
            title,
            summary: getStringValue(sectionRecord.summary),
            items,
          } satisfies LocalCouncilOverlaySectionViewModel;
        })
        .filter(
          (
            section,
          ): section is LocalCouncilOverlaySectionViewModel => Boolean(section),
        )
    : [];
  const itemCount = sections.reduce((count, section) => count + section.items.length, 0);
  const summaryLine =
    itemCount > 0
      ? `${sections.length}개 채널에서 ${itemCount}건의 보강 정보를 제공합니다.`
      : status === "disabled"
        ? "이 인물의 보강 정보는 현재 비활성화되어 있습니다."
        : "추가 보강 정보가 아직 연결되지 않았습니다.";

  return {
    status,
    statusLabel: getLocalCouncilOverlayStatusLabel(status),
    supportTierLabel: getLocalCouncilOverlaySupportTierLabel(supportTier),
    generatedAt: getStringValue(record?.generated_at),
    targetMemberId: getStringValue(basis.target_member_id),
    allowedSourceLabels,
    disclaimers: getStringArrayValue(record?.disclaimers),
    sections,
    summaryLine,
    hasContent: itemCount > 0,
  };
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
  const huboid = getStringValue(spotCheck.huboid);
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
  if (huboid) {
    rows.push({ label: "huboid", value: huboid });
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
      qualitySignalRows: [],
      sourceContractRows: [],
      sourceContractIssues: [],
      sourceContractExplanationLines: [],
      explanationLines: [],
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
  const sourceContractSummary = getRecordValue(record.source_contract_summary);

  return {
    statusRows,
    dataGapFlags,
    needsHumanReview,
    spotCheckTitle: getLocalCouncilSpotCheckTitle(normalizedSpotCheck),
    spotCheckRows: buildSpotCheckRows(normalizedSpotCheck),
    qualitySignalRows: buildQualitySignalRows(record.quality_signals),
    sourceContractRows: buildSourceContractSummaryRows(sourceContractSummary),
    sourceContractIssues: buildSourceContractIssueRows(sourceContractSummary),
    sourceContractExplanationLines: getStringArrayValue(
      sourceContractSummary?.explanation_lines,
    ),
    explanationLines: getStringArrayValue(record.explanation_lines),
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
