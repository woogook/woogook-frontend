import { describe, expect, it } from "vitest";

import {
  buildProgressSegments,
  isRequestedAssemblyMember,
} from "@/features/assembly/AssemblyPledgeRatePage";

describe("buildProgressSegments", () => {
  it("includes not-started pledges as a visible progress segment", () => {
    const segments = buildProgressSegments({
      completed_count: 2,
      in_progress_count: 3,
      not_started_count: 4,
      unknown_count: 1,
    });

    expect(segments.map((segment) => segment.label)).toEqual([
      "완료단계",
      "진행중",
      "미착수",
      "판단불가",
    ]);
    expect(segments.find((segment) => segment.label === "미착수")?.count).toBe(4);
  });
});

describe("isRequestedAssemblyMember", () => {
  it("rejects stale member data when the response mona_cd differs from the URL", () => {
    expect(isRequestedAssemblyMember("68P7228G", "CCU1009B")).toBe(false);
  });

  it("accepts member data when the response mona_cd matches the URL after trimming", () => {
    expect(isRequestedAssemblyMember(" CCU1009B ", "CCU1009B")).toBe(true);
  });
});
