import { describe, expect, it } from "vitest";

import { assemblyPledgeSummaryResponseSchema } from "@/lib/schemas";

describe("assemblyPledgeSummaryResponseSchema", () => {
  it("preserves the not-started count in the progress breakdown contract", () => {
    const parsed = assemblyPledgeSummaryResponseSchema.parse({
      member: {
        member_mona_cd: "68P7228G",
        name: "진선미",
        party_name: "더불어민주당",
        district_label: "서울 강동구갑",
        profile_image_url: null,
      },
      fulfillment: {
        overall_rate_percent: 46,
        overall_rate_display: "46%",
        total_promises: 10,
        evaluated_promises: 9,
        unknown_promises: 1,
        progress_breakdown: {
          completed_count: 2,
          in_progress_count: 3,
          not_started_count: 4,
          unknown_count: 1,
        },
        categories: [],
      },
      meta: {
        data_source: "assembly.promise_evaluation_current",
        coverage_status: "partial",
        latest_run_id: "run-1",
        evaluated_at: "2026-04-10T18:14:05+09:00",
      },
    });

    expect(parsed.fulfillment.progress_breakdown.not_started_count).toBe(4);
  });
});
