import { z } from "zod";

const trimmedStringSchema = z.string().trim().min(1);

const optionalTrimmedStringSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().min(1).optional(),
);

export const issueKeySchema = z.enum([
  "transport",
  "housing",
  "education",
  "care",
  "jobs",
  "safety",
  "climate",
  "welfare",
  "youth",
  "commerce",
]);

export const issueMatchLevelSchema = z.enum([
  "very_high",
  "high",
  "partial",
  "insufficient",
]);

export const evidenceStatusSchema = z.enum(["enough", "limited", "missing"]);

export const promiseSourceStatusSchema = z.enum([
  "official",
  "public_statement",
  "not_open_yet",
  "not_secured",
]);

export const sourceTypeSchema = z.enum([
  "official",
  "semi_official",
  "auxiliary",
]);

export const dataPhaseSchema = z.enum([
  "pre_registration",
  "registered",
  "campaign",
  "completed",
]);

export const chatEntryPointSchema = z.enum(["compare"]);
export const chatSelectionBasisSchema = z.enum([
  "all",
  "issue",
  "party",
  "manual",
  "evidence",
  "incumbent",
]);

export const chatMessageRoleSchema = z.enum(["user", "assistant"]);

export const sourceRefSchema = z.object({
  label: z.string(),
  source_type: sourceTypeSchema,
  as_of: z.string().nullable(),
  url: z.string().nullable(),
});

export const candidateIssueMatchSchema = z.object({
  issue_key: issueKeySchema,
  level: issueMatchLevelSchema,
  reasons: z.array(z.string()),
  matched_keywords: z.array(z.string()),
});

export const candidateBriefSchema = z.object({
  summary_lines: z.array(z.string()),
  differentiator: z.string().nullable(),
  evidence_status: evidenceStatusSchema,
  promise_source_status: promiseSourceStatusSchema,
  info_gap_flags: z.array(z.string()),
});

export const candidatePromiseOverlaySchema = z.object({
  promise_item_count: z.number(),
  representative_title: z.string().nullable(),
  issue_keys: z.array(issueKeySchema),
  source_label: z.string().nullable(),
  source_url: z.string().nullable(),
  promise_source_status: promiseSourceStatusSchema,
  issue_matches: z.array(candidateIssueMatchSchema),
});

export const candidateNewsOverlaySchema = z.object({
  evidence_status: evidenceStatusSchema,
  summary_text: z.string().nullable(),
  info_gap_flags: z.array(z.string()),
  issue_matches: z.array(candidateIssueMatchSchema),
});

export const candidateCompareFactSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const candidateCompareEntrySchema = z.object({
  facts: z.array(candidateCompareFactSchema),
  summary: z.array(z.string()),
  source_refs: z.array(sourceRefSchema),
  info_gap_flags: z.array(z.string()),
});

export const electionMetaSchema = z.object({
  election_id: z.string(),
  election_name: z.string(),
  election_day: z.string(),
  data_phase: dataPhaseSchema,
  as_of: z.string(),
});

export const userIssueProfileSchema = z.object({
  election_id: z.string(),
  contest_id: z.string(),
  selected_issue_keys: z.array(issueKeySchema),
  custom_keywords: z.array(z.string()),
  normalized_issue_keys: z.array(issueKeySchema),
  updated_at: z.string(),
});

export const localElectionChatConversationContextSchema = z.object({
  contest_id: z.string(),
  candidate_ids: z.array(z.string()),
  issue_profile_snapshot: userIssueProfileSchema.nullable(),
  entry_point: chatEntryPointSchema,
  selection_basis: chatSelectionBasisSchema,
  selection_label: z.string().nullable(),
});

export const localElectionChatConversationCreateRequestSchema = z.object({
  client_session_id: trimmedStringSchema.max(128),
  contest_id: trimmedStringSchema,
  candidate_ids: z.array(trimmedStringSchema).min(1).max(3),
  issue_profile_snapshot: userIssueProfileSchema.nullable(),
  entry_point: chatEntryPointSchema,
  selection_basis: chatSelectionBasisSchema,
  selection_label: z.string().trim().min(1).max(120).nullable(),
});

export const localElectionChatConversationResponseSchema = z.object({
  conversation_id: z.string(),
  client_session_id: z.string(),
  context: localElectionChatConversationContextSchema,
  message_count: z.number().int().min(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export const localElectionChatMessageCreateRequestSchema = z.object({
  client_session_id: trimmedStringSchema.max(128),
  question: trimmedStringSchema,
});

export const localElectionChatMessageRecordSchema = z.object({
  message_id: z.string(),
  role: chatMessageRoleSchema,
  content: z.string(),
  created_at: z.string(),
});

export const localElectionChatCitationSchema = z.object({
  label: z.string(),
  source_type: sourceTypeSchema,
  as_of: z.string().nullable(),
  snippet: z.string(),
  candidate_id: z.string().nullable(),
});

export const localElectionChatMessageResponseSchema = z.object({
  conversation_id: z.string(),
  user_message: localElectionChatMessageRecordSchema,
  assistant_message: localElectionChatMessageRecordSchema,
  citations: z.array(localElectionChatCitationSchema),
  info_gap_flags: z.array(z.string()),
  follow_up_suggestions: z.array(z.string()),
  used_candidate_ids: z.array(z.string()),
  used_issue_keys: z.array(issueKeySchema),
  answered_at: z.string(),
});

export const cityQuerySchema = z.object({
  city: trimmedStringSchema,
});

export const citySigunguQuerySchema = z.object({
  city: trimmedStringSchema,
  sigungu: trimmedStringSchema,
});

export const ballotsSearchParamsSchema = citySigunguQuerySchema.extend({
  emd: optionalTrimmedStringSchema,
});

export const candidateRecordSchema = z.object({
  candidate_id: z.string(),
  contest_id: z.string(),
  election_id: z.string(),
  election_code: z.string(),
  election_name: z.string(),
  city_code: z.number(),
  city_name: z.string(),
  town_code: z.string().nullable(),
  town_name: z.string().nullable(),
  district_name_raw: z.string(),
  name_ko: z.string(),
  name_hanja: z.string().nullable(),
  party_name: z.string().nullable(),
  gender: z.string(),
  birthdate_text: z.string().nullable(),
  age_text: z.string().nullable(),
  address: z.string().nullable(),
  job: z.string(),
  education: z.string(),
  career: z.string(),
  registration_date: z.string().nullable(),
  crime_text: z.string().nullable(),
  crime_parse_status: z.string().nullable(),
  crime_case_count: z.number().nullable(),
  crime_items: z.array(z.unknown()),
  photo_url: z.string().nullable(),
  detail_url: z.string().nullable(),
  source_scope_key: z.string(),
  source_scope_label: z.string(),
  source_kind: z.string(),
  source_file: z.string(),
  promise_overlay: candidatePromiseOverlaySchema.nullable().optional(),
  news_overlay: candidateNewsOverlaySchema.nullable().optional(),
  brief: candidateBriefSchema.nullable().optional(),
  issue_matches: z.array(candidateIssueMatchSchema).optional(),
  compare_entry: candidateCompareEntrySchema.nullable().optional(),
});

export const ballotItemSchema = z.object({
  contest_id: z.string(),
  election_code: z.string(),
  election_name: z.string(),
  ballot_subject_type: z.enum(["candidate_person", "party_list"]),
  office_level: z.string(),
  representation_type: z.enum(["single", "district", "proportional"]),
  special_region_type: z.string(),
  geographic_scope: z.string(),
  city_code: z.number(),
  city_name_canonical: z.string(),
  sigungu_name: z.string().nullable(),
  display_name: z.string(),
  parent_area_name: z.string().nullable(),
  seats: z.number().nullable(),
  candidates: z.array(candidateRecordSchema),
});

export const ambiguousOptionSchema = z.object({
  contest_id: z.string(),
  display_name: z.string(),
  parent_area_name: z.string().nullable(),
});

export const ambiguousBallotSchema = z.object({
  election_code: z.string(),
  election_name: z.string(),
  options: z.array(ambiguousOptionSchema),
});

export const ballotResponseSchema = z.object({
  city_name_canonical: z.string(),
  sigungu_name: z.string(),
  emd_name: z.string().nullable(),
  resolution_status: z.enum(["resolved", "partially_ambiguous", "ambiguous"]),
  ballot_count: z.number(),
  ballots: z.array(ballotItemSchema),
  ambiguous_ballots: z.array(ambiguousBallotSchema),
  meta: electionMetaSchema.nullable().optional(),
});

export const citiesResponseSchema = z.object({
  cities: z.array(z.string()),
});

export const sigunguResponseSchema = z.object({
  sigungu: z.array(z.string()),
});

export const emdResponseSchema = z.object({
  emd: z.array(z.string()),
});

export const assemblyMemberListMetaSchema = z.object({
  region: z.string(),
  district: z.string(),
});

export const assemblyMemberListItemSchema = z.object({
  mona_cd: z.string(),
  member_name: z.string(),
  /** 백엔드 AssemblyMemberListItem.party_name — null 허용 */
  party_name: z.string().nullable(),
  region: z.string(),
  district: z.string(),
  display_label: z.string(),
});

export const assemblyMemberListResponseSchema = z.object({
  meta: assemblyMemberListMetaSchema,
  items: z.array(assemblyMemberListItemSchema),
});

const localCouncilPayloadObjectSchema = z.record(z.string(), z.unknown());

const localCouncilFreshnessSchema = z
  .object({
    basis_kind: z.string().nullable().optional(),
    basis_timestamp: z.string().nullable().optional(),
    generated_at: z.string().nullable().optional(),
    source_mode: z.string().nullable().optional(),
    is_snapshot_based: z.boolean().nullable().optional(),
    note: z.string().nullable().optional(),
    lineage: z.unknown().optional(),
    staleness_bucket: z.string().nullable().optional(),
    explanation: z.string().nullable().optional(),
  })
  .catchall(z.unknown());

const localCouncilSpotCheckSchema = z
  .object({
    kind: z.string().nullable().optional(),
    person_key: z.string().nullable().optional(),
    source_kind: z.string().nullable().optional(),
    council_slug: z.string().nullable().optional(),
    huboid: z.string().nullable().optional(),
    member_source_docid: z.string().nullable().optional(),
  })
  .catchall(z.unknown());

const localCouncilSourceContractSummarySchema = localCouncilPayloadObjectSchema;

const localCouncilDiagnosticsSchema = z
  .object({
    publish_status: z.string().nullable().optional(),
    final_publish_status: z.string().nullable().optional(),
    agentic_review_status: z.string().nullable().optional(),
    agentic_enrichment_status: z.string().nullable().optional(),
    data_gap_flags: z.array(z.string()).optional(),
    needs_human_review: z.unknown().optional(),
    spot_check: localCouncilSpotCheckSchema.nullable().optional(),
    quality_signals: z.unknown().optional(),
    explanation_lines: z.unknown().optional(),
    source_contract_summary: localCouncilSourceContractSummarySchema.optional(),
  })
  .catchall(z.unknown());

export const localCouncilDataSourceSchema = z.enum(["backend", "local_sample"]);

export const localCouncilDistrictRefSchema = z.object({
  gu_code: z.string(),
  district_slug: z.string(),
  district_name: z.string().nullable().optional(),
});

export const localCouncilRosterPersonSchema = z
  .object({
    person_key: z.string(),
    office_type: z.string(),
    person_name: z.string(),
    party_name: z.string().nullable().optional(),
    profile_image_url: z.string().nullable().optional(),
  })
  .catchall(z.unknown());

export const localCouncilDistrictRosterResponseSchema = z.object({
  district_head: localCouncilRosterPersonSchema.or(localCouncilPayloadObjectSchema),
  council_members: z.array(localCouncilRosterPersonSchema),
  source_coverage: localCouncilPayloadObjectSchema,
  freshness: localCouncilFreshnessSchema,
});

export const localCouncilResolveResponseSchema = z.object({
  resolution_status: z.literal("resolved"),
  district: localCouncilDistrictRefSchema,
  roster: localCouncilDistrictRosterResponseSchema,
});

export const localCouncilPersonSummarySchema = z
  .object({
    headline: z.string(),
    grounded_summary: z.string(),
    summary_mode: z.enum(["agentic", "fallback", "none"]),
    summary_basis: localCouncilPayloadObjectSchema,
    evidence_digest: z.array(z.string()).optional(),
    fallback_reason: z.string().nullable().optional(),
    explanation_lines: z.unknown().optional(),
    source_contract_summary: localCouncilSourceContractSummarySchema.optional(),
  })
  .catchall(z.unknown());

export const localCouncilOverlayItemSchema = z
  .object({
    title: z.string(),
    snippet: z.string().nullable().optional(),
    source_name: z.string(),
    source_url: z.string().nullable().optional(),
    published_at: z.string().nullable().optional(),
    confidence: z.string().nullable().optional(),
    support_tier: z.enum(["supplemental", "exploratory"]).optional(),
    provenance: localCouncilPayloadObjectSchema.optional(),
  })
  .catchall(z.unknown());

export const localCouncilOverlaySectionSchema = z
  .object({
    channel: z.string(),
    title: z.string(),
    summary: z.string().nullable().optional(),
    items: z.array(localCouncilOverlayItemSchema).optional(),
  })
  .catchall(z.unknown());

export const localCouncilOverlaySchema = z
  .object({
    status: z
      .enum(["ready", "partial", "stale", "unavailable", "disabled"])
      .optional(),
    support_tier: z.enum(["supplemental", "exploratory"]).optional(),
    generated_at: z.string().nullable().optional(),
    basis: localCouncilPayloadObjectSchema.optional(),
    sections: z.array(localCouncilOverlaySectionSchema).optional(),
    disclaimers: z.array(z.string()).optional(),
  })
  .catchall(z.unknown());

export const localCouncilPersonDossierResponseSchema = z.object({
  person_key: z.string().optional(),
  person_name: z.string(),
  office_type: z.string(),
  party_name: z.string().nullable().optional(),
  profile_image_url: z.string().nullable().optional(),
  summary: localCouncilPersonSummarySchema,
  evidence: z.array(localCouncilPayloadObjectSchema).optional(),
  overlay: localCouncilOverlaySchema.optional(),
  official_profile: localCouncilPayloadObjectSchema,
  committees: z.array(localCouncilPayloadObjectSchema),
  bills: z.array(localCouncilPayloadObjectSchema),
  meeting_activity: z.array(localCouncilPayloadObjectSchema),
  finance_activity: z.array(localCouncilPayloadObjectSchema),
  elected_basis: localCouncilPayloadObjectSchema,
  source_refs: z.array(localCouncilPayloadObjectSchema),
  diagnostics: localCouncilDiagnosticsSchema.optional(),
  spot_check: localCouncilSpotCheckSchema.nullable().optional(),
  freshness: localCouncilFreshnessSchema.extend({
    explanation_lines: z.unknown().optional(),
  }),
  source_contract_summary: localCouncilSourceContractSummarySchema.optional(),
});

/** GET /api/assembly/v1/members/{mona_cd}/card — 백엔드 AssemblyMemberMetaCard */
export const assemblyMemberMetaCardSchema = z.object({
  member_mona_cd: z.string(),
  name: z.string(),
  party_name: z.string().nullable().optional(),
  profile_image_url: z.string().nullable().optional(),
  district_label: z.string().nullable().optional(),
  current_committee_name: z.string().nullable().optional(),
  election_count_text: z.string().nullable().optional(),
  campaign_booklet_pdf_url: z.string().nullable().optional(),
});

export const assemblyPledgeProgressLabelSchema = z.enum([
  "미착수",
  "진행중",
  "완료단계",
  "판단불가",
]);

export const assemblyPledgeSummaryMemberSchema = z.object({
  member_mona_cd: z.string(),
  name: z.string(),
  party_name: z.string().nullable().optional(),
  district_label: z.string().nullable().optional(),
  profile_image_url: z.string().nullable().optional(),
});

export const assemblyPledgeCategoryFulfillmentSchema = z.object({
  category_label: z.string(),
  rate_percent: z.number().int().nullable().optional(),
  rate_display: z.string(),
  total_promises: z.number().int().min(0),
  evaluated_promises: z.number().int().min(0),
  unknown_promises: z.number().int().min(0),
});

export const assemblyPledgeProgressBreakdownSchema = z.object({
  completed_count: z.number().int().min(0),
  in_progress_count: z.number().int().min(0),
  not_started_count: z.number().int().min(0),
  unknown_count: z.number().int().min(0),
});

export const assemblyPledgeSummaryResponseSchema = z.object({
  member: assemblyPledgeSummaryMemberSchema,
  fulfillment: z.object({
    overall_rate_percent: z.number().int().nullable().optional(),
    overall_rate_display: z.string(),
    total_promises: z.number().int().min(0),
    evaluated_promises: z.number().int().min(0),
    unknown_promises: z.number().int().min(0),
    progress_breakdown: assemblyPledgeProgressBreakdownSchema,
    categories: z.array(assemblyPledgeCategoryFulfillmentSchema),
  }),
  meta: z.object({
    data_source: z.string(),
    coverage_status: z.enum(["none", "partial", "complete"]),
    latest_run_id: z.string().nullable().optional(),
    evaluated_at: z.string().nullable().optional(),
  }),
});

export const assemblyPledgeEvidenceItemSchema = z.object({
  source_name: z.string(),
  source_title: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  summary: z.string(),
});

export const assemblyPledgeListItemSchema = z.object({
  rank: z.number().int().min(1),
  promise_id: z.string(),
  promise_text: z.string(),
  evaluation_status: z.string().nullable().optional(),
  progress_label: assemblyPledgeProgressLabelSchema,
  score: z.number().nullable().optional(),
  score_display: z.string().nullable().optional(),
  progress_rate_percent: z.number().int().nullable().optional(),
  confidence: z.number().nullable().optional(),
  user_summary_line: z.string().nullable().optional(),
  evidence_items: z.array(assemblyPledgeEvidenceItemSchema),
  updated_at: z.string().nullable().optional(),
});

export const assemblyPledgeListResponseSchema = z.object({
  member_mona_cd: z.string(),
  category_label: z.string(),
  limit: z.number().int().min(1).nullable().optional(),
  items: z.array(assemblyPledgeListItemSchema),
  meta: z.object({
    total_in_category: z.number().int().min(0),
    evaluated_in_category: z.number().int().min(0),
    category_rate_percent: z.number().int().nullable().optional(),
    category_rate_display: z.string(),
    data_source: z.string(),
  }),
});

export type AssemblyMemberListMeta = z.infer<typeof assemblyMemberListMetaSchema>;
export type AssemblyMemberListItem = z.infer<typeof assemblyMemberListItemSchema>;
export type AssemblyMemberListResponse = z.infer<typeof assemblyMemberListResponseSchema>;
export type LocalCouncilDataSource = z.infer<typeof localCouncilDataSourceSchema>;
export type LocalCouncilDistrictRef = z.infer<typeof localCouncilDistrictRefSchema>;
export type LocalCouncilRosterPerson = z.infer<typeof localCouncilRosterPersonSchema>;
export type LocalCouncilDistrictRosterResponse = z.infer<
  typeof localCouncilDistrictRosterResponseSchema
>;
export type LocalCouncilRosterScreenData = {
  district: LocalCouncilDistrictRef;
  roster: LocalCouncilDistrictRosterResponse;
};
export type LocalCouncilResolveResponse = z.infer<
  typeof localCouncilResolveResponseSchema
>;
export type LocalCouncilFreshness = z.infer<typeof localCouncilFreshnessSchema>;
export type LocalCouncilSpotCheck = z.infer<typeof localCouncilSpotCheckSchema>;
export type LocalCouncilDiagnostics = z.infer<typeof localCouncilDiagnosticsSchema>;
export type LocalCouncilPersonSummary = z.infer<typeof localCouncilPersonSummarySchema>;
export type LocalCouncilOverlay = z.infer<typeof localCouncilOverlaySchema>;
export type LocalCouncilPersonDossierResponse = z.infer<
  typeof localCouncilPersonDossierResponseSchema
>;
export type AssemblyMemberMetaCard = z.infer<typeof assemblyMemberMetaCardSchema>;
export type AssemblyPledgeSummaryResponse = z.infer<typeof assemblyPledgeSummaryResponseSchema>;
export type AssemblyPledgeCategoryFulfillment = z.infer<
  typeof assemblyPledgeCategoryFulfillmentSchema
>;
export type AssemblyPledgeProgressBreakdown = z.infer<
  typeof assemblyPledgeProgressBreakdownSchema
>;
export type AssemblyPledgeProgressLabel = z.infer<typeof assemblyPledgeProgressLabelSchema>;
export type AssemblyPledgeListResponse = z.infer<typeof assemblyPledgeListResponseSchema>;
export type AssemblyPledgeListItem = z.infer<typeof assemblyPledgeListItemSchema>;

export type BallotsSearchParams = z.infer<typeof ballotsSearchParamsSchema>;
export type IssueKey = z.infer<typeof issueKeySchema>;
export type IssueMatchLevel = z.infer<typeof issueMatchLevelSchema>;
export type EvidenceStatus = z.infer<typeof evidenceStatusSchema>;
export type PromiseSourceStatus = z.infer<typeof promiseSourceStatusSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type DataPhase = z.infer<typeof dataPhaseSchema>;
export type ChatEntryPoint = z.infer<typeof chatEntryPointSchema>;
export type ChatSelectionBasis = z.infer<typeof chatSelectionBasisSchema>;
export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;
export type SourceRef = z.infer<typeof sourceRefSchema>;
export type CandidateIssueMatch = z.infer<typeof candidateIssueMatchSchema>;
export type CandidateBrief = z.infer<typeof candidateBriefSchema>;
export type CandidatePromiseOverlay = z.infer<typeof candidatePromiseOverlaySchema>;
export type CandidateNewsOverlay = z.infer<typeof candidateNewsOverlaySchema>;
export type CandidateCompareFact = z.infer<typeof candidateCompareFactSchema>;
export type CandidateCompareEntry = z.infer<typeof candidateCompareEntrySchema>;
export type ElectionMeta = z.infer<typeof electionMetaSchema>;
export type UserIssueProfile = z.infer<typeof userIssueProfileSchema>;
export type LocalElectionChatConversationContext = z.infer<
  typeof localElectionChatConversationContextSchema
>;
export type LocalElectionChatConversationCreateRequest = z.infer<
  typeof localElectionChatConversationCreateRequestSchema
>;
export type LocalElectionChatConversationResponse = z.infer<
  typeof localElectionChatConversationResponseSchema
>;
export type LocalElectionChatMessageCreateRequest = z.infer<
  typeof localElectionChatMessageCreateRequestSchema
>;
export type LocalElectionChatMessageRecord = z.infer<
  typeof localElectionChatMessageRecordSchema
>;
export type LocalElectionChatCitation = z.infer<
  typeof localElectionChatCitationSchema
>;
export type LocalElectionChatMessageResponse = z.infer<
  typeof localElectionChatMessageResponseSchema
>;
export type CandidateRecord = z.infer<typeof candidateRecordSchema>;
export type BallotItem = z.infer<typeof ballotItemSchema>;
export type AmbiguousOption = z.infer<typeof ambiguousOptionSchema>;
export type AmbiguousBallot = z.infer<typeof ambiguousBallotSchema>;
export type BallotResponse = z.infer<typeof ballotResponseSchema>;
export type CitiesResponse = z.infer<typeof citiesResponseSchema>;
export type SigunguResponse = z.infer<typeof sigunguResponseSchema>;
export type EmdResponse = z.infer<typeof emdResponseSchema>;
