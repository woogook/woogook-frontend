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
export type CandidateRecord = z.infer<typeof candidateRecordSchema>;
export type BallotItem = z.infer<typeof ballotItemSchema>;
export type AmbiguousOption = z.infer<typeof ambiguousOptionSchema>;
export type AmbiguousBallot = z.infer<typeof ambiguousBallotSchema>;
export type BallotResponse = z.infer<typeof ballotResponseSchema>;
export type CitiesResponse = z.infer<typeof citiesResponseSchema>;
export type SigunguResponse = z.infer<typeof sigunguResponseSchema>;
export type EmdResponse = z.infer<typeof emdResponseSchema>;
