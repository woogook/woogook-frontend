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
  address: z.string(),
  job: z.string(),
  education: z.string(),
  career: z.string(),
  registration_date: z.string(),
  crime_text: z.string(),
  crime_parse_status: z.string(),
  crime_case_count: z.number().nullable(),
  crime_items: z.array(z.unknown()),
  photo_url: z.string(),
  detail_url: z.string(),
  source_scope_key: z.string(),
  source_scope_label: z.string(),
  source_kind: z.string(),
  source_file: z.string(),
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
