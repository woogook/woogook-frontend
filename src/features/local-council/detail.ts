import {
  getLocalCouncilActivityTypeLabel,
  getLocalCouncilBillStageLabel,
  getLocalCouncilContentGroundingStatusLabel,
  getLocalCouncilDownloadActionLabel,
  getLocalCouncilOrdinanceStatusLabel,
  getLocalCouncilParticipationTypeLabel,
  getLocalCouncilRecordGroundingLevelLabel,
  getLocalCouncilSourceLabel,
} from "./data";

const heroImageKeys = ["profile_image_url", "photo_url", "image_url"] as const;

function getOfficeLabel(officeType: string) {
  const labels: Record<string, string> = {
    basic_head: "구청장",
    basic_council: "구의원",
    metro_council: "시·도의원",
  };

  return labels[officeType] || officeType;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function sanitizeExternalUrl(value: unknown) {
  const text = asText(value);
  if (!text) {
    return null;
  }

  try {
    const parsed = new URL(text);
    const hostname = parsed.hostname.toLowerCase();
    const isInvalidTld = hostname === "invalid" || hostname.endsWith(".invalid");

    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      isInvalidTld
    ) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function firstText(records: Record<string, unknown>[], keys: readonly string[]) {
  for (const record of records) {
    for (const key of keys) {
      const value = asText(record[key]);
      if (value) {
        return value;
      }
    }
  }
  return null;
}

function collectTextList(record: Record<string, unknown>, keys: readonly string[]) {
  const items: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (value: string) => {
    if (!seen.has(value)) {
      seen.add(value);
      items.push(value);
    }
  };

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      const text = value.trim();
      if (text) {
        pushUnique(text);
      }
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string") {
          const text = entry.trim();
          if (text) {
            pushUnique(text);
          }
          continue;
        }

        if (typeof entry === "number") {
          pushUnique(entry.toLocaleString("ko-KR"));
          continue;
        }

        const entryRecord = asRecord(entry);
        const text = firstText([entryRecord], ["label", "name", "title", "value"]);
        if (text) {
          pushUnique(text);
        }
      }
    }
  }

  return items;
}

function collectLinkItems(record: Record<string, unknown>) {
  const source = record.links ?? record.link_items ?? record.urls;
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((entry) => {
      const entryRecord = asRecord(entry);
      const url =
        asText(entryRecord.url) ??
        asText(entryRecord.href) ??
        asText(entryRecord.link_url) ??
        asText(entryRecord.source_url);
      if (!url) {
        return null;
      }

      return {
        label:
          asText(entryRecord.label) ??
          asText(entryRecord.name) ??
          asText(entryRecord.title) ??
          url,
        url,
      };
    })
    .filter((item): item is { label: string; url: string } => item !== null);
}

export interface SectionCardSourceLink {
  label: string;
  url: string;
}

function sourceLinkLabelFromRecord(
  record: Record<string, unknown>,
  fallbackLabel: string | null,
) {
  return (
    asText(record.label) ??
    asText(record.title) ??
    asText(record.name) ??
    asText(record.link_kind) ??
    asText(record.kind) ??
    asText(record.key) ??
    fallbackLabel ??
    null
  );
}

function collectSourceLinksFromSourceLinksField(
  record: Record<string, unknown>,
): SectionCardSourceLink[] {
  const sourceLinks = record.source_links;
  if (!Array.isArray(sourceLinks)) {
    return [];
  }

  return sourceLinks
    .map((entry) => {
      if (typeof entry === "string") {
        const url = sanitizeExternalUrl(entry);
        return url ? { label: entry, url } : null;
      }

      const entryRecord = asRecord(entry);
      const url =
        sanitizeExternalUrl(entryRecord.url) ??
        sanitizeExternalUrl(entryRecord.href) ??
        sanitizeExternalUrl(entryRecord.link_url) ??
        sanitizeExternalUrl(entryRecord.source_url);
      if (!url) {
        return null;
      }

      return {
        label:
          sourceLinkLabelFromRecord(entryRecord, null) ??
          url,
        url,
      };
    })
    .filter((item): item is SectionCardSourceLink => item !== null);
}

function collectSourceLinksFromLegacySourceUrls(
  record: Record<string, unknown>,
): SectionCardSourceLink[] {
  const sourceUrls = record.source_urls;
  if (!sourceUrls || typeof sourceUrls !== "object" || Array.isArray(sourceUrls)) {
    return [];
  }

  return Object.entries(sourceUrls)
    .map(([key, value]) => {
      if (typeof value === "string") {
        const url = sanitizeExternalUrl(value);
        return url ? { label: key, url } : null;
      }

      const valueRecord = asRecord(value);
      const url =
        sanitizeExternalUrl(valueRecord.url) ??
        sanitizeExternalUrl(valueRecord.href) ??
        sanitizeExternalUrl(valueRecord.link_url) ??
        sanitizeExternalUrl(valueRecord.source_url);
      if (!url) {
        return null;
      }

      return {
        label: sourceLinkLabelFromRecord(valueRecord, key) ?? key,
        url,
      };
    })
    .filter((item): item is SectionCardSourceLink => item !== null);
}

interface SectionCardSourcePayload {
  sourceUrl: string | null;
  sourceLinks: SectionCardSourceLink[];
}

function resolveSectionSourcePayloadFromRecord(
  record: Record<string, unknown> | null,
): SectionCardSourcePayload {
  if (!record) {
    return { sourceUrl: null, sourceLinks: [] };
  }

  const directSourceUrl = sanitizeExternalUrl(record.source_url);
  const sourceLinksFromArray = collectSourceLinksFromSourceLinksField(record);
  if (sourceLinksFromArray.length > 0) {
    return {
      sourceUrl: directSourceUrl,
      sourceLinks: directSourceUrl
        ? sourceLinksFromArray.filter((link) => link.url !== directSourceUrl)
        : sourceLinksFromArray,
    };
  }

  const legacyLinks = collectSourceLinksFromLegacySourceUrls(record);
  if (legacyLinks.length > 0) {
    if (directSourceUrl) {
      return {
        sourceUrl: directSourceUrl,
        sourceLinks: legacyLinks.filter((link) => link.url !== directSourceUrl),
      };
    }

    return {
      sourceUrl: legacyLinks[0].url,
      sourceLinks: legacyLinks.slice(1),
    };
  }

  return {
    sourceUrl: directSourceUrl,
    sourceLinks: [],
  };
}

function resolveSectionSourcePayload(args: {
  item: Record<string, unknown>;
  sectionSourceRefs: Record<string, unknown>[];
  preferredSourceKinds: string[];
  preferredSourceRoles: string[];
}): SectionCardSourcePayload {
  const itemSourceRef = asRecord(args.item.source_ref);
  const matchedSectionRef = findSectionRefMatchingItemSourceRef(
    itemSourceRef,
    args.sectionSourceRefs,
  );
  const preferredSectionRef = findPreferredSectionRef(
    args.sectionSourceRefs,
    args.preferredSourceKinds,
    args.preferredSourceRoles,
  );

  for (const sourceRecord of [
    args.item,
    itemSourceRef,
    matchedSectionRef,
    preferredSectionRef,
  ]) {
    const sourcePayload = resolveSectionSourcePayloadFromRecord(sourceRecord);
    if (sourcePayload.sourceUrl || sourcePayload.sourceLinks.length > 0) {
      return sourcePayload;
    }
  }

  return {
    sourceUrl: null,
    sourceLinks: [],
  };
}

function firstValue(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      const text = value.trim();
      if (text) {
        return text;
      }
    } else if (typeof value === "number") {
      return value.toLocaleString("ko-KR");
    }
  }
  return null;
}

export interface SectionCardDetailRow {
  label: string;
  value: string;
}

export interface SectionCardBadge {
  label: string;
  tone: "accent" | "subtle";
}

export interface SectionCardActions {
  viewUrl: string | null;
  viewLabel: string | null;
  downloadUrl: string | null;
  downloadLabel: string | null;
}

export interface SectionCardViewModel {
  headline: string;
  meta: string | null;
  detailRows: SectionCardDetailRow[];
  actions: SectionCardActions;
  sourceLabel: string | null;
  sourceUrl: string | null;
  sourceLinks: SectionCardSourceLink[];
  badges?: SectionCardBadge[];
  summaryLine?: string | null;
}

const sectionIdTokenMap: Record<string, string> = {
  "공식 활동": "official-activity",
  의안: "bills",
  회의: "meetings",
  "재정 활동": "finance-activity",
};

export function buildExpandableSectionContentId(title: string, index: number) {
  const trimmedTitle = title.trim();
  const mappedToken = sectionIdTokenMap[trimmedTitle];
  const titleToken = mappedToken ?? "section";

  return `local-council-section-card-${titleToken}-${index}-content`;
}

function findPreferredSectionRef(
  sectionSourceRefs: Record<string, unknown>[],
  preferredSourceKinds: string[],
  preferredSourceRoles: string[],
) {
  for (const preferredSourceKind of preferredSourceKinds) {
    const matchedSectionRef = sectionSourceRefs.find(
      (source) => asText(source.source_kind) === preferredSourceKind,
    );
    if (matchedSectionRef) {
      return matchedSectionRef;
    }
  }

  for (const preferredSourceRole of preferredSourceRoles) {
    const matchedSectionRef = sectionSourceRefs.find(
      (source) => asText(source.role) === preferredSourceRole,
    );
    if (matchedSectionRef) {
      return matchedSectionRef;
    }
  }

  return null;
}

function findSectionRefMatchingItemSourceRef(
  itemSourceRef: Record<string, unknown>,
  sectionSourceRefs: Record<string, unknown>[],
) {
  const itemSourceKind = asText(itemSourceRef.source_kind);
  const itemSourceRole = asText(itemSourceRef.role);

  if (itemSourceKind && itemSourceRole) {
    const exactMatch = sectionSourceRefs.find(
      (source) =>
        asText(source.source_kind) === itemSourceKind &&
        asText(source.role) === itemSourceRole,
    );
    if (exactMatch) {
      return exactMatch;
    }
  }

  if (itemSourceKind) {
    const sourceKindMatch = sectionSourceRefs.find(
      (source) => asText(source.source_kind) === itemSourceKind,
    );
    if (sourceKindMatch) {
      return sourceKindMatch;
    }
  }

  if (itemSourceRole) {
    const roleMatch = sectionSourceRefs.find(
      (source) => asText(source.role) === itemSourceRole,
    );
    if (roleMatch) {
      return roleMatch;
    }
  }

  return null;
}

function resolveSectionSourceContext(args: {
  item: Record<string, unknown>;
  sectionSourceRefs: Record<string, unknown>[];
  preferredSourceKinds: string[];
  preferredSourceRoles: string[];
}) {
  const itemSourceRef = asRecord(args.item.source_ref);
  const matchedSectionRef = findSectionRefMatchingItemSourceRef(
    itemSourceRef,
    args.sectionSourceRefs,
  );
  const preferredSectionRef = findPreferredSectionRef(
    args.sectionSourceRefs,
    args.preferredSourceKinds,
    args.preferredSourceRoles,
  );

  return {
    itemSourceRef,
    matchedSectionRef,
    preferredSectionRef,
  };
}

function sourceLabelFromSourceRecord(
  source: Record<string, unknown> | null,
  options?: { allowGenericLabel?: boolean },
) {
  if (!source) {
    return null;
  }

  const explicitLabel =
    asText(source.source_label) ??
    asText(source.source_title) ??
    asText(source.source_name) ??
    (options?.allowGenericLabel ? asText(source.label) ?? asText(source.name) ?? null : null) ??
    null;
  if (explicitLabel) {
    return explicitLabel;
  }

  const sourceKind = asText(source.source_kind);
  return sourceKind ? getLocalCouncilSourceLabel(sourceKind) : null;
}

export function buildPersonHeroMeta(person: Record<string, unknown>) {
  const officialProfile = asRecord(person.official_profile);
  const partyName = asText(person.party_name);
  const imageUrl = firstText([person, officialProfile], heroImageKeys);
  const educationItems = collectTextList(officialProfile, ["education", "education_items", "educations"]);
  const careerItems = collectTextList(officialProfile, ["career", "career_items", "history", "major_career"]);
  const summaryLine = asText(person.headline) ?? asText(asRecord(person.summary).headline);
  const links = collectLinkItems(officialProfile);

  const heroMeta: {
    name: string;
    officeLabel: string;
    partyName?: string;
    imageUrl?: string;
    educationItems: string[];
    careerItems: string[];
    summaryLine?: string;
    links?: { label: string; url: string }[];
  } = {
    name: asText(person.person_name) ?? "",
    officeLabel:
      asText(officialProfile.office_label) ??
      getOfficeLabel(asText(person.office_type) ?? ""),
    educationItems,
    careerItems,
  };

  if (partyName) {
    heroMeta.partyName = partyName;
  }

  if (imageUrl) {
    heroMeta.imageUrl = imageUrl;
  }

  if (summaryLine) {
    heroMeta.summaryLine = summaryLine;
  }

  if (links.length > 0) {
    heroMeta.links = links;
  }

  return heroMeta;
}

export function resolveSectionActionLink({
  item,
  sectionSourceRefs,
  preferredSourceKinds,
  preferredSourceRoles,
}: {
  item: Record<string, unknown>;
  sectionSourceRefs: Record<string, unknown>[];
  preferredSourceKinds: string[];
  preferredSourceRoles: string[];
}) {
  const directDownloadUrl = sanitizeExternalUrl(item.download_url);
  const sourcePayload = resolveSectionSourcePayload({
    item,
    sectionSourceRefs,
    preferredSourceKinds,
    preferredSourceRoles,
  });

  return {
    viewUrl: sourcePayload.sourceUrl,
    viewLabel: null,
    downloadUrl:
      directDownloadUrl ??
      sanitizeExternalUrl(asRecord(item.source_ref).download_url) ??
      sanitizeExternalUrl(
        findSectionRefMatchingItemSourceRef(
          asRecord(item.source_ref),
          sectionSourceRefs,
        )?.download_url,
      ) ??
      sanitizeExternalUrl(
        findPreferredSectionRef(
          sectionSourceRefs,
          preferredSourceKinds,
          preferredSourceRoles,
        )?.download_url,
      ),
    downloadLabel: null,
  };
}

function getLocatorAction(record: Record<string, unknown>) {
  const kind = asText(record.kind);
  const viewUrl = sanitizeExternalUrl(record.source_url);
  if (!viewUrl) {
    return { viewUrl: null, viewLabel: null };
  }

  const labels: Record<string, string> = {
    bill_detail: "의안 상세 열기",
    ordinance_registry: "자치법규 원문 보기",
    video_url: "영상 회의록 보기",
    council_minutes_popup: "회의록 위치 확인",
  };

  return {
    viewUrl,
    viewLabel: kind ? labels[kind] || "원문 보기" : "원문 보기",
  };
}

export function resolveSectionSourceLabel({
  item,
  sectionSourceRefs,
  preferredSourceKinds,
  preferredSourceRoles,
}: {
  item: Record<string, unknown>;
  sectionSourceRefs: Record<string, unknown>[];
  preferredSourceKinds: string[];
  preferredSourceRoles: string[];
}) {
  const directLabel = sourceLabelFromSourceRecord(item);
  if (directLabel) {
    return directLabel;
  }

  const { itemSourceRef, matchedSectionRef, preferredSectionRef } =
    resolveSectionSourceContext({
      item,
      sectionSourceRefs,
      preferredSourceKinds,
      preferredSourceRoles,
    });

  return (
    sourceLabelFromSourceRecord(itemSourceRef, { allowGenericLabel: true }) ??
    sourceLabelFromSourceRecord(matchedSectionRef, { allowGenericLabel: true }) ??
    sourceLabelFromSourceRecord(preferredSectionRef, { allowGenericLabel: true })
  );
}

export function buildSectionDetailRows(
  item: Record<string, unknown>,
  fields: { label: string; keys: string[] }[],
) {
  return fields
    .map(({ label, keys }) => {
      const value = firstValue(item, keys);
      return value ? { label, value } : null;
    })
    .filter((row): row is { label: string; value: string } => row !== null);
}

export function buildSectionCardViewModel(args: {
  item: Record<string, unknown>;
  titleKeys: string[];
  metaKeys: string[];
  detailFields: { label: string; keys: string[] }[];
  preferredSourceKinds: string[];
  preferredSourceRoles: string[];
  sectionSourceRefs: Record<string, unknown>[];
}): SectionCardViewModel {
  const actions = resolveSectionActionLink({
    item: args.item,
    sectionSourceRefs: args.sectionSourceRefs,
    preferredSourceKinds: args.preferredSourceKinds,
    preferredSourceRoles: args.preferredSourceRoles,
  });
  const sourcePayload = resolveSectionSourcePayload({
    item: args.item,
    sectionSourceRefs: args.sectionSourceRefs,
    preferredSourceKinds: args.preferredSourceKinds,
    preferredSourceRoles: args.preferredSourceRoles,
  });

  return {
    headline: firstValue(args.item, args.titleKeys) ?? "제목 확인 필요",
    meta: firstValue(args.item, args.metaKeys) ?? null,
    detailRows: buildSectionDetailRows(args.item, args.detailFields),
    actions,
    sourceLabel: resolveSectionSourceLabel({
      item: args.item,
      sectionSourceRefs: args.sectionSourceRefs,
      preferredSourceKinds: args.preferredSourceKinds,
      preferredSourceRoles: args.preferredSourceRoles,
    }),
    sourceUrl: actions.viewUrl,
    sourceLinks: sourcePayload.sourceLinks,
  };
}

export function buildBillActivityCardViewModel(args: {
  item: Record<string, unknown>;
  sectionSourceRefs: Record<string, unknown>[];
}): SectionCardViewModel {
  const locator = asRecord(args.item.official_record_locator);
  const locatorAction = getLocatorAction(locator);
  const fallbackActions = resolveSectionActionLink({
    item: args.item,
    sectionSourceRefs: args.sectionSourceRefs,
    preferredSourceKinds: [],
    preferredSourceRoles: ["official_activity"],
  });
  const sourcePayload = resolveSectionSourcePayload({
    item: args.item,
    sectionSourceRefs: args.sectionSourceRefs,
    preferredSourceKinds: [],
    preferredSourceRoles: ["official_activity"],
  });
  const participationType = asText(args.item.participation_type);
  const billStage = asText(args.item.bill_stage);
  const ordinanceStatus = asText(args.item.ordinance_status);
  const resultLabel = asText(args.item.result_label);
  const billSummary = asRecord(args.item.bill_summary);
  const statusParts = [
    billStage ? `의안 단계 ${getLocalCouncilBillStageLabel(billStage)}` : null,
    ordinanceStatus
      ? `조례 상태 ${getLocalCouncilOrdinanceStatusLabel(ordinanceStatus)}`
      : null,
    resultLabel ? `의결 결과 ${resultLabel}` : null,
  ].filter((value): value is string => Boolean(value));
  const detailRows: SectionCardDetailRow[] = [];
  if (statusParts.length > 0) {
    detailRows.push({
      label: "상태",
      value: statusParts.join(" · "),
    });
  }

  const proposedAt = asText(args.item.proposed_at) ?? asText(args.item.bill_date);
  if (proposedAt) {
    detailRows.push({
      label: "제안일",
      value: proposedAt,
    });
  }

  return {
    headline:
      firstValue(args.item, ["bill_title", "bill_name", "title"]) ??
      "의안 제목 확인 필요",
    meta:
      [asText(args.item.proposed_at), resultLabel]
        .filter((value): value is string => Boolean(value))
        .join(" · ") || null,
    badges: [
      participationType
        ? {
            label: getLocalCouncilParticipationTypeLabel(participationType),
            tone: participationType === "primary_sponsor" ? "accent" : "subtle",
          }
        : null,
      resultLabel ? { label: resultLabel, tone: "subtle" } : null,
    ].filter((badge): badge is SectionCardBadge => Boolean(badge)),
    summaryLine: asText(billSummary.summary_line) ?? null,
    detailRows,
    actions: {
      viewUrl: locatorAction.viewUrl ?? fallbackActions.viewUrl,
      viewLabel: locatorAction.viewLabel ?? fallbackActions.viewLabel,
      downloadUrl: fallbackActions.downloadUrl,
      downloadLabel: fallbackActions.downloadUrl
        ? getLocalCouncilDownloadActionLabel(fallbackActions.downloadLabel)
        : fallbackActions.downloadLabel,
    },
    sourceLabel: resolveSectionSourceLabel({
      item: args.item,
      sectionSourceRefs: args.sectionSourceRefs,
      preferredSourceKinds: [],
      preferredSourceRoles: ["official_activity"],
    }),
    sourceUrl: sourcePayload.sourceUrl,
    sourceLinks: sourcePayload.sourceLinks,
  };
}

export function buildMeetingActivityCardViewModel(args: {
  item: Record<string, unknown>;
  sectionSourceRefs: Record<string, unknown>[];
}): SectionCardViewModel {
  const locator = asRecord(args.item.official_record_locator);
  const locatorAction = getLocatorAction(locator);
  const fallbackActions = resolveSectionActionLink({
    item: args.item,
    sectionSourceRefs: args.sectionSourceRefs,
    preferredSourceKinds: [],
    preferredSourceRoles: ["official_activity"],
  });
  const sourcePayload = resolveSectionSourcePayload({
    item: args.item,
    sectionSourceRefs: args.sectionSourceRefs,
    preferredSourceKinds: [],
    preferredSourceRoles: ["official_activity"],
  });
  const contentGrounding = asRecord(args.item.content_grounding);
  const groundingStatus = asText(contentGrounding.status) ?? "unavailable";
  const activityType = asText(args.item.activity_type);
  const recordGroundingLevel = asText(args.item.record_grounding_level);
  const meetingDate = firstValue(args.item, ["meeting_date", "date"]);
  const supportedSummary =
    groundingStatus === "supported" ? asText(args.item.activity_summary_line) : null;
  const headline =
    [
      asText(args.item.session_label),
      asText(args.item.activity_label) ??
        (activityType ? getLocalCouncilActivityTypeLabel(activityType) : null),
    ]
      .filter((value): value is string => Boolean(value))
      .join(" · ") ||
    firstValue(args.item, ["meeting_name", "title"]) ||
    "회의 활동";
  const unsupportedSummary =
    recordGroundingLevel === "record_located" || locatorAction.viewUrl
      ? "공식 기록 위치는 확보됐지만 발언 요약은 아직 승격하지 않음"
      : recordGroundingLevel === "record_listed"
        ? "공식 기록 목록은 확인됐지만 발언 요약은 아직 승격하지 않음"
        : "공식 기록 대조 전이라 발언 요약은 아직 승격하지 않음";

  return {
    headline,
    meta: meetingDate,
    badges: [
      recordGroundingLevel
        ? {
            label: getLocalCouncilRecordGroundingLevelLabel(
              recordGroundingLevel,
            ),
            tone: "subtle",
          }
        : null,
      {
        label: getLocalCouncilContentGroundingStatusLabel(groundingStatus),
        tone: groundingStatus === "supported" ? "accent" : "subtle",
      },
    ].filter((badge): badge is SectionCardBadge => Boolean(badge)),
    summaryLine:
      groundingStatus === "supported" ? supportedSummary : unsupportedSummary,
    detailRows: buildSectionDetailRows(args.item, [
      { label: "회의일", keys: ["meeting_date", "date"] },
      { label: "회의명", keys: ["meeting_name"] },
    ]),
    actions: {
      viewUrl: locatorAction.viewUrl ?? fallbackActions.viewUrl,
      viewLabel: locatorAction.viewLabel ?? fallbackActions.viewLabel,
      downloadUrl: null,
      downloadLabel: null,
    },
    sourceLabel: resolveSectionSourceLabel({
      item: args.item,
      sectionSourceRefs: args.sectionSourceRefs,
      preferredSourceKinds: [],
      preferredSourceRoles: ["official_activity"],
    }),
    sourceUrl: sourcePayload.sourceUrl,
    sourceLinks: sourcePayload.sourceLinks,
  };
}
