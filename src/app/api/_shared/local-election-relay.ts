import { relayToBackend, type BackendRelayErrorBody } from "@/lib/local-election-backend";

const missingBackendBaseUrlBody: BackendRelayErrorBody = {
  error: "Missing WOOGOOK_BACKEND_BASE_URL",
  message: "지역 선거 데이터를 불러올 준비가 아직 되지 않았습니다. 잠시 후 다시 시도해주세요.",
};

const localElectionBackendUnavailableBody: BackendRelayErrorBody = {
  error: "Local election backend unavailable",
  message: "지역 선거 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
};

export function relayLocalElectionToBackend(path: string, init?: RequestInit) {
  return relayToBackend({
    path,
    init,
    missingBaseUrlBody: missingBackendBaseUrlBody,
    unavailableBody: localElectionBackendUnavailableBody,
    errorTag: "[local-election/backend-relay] error",
  });
}
