const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_ONLY_WITH_LABEL_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})\s*\([^)]*\)$/;
const LOCAL_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;
const ISO_DATETIME_WITH_TIMEZONE_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const KST_TIME_ZONE = "Asia/Seoul";

function formatDateInKst(date: Date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: KST_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

export function formatLocalCouncilDateTime(
  input: string | Date | null | undefined,
): string | null {
  if (!input) {
    return null;
  }

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : formatDateInKst(input);
  }

  const raw = input.trim();
  if (!raw) {
    return null;
  }

  const dateOnlyMatch = raw.match(DATE_ONLY_PATTERN);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${year}-${month}-${day}`;
  }

  const dateOnlyWithLabelMatch = raw.match(DATE_ONLY_WITH_LABEL_PATTERN);
  if (dateOnlyWithLabelMatch) {
    const [, year, month, day] = dateOnlyWithLabelMatch;
    return `${year}-${month}-${day}`;
  }

  const localDateTimeMatch = raw.match(LOCAL_DATETIME_PATTERN);
  if (localDateTimeMatch) {
    const [, year, month, day, hour, minute, second = "00"] = localDateTimeMatch;
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  if (!ISO_DATETIME_WITH_TIMEZONE_PATTERN.test(raw)) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatDateInKst(parsed);
}

export function formatLocalCouncilDateTimeOrOriginal(
  input: string | Date | null | undefined,
) {
  const formatted = formatLocalCouncilDateTime(input);
  if (formatted) {
    return formatted;
  }

  if (typeof input === "string") {
    const raw = input.trim();
    return raw || null;
  }

  return null;
}
