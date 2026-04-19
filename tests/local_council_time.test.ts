import assert from "node:assert/strict";
import test from "node:test";

import {
  formatLocalCouncilDateTime,
  formatLocalCouncilDateTimeOrOriginal,
} from "../src/features/local-council/time";

test("formatLocalCouncilDateTime keeps date-only strings without synthetic midnight", () => {
  assert.equal(formatLocalCouncilDateTime("2026-04-07"), "2026-04-07");
});

test("formatLocalCouncilDateTime keeps local datetime strings without timezone", () => {
  assert.equal(
    formatLocalCouncilDateTime("2026-04-08 10:06:00"),
    "2026-04-08 10:06:00",
  );
  assert.equal(
    formatLocalCouncilDateTime("2026-04-08T10:06:00"),
    "2026-04-08 10:06:00",
  );
});

test("formatLocalCouncilDateTime converts timezone-aware timestamps into KST", () => {
  assert.equal(
    formatLocalCouncilDateTime("2026-04-08T01:05:00Z"),
    "2026-04-08 10:05:00",
  );
  assert.equal(
    formatLocalCouncilDateTime("2026-04-08T10:10:00+09:00"),
    "2026-04-08 10:10:00",
  );
});

test("formatLocalCouncilDateTimeOrOriginal normalizes date labels with weekday suffixes", () => {
  assert.equal(
    formatLocalCouncilDateTimeOrOriginal("2026-03-25(수)"),
    "2026-03-25",
  );
});

test("formatLocalCouncilDateTimeOrOriginal keeps non-date explanatory strings untouched", () => {
  assert.equal(
    formatLocalCouncilDateTimeOrOriginal("최근 발행 묶음 기준이다."),
    "최근 발행 묶음 기준이다.",
  );
});
