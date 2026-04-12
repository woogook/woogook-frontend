import assert from "node:assert/strict";
import test from "node:test";

import { sortRegionOptions } from "../src/features/regions/sortOptions";

test("sortRegionOptions sorts Hangul labels in Korean ascending order", () => {
  const options = ["서울특별시", "부산광역시", "대구광역시", "인천광역시"];

  assert.deepEqual(sortRegionOptions(options), [
    "대구광역시",
    "부산광역시",
    "서울특별시",
    "인천광역시",
  ]);
});

test("sortRegionOptions keeps numeric suffixes in natural order", () => {
  const options = ["개포10동", "개포2동", "개포1동"];

  assert.deepEqual(sortRegionOptions(options), [
    "개포1동",
    "개포2동",
    "개포10동",
  ]);
});

test("sortRegionOptions does not mutate the original array", () => {
  const options = ["종로구", "강남구", "성동구"];

  sortRegionOptions(options);

  assert.deepEqual(options, ["종로구", "강남구", "성동구"]);
});
