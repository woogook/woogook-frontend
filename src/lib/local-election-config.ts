export type LocalElectionDatasetKey =
  | "le2026_precandidate"
  | "le2022_candidate_local";

type LocalElectionPreset = {
  datasetKey: LocalElectionDatasetKey;
  electionId: string;
  electionName: string;
  electionDay: string;
  registrationStart: string;
  registrationEnd: string;
  campaignStart: string;
};

const LOCAL_ELECTION_PRESETS: Record<string, LocalElectionPreset> = {
  "0020260603": {
    datasetKey: "le2026_precandidate",
    electionId: "0020260603",
    electionName: "제9회 전국동시지방선거",
    electionDay: "2026-06-03",
    registrationStart: "2026-05-14",
    registrationEnd: "2026-05-15",
    campaignStart: "2026-05-21",
  },
  "0020220601": {
    datasetKey: "le2022_candidate_local",
    electionId: "0020220601",
    electionName: "제8회 전국동시지방선거",
    electionDay: "2022-06-01",
    registrationStart: "2022-05-12",
    registrationEnd: "2022-05-13",
    campaignStart: "2022-05-19",
  },
};

const DATASET_TO_ELECTION_ID: Record<LocalElectionDatasetKey, string> = {
  le2026_precandidate: "0020260603",
  le2022_candidate_local: "0020220601",
};

const DEFAULT_LOCAL_ELECTION_ID = "0020260603";

export function getLocalElectionPresetByElectionId(
  electionId?: string | null,
): LocalElectionPreset {
  if (electionId && LOCAL_ELECTION_PRESETS[electionId]) {
    return LOCAL_ELECTION_PRESETS[electionId];
  }
  return LOCAL_ELECTION_PRESETS[DEFAULT_LOCAL_ELECTION_ID];
}

export function getActiveLocalElectionElectionId(): string {
  const datasetKey = process.env.WOOGOOK_LOCAL_ELECTION_ACTIVE_DATASET?.trim();
  if (datasetKey === "le2022_candidate_local") {
    return DATASET_TO_ELECTION_ID.le2022_candidate_local;
  }
  return DATASET_TO_ELECTION_ID.le2026_precandidate;
}
