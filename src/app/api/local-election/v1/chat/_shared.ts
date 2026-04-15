import { relayToBackend } from "@/lib/local-election-backend";

export async function proxyToBackend(
  requestOrPath: Request | string,
  pathOrInit?: string | RequestInit,
  maybeInit?: RequestInit,
): Promise<Response> {
  const path =
    typeof requestOrPath === "string" ? requestOrPath : (pathOrInit as string);
  const init =
    typeof requestOrPath === "string"
      ? (pathOrInit as RequestInit | undefined)
      : maybeInit;

  return relayToBackend({
    path,
    init,
    missingBaseUrlBody: {
      error: "Missing WOOGOOK_BACKEND_BASE_URL",
      message: "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    },
    unavailableBody: {
      error: "Chat backend unavailable",
      message: "비교 도우미가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    },
    errorTag: "[local-election/chat-proxy] error",
  });
}
