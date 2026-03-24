import { NextResponse } from "next/server";

const PG_UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "57P01",
  "57P02",
  "57P03",
]);

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    cause?: { code?: unknown };
    message?: unknown;
  };

  const directCode =
    typeof candidate.code === "string" ? candidate.code : undefined;
  const nestedCode =
    typeof candidate.cause?.code === "string" ? candidate.cause.code : undefined;
  const message =
    typeof candidate.message === "string" ? candidate.message : "";

  return (
    (directCode !== undefined && PG_UNAVAILABLE_CODES.has(directCode)) ||
    (nestedCode !== undefined && PG_UNAVAILABLE_CODES.has(nestedCode)) ||
    message.includes("connect") ||
    message.includes("Connection terminated") ||
    message.includes("ECONNREFUSED")
  );
}

export function buildDatabaseUnavailableResponse(scope: string) {
  return NextResponse.json(
    {
      error: `Failed to load ${scope}`,
      reason: "db_unavailable",
      message:
        "로컬 Postgres가 실행 중이지 않습니다. Docker Desktop과 postgres 컨테이너를 먼저 실행해주세요.",
    },
    { status: 503 },
  );
}
