import { describe, expect, it } from "vitest";

import { formatExcludedUnknownPromiseNotice } from "@/features/assembly/AssemblyPledgeCategoryTopPage";

describe("formatExcludedUnknownPromiseNotice", () => {
  it("uses the 판단불가 label for promises excluded from category averages", () => {
    expect(formatExcludedUnknownPromiseNotice(1)).toBe(
      "판단불가 1건은 평균 산정에서 제외됩니다.",
    );
  });
});
