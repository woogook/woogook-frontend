import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import dossiers from "../src/data/samples/sample_local_council_gangdong_person_dossiers.json";
import type { LocalCouncilPersonDossierResponse } from "../src/lib/schemas";
import {
  buildBillActivityCardViewModel,
  buildPersonHeroMeta,
  resolveSectionActionLink,
  buildSectionDetailRows,
  buildSectionCardViewModel,
  buildExpandableSectionContentId,
  buildMeetingActivityCardViewModel,
} from "../src/features/local-council/detail";
import {
  buildLocalCouncilSourceContractSummaryViewModel,
  buildLocalCouncilOverlayViewModel,
  buildLocalCouncilDiagnosticsViewModel,
  getLocalCouncilActivityTypeLabel,
  getLocalCouncilBillStageLabel,
  getLocalCouncilContentGroundingStatusLabel,
  getLocalCouncilDataGapFlagLabel,
  getLocalCouncilDownloadActionLabel,
  getLocalCouncilFreshnessDetailRows,
  getLocalCouncilOfficeExplanation,
  getLocalCouncilOrdinanceStatusLabel,
  getLocalCouncilParticipationTypeLabel,
  getLocalCouncilRecordGroundingLevelLabel,
  getLocalCouncilSummaryBasisLabels,
  getLocalCouncilSummaryEvidenceDigest,
} from "../src/features/local-council/data";

function resolveWorkspaceAlias(request: string) {
  const candidateBase = path.join(process.cwd(), "src", request.slice(2));
  const candidates = [
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}.js`,
    `${candidateBase}.jsx`,
    path.join(candidateBase, "index.ts"),
    path.join(candidateBase, "index.tsx"),
    path.join(candidateBase, "index.js"),
    path.join(candidateBase, "index.jsx"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

function loadLocalCouncilPersonDetailView(options?: {
  expandedKey?: string | null;
}) {
  const runtimeRequire = createRequire(__filename);
  const moduleLoader = Module as typeof Module & {
    _resolveFilename: (
      request: string,
      parent: unknown,
      isMain: boolean,
      options: unknown,
    ) => string;
    _load: (request: string, parent: unknown, isMain: boolean) => unknown;
  };
  const originalResolveFilename = moduleLoader._resolveFilename;
  const originalLoad = moduleLoader._load;
  const actualReact = runtimeRequire("react") as typeof import("react");

  moduleLoader._resolveFilename = (request, parent, isMain, options) => {
    if (request.startsWith("@/")) {
      return resolveWorkspaceAlias(request);
    }

    return originalResolveFilename(request, parent, isMain, options);
  };
  moduleLoader._load = (request, parent, isMain) => {
    if (request === "react" && options?.expandedKey !== undefined) {
      return {
        ...actualReact,
        useState: (initialValue: unknown) =>
          typeof initialValue === "boolean"
            ? [initialValue, () => {}]
            : [options.expandedKey ?? null, () => {}],
      };
    }

    return originalLoad(request, parent, isMain);
  };

  try {
    const componentPath = runtimeRequire.resolve(
      "../src/features/local-council/components/LocalCouncilPersonDetailView",
    );
    delete runtimeRequire.cache[componentPath];
    const componentModule = runtimeRequire(componentPath);
    return componentModule.default as typeof import("../src/features/local-council/components/LocalCouncilPersonDetailView").default;
  } finally {
    moduleLoader._resolveFilename = originalResolveFilename;
    moduleLoader._load = originalLoad;
  }
}

function loadLocalCouncilRosterView() {
  const runtimeRequire = createRequire(__filename);
  const moduleLoader = Module as typeof Module & {
    _resolveFilename: (
      request: string,
      parent: unknown,
      isMain: boolean,
      options: unknown,
    ) => string;
  };
  const originalResolveFilename = moduleLoader._resolveFilename;

  moduleLoader._resolveFilename = (request, parent, isMain, options) => {
    if (request.startsWith("@/")) {
      return resolveWorkspaceAlias(request);
    }

    return originalResolveFilename(request, parent, isMain, options);
  };

  try {
    const componentModule = runtimeRequire(
      "../src/features/local-council/components/LocalCouncilRosterView",
    );
    return componentModule.default as typeof import("../src/features/local-council/components/LocalCouncilRosterView").default;
  } finally {
    moduleLoader._resolveFilename = originalResolveFilename;
  }
}

test("buildPersonHeroMeta hides missing optional profile fields", () => {
  const result = buildPersonHeroMeta({
    person_name: "이수희",
    office_type: "basic_head",
    summary: {
      headline: "이수희 공식 근거 요약",
      grounded_summary: "",
      summary_mode: "fallback",
      summary_basis: {},
    },
    official_profile: {},
    committees: [],
    bills: [],
    meeting_activity: [],
    finance_activity: [],
    elected_basis: {},
    source_refs: [],
    freshness: {},
  });

  assert.equal(result.name, "이수희");
  assert.equal(result.officeLabel, "구청장");
  assert.equal(result.educationItems.length, 0);
  assert.equal(result.careerItems.length, 0);
  assert.equal("partyName" in result, false);
  assert.equal("imageUrl" in result, false);
  assert.equal("links" in result, false);
});

test("buildPersonHeroMeta reads image, education, career, and links from flexible profile keys", () => {
  const result = buildPersonHeroMeta({
    person_name: "이수희",
    official_profile: {
      office_label: "강동구청장",
      profile_image_url: "https://example.com/profile.jpg",
      education_items: ["서울대학교 행정대학원"],
      career_items: ["강동구청장", "서울시의원"],
      links: [{ label: "공식 프로필", url: "https://example.com/profile" }],
    },
    summary: {
      headline: "이수희 공식 근거 요약",
      grounded_summary: "",
      summary_mode: "fallback",
      summary_basis: {},
    },
    committees: [],
    bills: [],
    meeting_activity: [],
    finance_activity: [],
    elected_basis: {},
    source_refs: [],
    freshness: {},
  });

  assert.equal(result.imageUrl, "https://example.com/profile.jpg");
  assert.deepEqual(result.educationItems, ["서울대학교 행정대학원"]);
  assert.deepEqual(result.careerItems, ["강동구청장", "서울시의원"]);
  assert.equal(result.links?.[0]?.label, "공식 프로필");
});

test("resolveSectionActionLink prefers preferred source kinds in list order", () => {
  const result = resolveSectionActionLink({
    item: {
      source_ref: {
        source_kind: "irrelevant",
      },
    },
    sectionSourceRefs: [
      {
        source_kind: "secondary",
        download_url: "https://example.com/secondary-file.pdf",
        source_url: "https://example.com/secondary-view",
      },
      {
        source_kind: "primary",
        download_url: "https://example.com/primary-file.pdf",
        source_url: "https://example.com/primary-view",
      },
    ],
    preferredSourceKinds: ["primary", "secondary"],
    preferredSourceRoles: [],
  });

  assert.deepEqual(result, {
    viewUrl: "https://example.com/primary-view",
    viewLabel: null,
    downloadUrl: "https://example.com/primary-file.pdf",
    downloadLabel: null,
  });
});

test("resolveSectionActionLink prefers direct item URLs over nested source_ref and section fallback", () => {
  const result = resolveSectionActionLink({
    item: {
      download_url: "https://example.com/direct-file.pdf",
      source_url: "https://example.com/direct-view",
      source_ref: {
        source_kind: "local_finance_365",
        download_url: "https://example.com/nested-file.pdf",
        source_url: "https://example.com/nested-view",
      },
    },
    sectionSourceRefs: [
      {
        source_kind: "local_finance_365",
        source_url: "https://example.com/fallback-view",
        download_url: "https://example.com/fallback-file.pdf",
      },
    ],
    preferredSourceKinds: ["local_finance_365"],
    preferredSourceRoles: [],
  });

  assert.deepEqual(result, {
    viewUrl: "https://example.com/direct-view",
    viewLabel: null,
    downloadUrl: "https://example.com/direct-file.pdf",
    downloadLabel: null,
  });
});

test("resolveSectionActionLink falls back to section refs when item URLs are missing", () => {
  const result = resolveSectionActionLink({
    item: {
      source_ref: {
        source_kind: "local_finance_365",
      },
    },
    sectionSourceRefs: [
      {
        source_kind: "local_finance_365",
        source_url: "https://example.com/fallback-view",
        download_url: "https://example.com/fallback-file.pdf",
      },
    ],
    preferredSourceKinds: ["local_finance_365"],
    preferredSourceRoles: [],
  });

  assert.deepEqual(result, {
    viewUrl: "https://example.com/fallback-view",
    viewLabel: null,
    downloadUrl: "https://example.com/fallback-file.pdf",
    downloadLabel: null,
  });
});

test("resolveSectionActionLink falls back by preferred section role when source kind varies", () => {
  const result = resolveSectionActionLink({
    item: {},
    sectionSourceRefs: [
      {
        source_kind: "mapo_council_official_activity",
        role: "official_activity",
        source_url: "https://example.com/mapo-activity",
      },
      {
        source_kind: "local_finance_365",
        role: "finance_activity",
        source_url: "https://example.com/finance",
      },
    ],
    preferredSourceKinds: [],
    preferredSourceRoles: ["official_activity"],
  });

  assert.deepEqual(result, {
    viewUrl: "https://example.com/mapo-activity",
    viewLabel: null,
    downloadUrl: null,
    downloadLabel: null,
  });
});

test("resolveSectionActionLink matches item source_kind before generic preferred role fallback", () => {
  const result = resolveSectionActionLink({
    item: {
      source_ref: {
        source_kind: "songpa_council_official_activity",
      },
    },
    sectionSourceRefs: [
      {
        source_kind: "gangdong_council_official_activity",
        role: "official_activity",
        source_url: "https://example.com/gangdong-activity",
      },
      {
        source_kind: "songpa_council_official_activity",
        role: "official_activity",
        source_url: "https://example.com/songpa-activity",
      },
    ],
    preferredSourceKinds: [],
    preferredSourceRoles: ["official_activity"],
  });

  assert.deepEqual(result, {
    viewUrl: "https://example.com/songpa-activity",
    viewLabel: null,
    downloadUrl: null,
    downloadLabel: null,
  });
});

test("resolveSectionActionLink matches item role before generic preferred kind fallback", () => {
  const result = resolveSectionActionLink({
    item: {
      source_ref: {
        role: "finance_activity_archive",
      },
    },
    sectionSourceRefs: [
      {
        source_kind: "local_finance_365",
        role: "finance_activity",
        source_url: "https://example.com/finance-primary",
      },
      {
        source_kind: "local_finance_365_archive",
        role: "finance_activity_archive",
        source_url: "https://example.com/finance-archive",
      },
    ],
    preferredSourceKinds: ["local_finance_365"],
    preferredSourceRoles: ["finance_activity"],
  });

  assert.deepEqual(result, {
    viewUrl: "https://example.com/finance-archive",
    viewLabel: null,
    downloadUrl: null,
    downloadLabel: null,
  });
});

test("buildPersonHeroMeta deduplicates repeated education and career items", () => {
  const result = buildPersonHeroMeta({
    person_name: "이수희",
    office_type: "basic_head",
    summary: {
      headline: "이수희 공식 근거 요약",
      grounded_summary: "",
      summary_mode: "fallback",
      summary_basis: {},
    },
    official_profile: {
      education: "서울대학교 행정대학원",
      education_items: ["서울대학교 행정대학원", "고려대학교 정책대학원"],
      career: ["강동구청장"],
      career_items: ["강동구청장", "서울시의원"],
    },
    committees: [],
    bills: [],
    meeting_activity: [],
    finance_activity: [],
    elected_basis: {},
    source_refs: [],
    freshness: {},
  });

  assert.deepEqual(result.educationItems, [
    "서울대학교 행정대학원",
    "고려대학교 정책대학원",
  ]);
  assert.deepEqual(result.careerItems, ["강동구청장", "서울시의원"]);
});

test("buildSectionDetailRows keeps only populated fields", () => {
  const rows = buildSectionDetailRows(
    {
      activity_type: "expense",
      activity_date: "2026-04-01",
      amount: 1250000,
      currency: "KRW",
    },
    [
      { label: "활동 유형", keys: ["activity_type"] },
      { label: "기준 일자", keys: ["activity_date"] },
      { label: "금액", keys: ["amount"] },
      { label: "비고", keys: ["note", "memo"] },
    ],
  );

  assert.deepEqual(rows, [
    { label: "활동 유형", value: "expense" },
    { label: "기준 일자", value: "2026-04-01" },
    { label: "금액", value: "1,250,000" },
  ]);
});

test("buildExpandableSectionContentId returns a stable whitespace-free id", () => {
  assert.equal(
    buildExpandableSectionContentId("공식 활동", 0),
    "local-council-section-card-official-activity-0-content",
  );
  assert.equal(
    buildExpandableSectionContentId("재정 활동", 3),
    "local-council-section-card-finance-activity-3-content",
  );
});

test("local council helpers normalize evidence digest, freshness, diagnostics, and terminology copy", () => {
  assert.deepEqual(
    getLocalCouncilSummaryEvidenceDigest({
      evidence_digest: ["공식 프로필 1건", "의안 2건", "회의 활동 1건"],
    }),
    ["공식 프로필 1건", "의안 2건", "회의 활동 1건"],
  );
  assert.deepEqual(
    getLocalCouncilSummaryBasisLabels({
      source_kinds: [
        "gangdong_district_head_official_profile",
        "local_finance_365",
      ],
    }),
    ["강동구청장실 공식 프로필", "지방재정365"],
  );
  assert.deepEqual(
    getLocalCouncilFreshnessDetailRows({
      basis_kind: "snapshot_batch_finished_at",
      basis_timestamp: "2026-04-08T10:10:00+09:00",
      generated_at: "2026-04-08T10:11:00+09:00",
      source_mode: "stored_projection_only",
      is_snapshot_based: true,
      note: "강동구 구청장 상세 미리보기",
    }),
    [
      { label: "기준 종류", value: "스냅샷 배치 완료 시각" },
      { label: "기준 시각", value: "2026-04-08T10:10:00+09:00" },
      { label: "생성 시각", value: "2026-04-08T10:11:00+09:00" },
      { label: "수집 모드", value: "저장된 projection만 사용" },
      { label: "스냅샷 기반", value: "예" },
      { label: "메모", value: "강동구 구청장 상세 미리보기" },
    ],
  );
  assert.deepEqual(
    buildLocalCouncilDiagnosticsViewModel({
      publish_status: "publishable",
      final_publish_status: "publishable",
      agentic_review_status: "pass",
      agentic_enrichment_status: "success",
      data_gap_flags: ["no_finance_activity"],
      needs_human_review: [
        {
          reason_code: "member_source_docid_check",
          person_key:
            "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
          note: "1인 spot-check 대상",
        },
      ],
      spot_check: {
        kind: "member_source_docid",
        council_slug: "seoul-gangdong",
        huboid: "600000001",
        member_source_docid: "CLIKM20220000022640",
        person_key:
          "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
      },
      quality_signals: {
        official_profile: {
          count: 0,
          status: "missing",
          confidence: "low",
          severity: "warning",
        },
        bills: {
          count: 2,
          status: "confirmed",
          confidence: "high",
          severity: "info",
        },
      },
      source_contract_summary: {
        issue_count: 1,
        issues: [
          {
            issue_code: "missing_role",
            source_kind: "local_council_portal_members",
            role: "official_profile",
          },
        ],
        explanation_lines: ["official_profile source에 role이 비어 있다."],
      },
      explanation_lines: [
        "최종 발행 상태: publishable.",
        "출처 계약 이슈: 1건.",
      ],
    }),
    {
      statusRows: [
        { label: "발행 상태", value: "publishable" },
        { label: "최종 발행 상태", value: "publishable" },
        { label: "agentic 검토", value: "pass" },
        { label: "agentic 보강", value: "success" },
      ],
      dataGapFlags: ["no_finance_activity"],
      needsHumanReview: [
        "member_source_docid_check · 1인 spot-check 대상 · seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
      ],
      spotCheckTitle: "구의원 spot-check",
      spotCheckRows: [
        { label: "유형", value: "member_source_docid" },
        {
          label: "대상",
          value:
            "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
        },
        { label: "의회", value: "seoul-gangdong" },
        { label: "huboid", value: "600000001" },
        { label: "member_source_docid", value: "CLIKM20220000022640" },
      ],
      qualitySignalRows: [
        { label: "공식 프로필", value: "0건 · missing · low · warning" },
        { label: "의안", value: "2건 · confirmed · high · info" },
      ],
      sourceContractRows: [{ label: "출처 계약 이슈", value: "1건" }],
      sourceContractIssues: ["missing_role · 지방의정포털 의원 정보 · official_profile"],
      sourceContractExplanationLines: ["official_profile source에 role이 비어 있다."],
      explanationLines: [
        "최종 발행 상태: publishable.",
        "출처 계약 이슈: 1건.",
      ],
    },
  );
  assert.equal(
    getLocalCouncilOfficeExplanation("basic_head"),
    "구청장은 구 행정을 총괄하는 단체장입니다.",
  );
});

test("local council activity grounding helpers translate labels conservatively", () => {
  assert.equal(getLocalCouncilParticipationTypeLabel("primary_sponsor"), "대표발의");
  assert.equal(getLocalCouncilParticipationTypeLabel("listed_activity"), "의안 참여 기록");
  assert.equal(getLocalCouncilBillStageLabel("approved"), "가결");
  assert.equal(
    getLocalCouncilOrdinanceStatusLabel("approved_not_confirmed"),
    "가결 후 공포 전",
  );
  assert.equal(
    getLocalCouncilRecordGroundingLevelLabel("record_located"),
    "공식 기록 위치 확인",
  );
  assert.equal(
    getLocalCouncilContentGroundingStatusLabel("unavailable"),
    "내용 검토 전",
  );
  assert.equal(getLocalCouncilActivityTypeLabel("district_question"), "구정질문");
  assert.equal(
    getLocalCouncilDataGapFlagLabel(
      "uncollected:district_head_minutes_person_linkage",
    ),
    "구청장 개인 회의 활동 linkage는 아직 수집/검토 전입니다.",
  );
  assert.equal(getLocalCouncilDownloadActionLabel(null), "원문 다운로드");
});

test("buildLocalCouncilSourceContractSummaryViewModel merges richer later payloads", () => {
  const summary = buildLocalCouncilSourceContractSummaryViewModel([
    {
      status: "ok",
      issue_count: 0,
      issues: [],
      explanation_lines: ["summary source contract line"],
    },
    {
      issue_count: 2,
      issues: [
        {
          issue_code: "invalid_source_url",
          source_kind: "local_finance_365",
          role: "finance_activity_source",
        },
        "missing_source_display_label",
      ],
      explanation_lines: ["diagnostics source contract line"],
    },
  ]);

  assert.deepEqual(summary, {
    status: "ok",
    issueCount: 2,
    issueRows: [
      "invalid_source_url · 지방재정365 · finance_activity_source",
      "missing_source_display_label",
    ],
    explanationLines: [
      "summary source contract line",
      "diagnostics source contract line",
    ],
  });
});

test("local council helpers normalize overlay payload into supplemental view model", () => {
  const overlay = buildLocalCouncilOverlayViewModel({
    status: "ready",
    support_tier: "supplemental",
    generated_at: "2026-04-09T12:00:00+09:00",
    basis: {
      allowed_sources: ["news_article", "council_site"],
      target_member_id: "seoul-gangdong:district-head",
    },
    sections: [
      {
        channel: "news_article",
        title: "최근 보도",
        summary: "공식 결정적 결과를 보강하는 뉴스 맥락이다.",
        items: [
          {
            title: "강동구청장, 도서관 확충 추진",
            snippet: "추가 보강 정보 요약",
            source_name: "강동뉴스",
            source_url: "https://example.com/news/1",
            published_at: "2026-04-09T09:00:00+09:00",
            confidence: "high",
            support_tier: "supplemental",
            provenance: {
              source_kind: "news_article",
              document_id: "news-001",
            },
          },
        ],
      },
    ],
    disclaimers: ["보강 정보는 공식 결정적 결과를 대체하지 않습니다."],
  });

  assert.equal(overlay.statusLabel, "준비 완료");
  assert.equal(overlay.supportTierLabel, "보강 정보");
  assert.deepEqual(overlay.allowedSourceLabels, ["뉴스", "의회·공개자료"]);
  assert.equal(overlay.summaryLine, "1개 채널에서 1건의 보강 정보를 제공합니다.");
  assert.equal(overlay.sections[0]?.channelLabel, "뉴스");
  assert.equal(overlay.sections[0]?.items[0]?.confidenceLabel, "신뢰 높음");
  assert.equal(
    overlay.sections[0]?.items[0]?.provenanceSummary,
    "news_article · news-001",
  );
});

test("buildSectionCardViewModel adds symmetric actions for bills, meetings, and finance items", () => {
  const commonSourceRefs = [
    {
      source_kind: "mapo_council_official_activity",
      role: "official_activity",
      source_url: "https://example.com/bills",
    },
    {
      source_kind: "local_finance_365",
      source_url: "https://example.com/finance",
    },
  ];

  const bill = buildSectionCardViewModel({
    item: { bill_title: "조례안", proposed_at: "2026-04-07" },
    titleKeys: ["bill_title"],
    metaKeys: ["proposed_at"],
    detailFields: [{ label: "제안일", keys: ["proposed_at"] }],
    preferredSourceKinds: [],
    preferredSourceRoles: ["official_activity"],
    sectionSourceRefs: commonSourceRefs,
  });

  const finance = buildSectionCardViewModel({
    item: { title: "예산 집행", amount: 1250000 },
    titleKeys: ["title"],
    metaKeys: ["amount"],
    detailFields: [{ label: "금액", keys: ["amount"] }],
    preferredSourceKinds: ["local_finance_365"],
    preferredSourceRoles: [],
    sectionSourceRefs: commonSourceRefs,
  });

  assert.equal(bill.actions.viewUrl, "https://example.com/bills");
  assert.equal(finance.actions.viewUrl, "https://example.com/finance");
});

test("buildBillActivityCardViewModel prefers official record locators over generic source refs", () => {
  const card = buildBillActivityCardViewModel({
    item: {
      bill_title: "서울특별시 강동구 청년 지원 조례안",
      proposed_at: "2026-04-07",
      participation_type: "primary_sponsor",
      bill_stage: "approved",
      ordinance_status: "approved_not_confirmed",
      result_label: "원안가결",
      bill_summary: {
        status: "title_only",
        summary_line: "강동구 청년 지원에 관한 조례를 정하는 의안이다.",
      },
      official_record_locator: {
        kind: "bill_detail",
        source_url: "https://example.com/bills/0463",
      },
      source_ref: {
        role: "official_activity",
      },
    },
    sectionSourceRefs: [
      {
        source_kind: "gangdong_council_official_activity",
        role: "official_activity",
        source_url: "https://example.com/fallback-bills",
      },
    ],
  });

  assert.deepEqual(card.badges?.map((badge) => badge.label), [
    "대표발의",
    "원안가결",
  ]);
  assert.equal(card.summaryLine, "강동구 청년 지원에 관한 조례를 정하는 의안이다.");
  assert.deepEqual(card.detailRows, [
    {
      label: "상태",
      value: "의안 단계 가결 · 조례 상태 가결 후 공포 전 · 의결 결과 원안가결",
    },
    {
      label: "제안일",
      value: "2026-04-07",
    },
  ]);
  assert.equal(card.actions.viewLabel, "의안 상세 열기");
  assert.equal(card.actions.viewUrl, "https://example.com/bills/0463");
});

test("buildMeetingActivityCardViewModel keeps unsupported meetings conservative", () => {
  const card = buildMeetingActivityCardViewModel({
    item: {
      session_label: "제322회 임시회",
      activity_label: "구정질문",
      record_grounding_level: "record_located",
      content_grounding: {
        status: "unavailable",
      },
      official_record_locator: {
        kind: "council_minutes_popup",
        source_url: "https://example.com/minutes",
      },
      source_ref: {
        role: "official_activity",
      },
    },
    sectionSourceRefs: [
      {
        source_kind: "gangdong_council_official_activity",
        role: "official_activity",
        source_url: "https://example.com/fallback-minutes",
      },
    ],
  });

  assert.equal(card.headline, "제322회 임시회 · 구정질문");
  assert.deepEqual(card.badges?.map((badge) => badge.label), [
    "공식 기록 위치 확인",
    "내용 검토 전",
  ]);
  assert.equal(
    card.summaryLine,
    "공식 기록 위치는 확보됐지만 발언 요약은 아직 승격하지 않음",
  );
  assert.equal(card.actions.viewLabel, "회의록 위치 확인");
  assert.equal(card.actions.viewUrl, "https://example.com/minutes");
});

test("buildMeetingActivityCardViewModel falls back to section source when locator url is missing", () => {
  const card = buildMeetingActivityCardViewModel({
    item: {
      session_label: "제322회 임시회",
      activity_type: "district_question",
      official_record_locator: {
        kind: "council_minutes_popup",
        source_url: "https://example.invalid/minutes",
      },
      source_ref: {
        role: "official_activity",
      },
    },
    sectionSourceRefs: [
      {
        source_kind: "gangdong_council_official_activity",
        role: "official_activity",
        source_url: "https://example.com/fallback-minutes",
      },
    ],
  });

  assert.equal(card.actions.viewUrl, "https://example.com/fallback-minutes");
  assert.equal(card.sourceUrl, "https://example.com/fallback-minutes");
});

test("buildSectionCardViewModel resolves a source label from the matched section source", () => {
  const section = buildSectionCardViewModel({
    item: { headline: "인사말", source_ref: { role: "official_profile" } },
    titleKeys: ["headline"],
    metaKeys: [],
    detailFields: [],
    preferredSourceKinds: [],
    preferredSourceRoles: ["official_profile", "profile"],
    sectionSourceRefs: [
      {
        source_kind: "gangdong_district_head_official_profile",
        role: "official_profile",
        source_url: "https://example.com/profile",
      },
    ],
  });

  assert.equal(
    (section as { sourceLabel?: string | null }).sourceLabel,
    "강동구청장실 공식 프로필",
  );
  assert.equal(
    (section as { sourceUrl?: string | null }).sourceUrl,
    "https://example.com/profile",
  );
});

test("buildSectionCardViewModel uses source_url as the primary link and keeps ordered source_links as related links", () => {
  const section = buildSectionCardViewModel({
    item: { headline: "인사말", source_ref: { role: "official_profile" } },
    titleKeys: ["headline"],
    metaKeys: [],
    detailFields: [],
    preferredSourceKinds: [],
    preferredSourceRoles: ["official_profile", "profile"],
    sectionSourceRefs: [
      {
        source_kind: "gangdong_district_head_official_profile",
        role: "official_profile",
        source_title: "강동구청장실",
        source_url: "https://example.com/profile",
        source_links: [
          {
            key: "profile",
            label: "프로필",
            url: "https://example.com/profile",
          },
          {
            key: "activity",
            label: "활동",
            url: "https://example.com/activity",
          },
          {
            key: "manifesto",
            label: "공약",
            url: "https://example.com/manifesto",
          },
        ],
      },
    ],
  });

  assert.equal(
    (section as { sourceLabel?: string | null }).sourceLabel,
    "강동구청장실",
  );
  assert.equal(
    (section as { sourceUrl?: string | null }).sourceUrl,
    "https://example.com/profile",
  );
  assert.deepEqual(
    (section as { sourceLinks?: { label: string; url: string }[] }).sourceLinks,
    [
      { label: "활동", url: "https://example.com/activity" },
      { label: "공약", url: "https://example.com/manifesto" },
    ],
  );
});

test("buildSectionCardViewModel derives legacy source_urls labels from map keys", () => {
  const section = buildSectionCardViewModel({
    item: { headline: "인사말", source_ref: { role: "official_profile" } },
    titleKeys: ["headline"],
    metaKeys: [],
    detailFields: [],
    preferredSourceKinds: [],
    preferredSourceRoles: ["official_profile", "profile"],
    sectionSourceRefs: [
      {
        source_kind: "gangdong_district_head_official_profile",
        role: "official_profile",
        source_title: "강동구청장실",
        source_url: null,
        source_urls: {
          profile: "https://example.com/profile",
          activity: "https://example.com/activity",
          manifesto: "ftp://example.com/manifesto",
        },
      },
    ],
  });

  assert.equal(
    (section as { sourceUrl?: string | null }).sourceUrl,
    "https://example.com/profile",
  );
  assert.deepEqual(
    (section as { sourceLinks?: { label: string; url: string }[] }).sourceLinks,
    [{ label: "activity", url: "https://example.com/activity" }],
  );
});

test("buildSectionCardViewModel drops reserved invalid placeholder URLs", () => {
  const section = buildSectionCardViewModel({
    item: { title: "재정 항목" },
    titleKeys: ["title"],
    metaKeys: [],
    detailFields: [],
    preferredSourceKinds: ["local_finance_365"],
    preferredSourceRoles: ["finance_activity_source"],
    sectionSourceRefs: [
      {
        source_kind: "local_finance_365",
        role: "finance_activity_source",
        source_url: "https://example.invalid/local-finance-365/gangdong",
      },
    ],
  });

  assert.equal((section as { sourceUrl?: string | null }).sourceUrl, null);
  assert.equal(
    (section as { sourceLabel?: string | null }).sourceLabel,
    "지방재정365",
  );
});

test("buildSectionCardViewModel uses source_ref label without leaking the item's own label", () => {
  const section = buildSectionCardViewModel({
    item: {
      label: "일반 카드 라벨",
      title: "회의록",
    },
    titleKeys: ["title"],
    metaKeys: [],
    detailFields: [],
    preferredSourceKinds: [],
    preferredSourceRoles: ["meeting_activity_source"],
    sectionSourceRefs: [
      {
        role: "meeting_activity_source",
        label: "강동구의회 회의록 원문",
        source_url: "https://council.gangdong.go.kr/meeting/minutes/322",
      },
    ],
  });

  assert.equal(
    (section as { sourceLabel?: string | null }).sourceLabel,
    "강동구의회 회의록 원문",
  );
  assert.equal(
    (section as { sourceUrl?: string | null }).sourceUrl,
    "https://council.gangdong.go.kr/meeting/minutes/322",
  );
});

test("LocalCouncilPersonDetailView renders a static card when expandable content is absent", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView();
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person: {
        person_name: "홍길동",
        office_type: "basic_council",
        summary: {
          headline: "홍길동 공식 근거 요약",
          grounded_summary: "요약 본문",
          summary_mode: "fallback",
          summary_basis: {},
        },
        official_profile: {},
        committees: [],
        bills: [],
        meeting_activity: [],
        finance_activity: [{ title: "세부 없는 재정 항목" }],
        elected_basis: {},
        source_refs: [],
        freshness: {},
      },
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  assert.match(html, /세부 없는 재정 항목/);
  assert.doesNotMatch(html, /열기/);
  assert.doesNotMatch(html, /aria-expanded=/);
});

test("LocalCouncilPersonDetailView removes the global source section and keeps source-based expansion per card", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView();
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person: {
        person_name: "홍길동",
        office_type: "basic_council",
        summary: {
          headline: "홍길동 공식 근거 요약",
          grounded_summary: "요약 본문",
          summary_mode: "fallback",
          summary_basis: {},
        },
        official_profile: {},
        committees: [{ committee_name: "행정복지위원회" }],
        bills: [],
        meeting_activity: [],
        finance_activity: [],
        elected_basis: {},
        source_refs: [
          {
            source_kind: "local_council_portal_members",
            role: "profile",
          },
        ],
        freshness: {},
      },
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  assert.match(html, /행정복지위원회/);
  assert.match(html, /열기/);
  assert.doesNotMatch(html, />출처<\/h2>/);
});

test("LocalCouncilPersonDetailView uses the source badge as the external link and removes the viewer CTA", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView({
    expandedKey: "재정 활동:0",
  });
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person: dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse,
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  assert.match(
    html,
    /href="https:\/\/www\.localfinance\.go\.kr\/finance\/gangdong\/budget-execution"[^>]*>출처 · 지방재정365<\/a>/,
  );
  assert.match(html, /원문 다운로드/);
  assert.doesNotMatch(html, /원문 보기/);
  assert.doesNotMatch(html, />출처<\/h2>/);
});

test("LocalCouncilPersonDetailView applies noopener to every external link", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView({
    expandedKey: "재정 활동:0",
  });
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person: dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse,
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  const relMatches = html.match(/rel="noopener noreferrer"/g) ?? [];

  assert.equal(relMatches.length >= 4, true);
  assert.doesNotMatch(html, /rel="noreferrer"/);
});

test("LocalCouncilPersonDetailView renders related source links in expanded content", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView({
    expandedKey: "공식 프로필:0",
  });
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person: {
        ...(dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse),
        source_refs: [
          {
            source_kind: "nec_current_holder",
            role: "elected_basis",
          },
          {
            source_kind: "gangdong_district_head_official_profile",
            role: "official_profile",
            source_title: "강동구청장실",
            source_url: "https://example.com/profile",
            source_links: [
              {
                key: "profile",
                label: "프로필",
                url: "https://example.com/profile",
              },
              {
                key: "activity",
                label: "활동",
                url: "https://example.com/activity",
              },
              {
                key: "manifesto",
                label: "공약",
                url: "https://example.com/manifesto",
              },
            ],
          },
          {
            source_kind: "gangdong_council_official_activity",
            role: "official_activity",
            source_url: "https://www.gangdong.go.kr/web/mayor/contents/gdo020_010",
          },
          {
            source_kind: "local_finance_365",
            role: "finance_activity",
            source_url: "https://www.localfinance.go.kr/finance/gangdong/budget-execution",
          },
        ],
      },
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  assert.match(html, /href="https:\/\/example\.com\/profile"[^>]*>출처 · 강동구청장실<\/a>/);
  assert.match(html, /관련 출처/);
  assert.match(html, /활동/);
  assert.match(html, /공약/);
  assert.doesNotMatch(
    html,
    /href="https:\/\/example\.com\/profile"[^>]*>프로필<\/a>/,
  );
});

test("LocalCouncilPersonDetailView renders bill badges, summary, and locator-aware action labels", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView({
    expandedKey: "의안:0",
  });
  const person =
    dossiers[
      "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640"
    ] as LocalCouncilPersonDossierResponse;

  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person,
      dataSource: "backend",
      onBack: () => undefined,
    }),
  );

  assert.match(html, /대표발의/);
  assert.match(html, /강동구 청년 지원에 관한 조례를 정하는 의안이다\./);
  assert.match(html, /의안 상세 열기/);
});

test("LocalCouncilPersonDetailView keeps unsupported meeting copy conservative", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView({
    expandedKey: "회의:0",
  });
  const person =
    dossiers[
      "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640"
    ] as LocalCouncilPersonDossierResponse;

  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person,
      dataSource: "backend",
      onBack: () => undefined,
    }),
  );

  assert.match(html, /공식 기록 위치 확인/);
  assert.match(html, /내용 검토 전/);
  assert.match(
    html,
    /공식 기록 위치는 확보됐지만 발언 요약은 아직 승격하지 않음/,
  );
  assert.match(html, /회의록 위치 확인/);
});

test("LocalCouncilPersonDetailView translates district head data gaps instead of showing raw flags", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView();
  const person = dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse;

  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person,
      dataSource: "backend",
      onBack: () => undefined,
    }),
  );

  assert.doesNotMatch(html, /uncollected:district_head_minutes_person_linkage/);
  assert.match(html, /구청장 개인 회의 활동 linkage는 아직 수집\/검토 전입니다\./);
});

test("LocalCouncilPersonDetailView keeps the source badge non-clickable when backend sends an invalid placeholder URL", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView({
    expandedKey: "재정 활동:0",
  });
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person: {
        ...(dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse),
        source_refs: [
          {
            role: "finance_activity_source",
            label: "서울특별시 강동구 지방재정365 활동 보강",
            source_kind: "local_finance_365",
            source_url: "https://example.invalid/local-finance-365/gangdong",
          },
        ],
      },
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  assert.match(html, />출처 · 지방재정365<\/span>/);
  assert.doesNotMatch(html, /example\.invalid/);
  assert.doesNotMatch(html, /원문 보기/);
});

test("LocalCouncilRosterView places count pills beside the section headings", () => {
  const LocalCouncilRosterView = loadLocalCouncilRosterView();
  const html = renderToStaticMarkup(
    createElement(LocalCouncilRosterView, {
      rosterData: {
        district: {
          gu_code: "11740",
          district_slug: "seoul-gangdong",
          district_name: "서울특별시 강동구",
        },
        roster: {
          district_head: {
            person_key: "district-head",
            person_name: "이수희",
            office_type: "basic_head",
            party_name: "국민의힘",
          },
          council_members: [
            {
              person_key: "member-1",
              person_name: "김가동",
              office_type: "basic_council",
              party_name: "예시정당",
            },
            {
              person_key: "member-2",
              person_name: "이나리",
              office_type: "basic_council",
              party_name: "다른정당",
            },
          ],
          source_coverage: {},
          freshness: {},
        },
      },
      dataSource: "backend",
      onSelectPerson: () => {},
      onBack: () => {},
    }),
  );

  assert.match(html, /구청장<\/h2><span[^>]*><strong[^>]*>1<\/strong>명<\/span>/);
  assert.match(html, /구의원<\/h2><span[^>]*><strong[^>]*>2<\/strong>명<\/span>/);
  assert.doesNotMatch(html, /<p[^>]*>1<\/p><p[^>]*>구청장<\/p>/);
  assert.doesNotMatch(html, /<p[^>]*>2<\/p><p[^>]*>구의원<\/p>/);
});

test("LocalCouncilRosterView explains the roster office terminology", () => {
  const LocalCouncilRosterView = loadLocalCouncilRosterView();
  const html = renderToStaticMarkup(
    createElement(LocalCouncilRosterView, {
      rosterData: {
        district: {
          gu_code: "11740",
          district_slug: "seoul-gangdong",
          district_name: "서울특별시 강동구",
        },
        roster: {
          district_head: {
            person_key: "district-head",
            person_name: "이수희",
            office_type: "basic_head",
            party_name: "국민의힘",
          },
          council_members: [
            {
              person_key: "member-1",
              person_name: "김가동",
              office_type: "basic_council",
              party_name: "예시정당",
            },
          ],
          source_coverage: {},
          freshness: {
            basis_timestamp: "2026-04-08T10:10:00+09:00",
          },
        },
      },
      dataSource: "backend",
      onSelectPerson: () => {},
      onBack: () => {},
    }),
  );

  assert.match(html, /구청장은 구 행정을 총괄하는 단체장입니다\./);
  assert.match(html, /구의원은 구의회에서 조례와 예산, 감시 역할을 맡습니다\./);
});

test("sample dossiers expose evidence digest, diagnostics, and richer freshness metadata", () => {
  const districtHead = dossiers["seoul-gangdong:district-head"];
  const councilMember = dossiers[
    "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640"
  ];
  const councilMemberSecondary = dossiers[
    "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022643"
  ];

  assert.deepEqual(districtHead.summary.evidence_digest, [
    "공식 프로필 1건",
    "의안 1건",
    "회의 활동 1건",
    "재정 활동 1건",
  ]);
  assert.equal(districtHead.diagnostics?.spot_check?.kind, "district_head");
  assert.equal(districtHead.diagnostics?.agentic_review_status, "pass");
  assert.equal(districtHead.diagnostics?.agentic_enrichment_status, "success");
  assert.equal(districtHead.freshness.basis_kind, "snapshot_batch_finished_at");
  assert.equal(districtHead.freshness.source_mode, "stored_projection_only");

  assert.deepEqual(councilMember.summary.evidence_digest, [
    "상임위 1건",
    "의안 2건",
    "회의 활동 1건",
  ]);
  assert.equal(councilMember.summary.fallback_reason, "source_coverage_limited");
  assert.deepEqual(councilMember.summary.explanation_lines, [
    "지방의정포털, 중앙선거관리위원회, 강동구의회 기준으로 검증 가능한 정보만 요약했다.",
    "확인한 핵심 근거: 상임위 1건, 의안 2건, 회의 활동 1건.",
    "요약 생성 상태: fallback (source_coverage_limited).",
  ]);
  assert.equal(Array.isArray(councilMember.evidence), true);
  assert.equal(councilMember.evidence[0]?.kind, "official_profile");
  assert.equal(councilMember.evidence[0]?.status, "missing");
  assert.equal(councilMember.diagnostics?.spot_check?.kind, "member_source_docid");
  assert.equal(councilMember.diagnostics?.spot_check?.huboid, "600000001");
  assert.equal(councilMember.diagnostics?.agentic_review_status, "pass");
  assert.equal(councilMember.diagnostics?.agentic_enrichment_status, "fallback");
  assert.deepEqual(councilMember.diagnostics?.data_gap_flags, [
    "uncollected:meeting_content_grounding",
  ]);
  assert.deepEqual(councilMember.diagnostics?.needs_human_review, [
    "summary_fallback",
  ]);
  assert.equal(councilMember.freshness.basis_kind, "published_batch_finished_at");
  assert.equal(
    councilMember.diagnostics?.quality_signals?.official_profile?.status,
    "missing",
  );
  assert.equal(
    councilMember.diagnostics?.source_contract_summary?.issue_count,
    0,
  );
  assert.deepEqual(councilMember.diagnostics?.explanation_lines, [
    "최종 발행 상태: publishable_degraded.",
    "출처 계약 이슈: 0건.",
    "사람 확인 포인트: summary_fallback.",
  ]);
  assert.equal(councilMember.freshness.staleness_bucket, "fresh");
  assert.deepEqual(councilMember.freshness.lineage, []);
  assert.equal(
    councilMember.freshness.note,
    "latest promote 가능한 batch 기준 freshness다. agentic 결과는 degraded 상태다.",
  );
  assert.equal(
    councilMember.freshness.explanation,
    "published_batch_finished_at=2026-04-08T10:05:00+09:00 기준으로 2026-04-08T10:06:00+09:00 생성본을 사용했다. latest promote 가능한 batch 기준 freshness다. agentic 결과는 degraded 상태다.",
  );
  assert.equal(
    districtHead.summary.source_contract_summary?.issue_count,
    0,
  );
  assert.deepEqual(districtHead.summary.explanation_lines, [
    "요약 근거는 공식 프로필, 의안, 회의, 재정 활동 데이터를 함께 확인해 구성했습니다.",
    "출처 계약 점검 결과 문제 없는 링크만 상세 카드에 노출됩니다.",
  ]);
  assert.deepEqual(districtHead.diagnostics?.explanation_lines, [
    "구청장 개인 회의 활동은 아직 회의록 inventory를 개인 활동으로 귀속하지 않습니다.",
  ]);
  assert.deepEqual(districtHead.freshness.explanation_lines, [
    "기준 시각은 현재 상세 카드들이 참조한 최신 projection 시점을 의미합니다.",
  ]);
  assert.equal(districtHead.overlay?.status, "ready");
  assert.equal(councilMember.overlay?.status, "unavailable");
  assert.equal(
    councilMemberSecondary.overlay?.basis?.target_member_id,
    "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022643",
  );
});

test("LocalCouncilPersonDetailView renders evidence digest, diagnostics, spot-check, and freshness panels", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView();
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person: dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse,
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  assert.match(html, /근거 요약/);
  assert.match(html, /공식 프로필 1건/);
  assert.match(html, /요약 근거 출처/);
  assert.match(html, /강동구청장실 공식 프로필/);
  assert.match(html, /발행·진단/);
  assert.match(html, /기준 종류/);
  assert.match(html, /스냅샷 배치 완료 시각/);
  assert.match(html, /구청장 spot-check/);
  assert.match(html, /강동구청장실 공식 프로필/);
});

test("LocalCouncilPersonDetailView renders a collapsed supplemental overlay summary when present", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView();
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person: dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse,
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  assert.match(html, /보강 정보/);
  assert.match(html, /준비 완료/);
  assert.match(
    html,
    /보강 정보는 공식 결정적 결과가 아니라 별도 표식이 있는 supplemental surface입니다/,
  );
  assert.match(html, /1개 채널에서 1건의 보강 정보를 제공합니다/);
  assert.doesNotMatch(html, /추가 보강 정보 요약/);
});

test("LocalCouncilPersonDetailView renders overlay items when the supplemental section is expanded", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView({
    expandedKey: "overlay",
  });
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person: dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse,
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  assert.match(html, /최근 보도/);
  assert.match(html, /강동구청장, 도서관 확충 추진/);
  assert.match(html, /추가 보강 정보 요약/);
  assert.match(html, /강동뉴스/);
  assert.match(html, /신뢰 높음/);
  assert.match(html, /news_article · news-001/);
  assert.match(html, /원문 보기/);
});

test("LocalCouncilPersonDetailView falls back to top-level spot_check when diagnostics spot_check is missing", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView();
  const districtHead = dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse;
  const person = {
    ...districtHead,
    diagnostics: {
      ...districtHead.diagnostics,
      spot_check: null,
    },
    spot_check: districtHead.diagnostics?.spot_check ?? null,
  } as LocalCouncilPersonDossierResponse;
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person,
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  assert.match(html, /구청장 spot-check/);
});

test("LocalCouncilPersonDetailView renders additive explanation lines and source contract summary when present", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView();
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person: {
        ...(dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse),
        summary: {
          ...(dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse).summary,
          explanation_lines: [
            "요약 근거는 공식 프로필, 의안, 회의, 재정 활동 데이터를 함께 확인해 구성했습니다.",
          ],
          source_contract_summary: {
            status: "ok",
            issue_count: 2,
            issues: [
              {
                issue_code: "invalid_source_url",
                source_kind: "local_finance_365",
                role: "finance_activity_source",
                field: "source_url",
              },
              {
                issue_code: "missing_source_display_label",
                source_kind: "gangdong_council_official_activity",
                role: "official_activity",
              },
            ],
            explanation_lines: ["summary source contract line"],
          },
        },
        diagnostics: {
          ...(dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse).diagnostics,
          explanation_lines: [
            "발행 상태와 agentic 검토 상태를 함께 보여 현재 공개 가능한 수준인지 안내합니다.",
          ],
          source_contract_summary: {
            issue_count: 1,
            issues: ["diagnostics_source_contract_hint"],
            explanation_lines: ["diagnostics source contract line"],
          },
        },
        freshness: {
          ...(dossiers["seoul-gangdong:district-head"] as LocalCouncilPersonDossierResponse).freshness,
          explanation_lines: [
            "기준 시각은 현재 상세 카드들이 참조한 최신 projection 시점을 의미합니다.",
          ],
        },
      },
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  assert.match(html, /설명 가능한 진단/);
  assert.match(html, /요약 근거는 공식 프로필, 의안, 회의, 재정 활동 데이터를 함께 확인해 구성했습니다\./);
  assert.match(html, /출처 계약 점검/);
  assert.match(html, /점검 이슈 3건/);
  assert.match(html, /출처 계약 상태/);
  assert.match(html, /ok/);
  assert.match(html, /invalid_source_url · 지방재정365 · finance_activity_source/);
  assert.match(html, /diagnostics_source_contract_hint/);
  assert.match(html, /summary source contract line/);
  assert.match(html, /diagnostics source contract line/);
  assert.match(html, /발행 상태와 agentic 검토 상태를 함께 보여 현재 공개 가능한 수준인지 안내합니다\./);
  assert.match(html, /기준 시각은 현재 상세 카드들이 참조한 최신 projection 시점을 의미합니다\./);
});

test("LocalCouncilPersonDetailView renders evidence quality, source contract, summary explanations, and freshness lineage", () => {
  const LocalCouncilPersonDetailView = loadLocalCouncilPersonDetailView();
  const html = renderToStaticMarkup(
    createElement(LocalCouncilPersonDetailView, {
      person: {
        person_name: "김가동",
        office_type: "basic_council",
        summary: {
          headline: "김가동 공식 근거 요약",
          grounded_summary: "공식 프로필과 의안, 회의 활동 근거를 바탕으로 요약했다.",
          summary_mode: "fallback",
          summary_basis: {
            source_kinds: [
              "local_council_portal_members",
              "gangdong_council_official_activity",
            ],
          },
          evidence_digest: ["상임위 1건", "의안 2건", "회의 활동 1건"],
          explanation_lines: [
            "지방의정포털과 강동구의회 근거만으로 요약을 구성했다.",
          ],
        },
        evidence: [
          {
            kind: "official_profile",
            label: "공식 프로필",
            count: 0,
            present: false,
            status: "missing",
            confidence: "low",
            severity: "warning",
            explanation: "공식 프로필 section이 아직 없다.",
          },
          {
            kind: "finance_activity",
            label: "재정 활동",
            count: 0,
            present: false,
            status: "not_applicable",
            confidence: "high",
            severity: "info",
            explanation: "기초의원 dossier에는 재정 활동 근거를 적용하지 않는다.",
          },
        ],
        diagnostics: {
          publish_status: "publishable",
          final_publish_status: "publishable_degraded",
          agentic_review_status: "pass",
          agentic_enrichment_status: "fallback",
          data_gap_flags: [],
          needs_human_review: ["summary_fallback"],
          spot_check: {
            kind: "member_source_docid",
            council_slug: "서울_강동구의회_002003",
            member_source_docid: "CLIKM20220000022640",
            huboid: "600000001",
            person_key:
              "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640",
          },
          quality_signals: {
            official_profile: {
              count: 0,
              status: "missing",
              confidence: "low",
              severity: "warning",
            },
            finance_activity: {
              count: 0,
              status: "not_applicable",
              confidence: "high",
              severity: "info",
            },
          },
          source_contract_summary: {
            issue_count: 1,
            issues: [
              {
                issue_code: "missing_role",
                source_kind: "local_council_portal_members",
                role: "official_profile",
              },
            ],
            explanation_lines: ["official_profile source에 role이 비어 있다."],
          },
          explanation_lines: [
            "최종 발행 상태: publishable_degraded.",
          ],
        },
        official_profile: {
          office_label: "강동구의원",
        },
        committees: [],
        bills: [],
        meeting_activity: [],
        finance_activity: [],
        elected_basis: {
          election_id: "0020220601",
          huboid: "600000001",
        },
        source_refs: [],
        freshness: {
          basis_kind: "published_batch_finished_at",
          basis_timestamp: "2026-04-08T10:05:00+09:00",
          generated_at: "2026-04-08T10:06:00+09:00",
          source_mode: "stored_projection_only",
          is_snapshot_based: false,
          staleness_bucket: "fresh",
          explanation: "최근 발행 묶음 기준이다.",
          lineage: [
            {
              label: "published_batch_finished_at",
              timestamp: "2026-04-08T10:05:00+09:00",
            },
          ],
        },
      } as unknown as LocalCouncilPersonDossierResponse,
      dataSource: "backend",
      onBack: () => {},
    }),
  );

  assert.match(html, /요약 설명/);
  assert.match(html, /지방의정포털과 강동구의회 근거만으로 요약을 구성했다\./);
  assert.match(html, /근거 현황/);
  assert.match(html, /공식 프로필 section이 아직 없다\./);
  assert.match(html, /품질 신호/);
  assert.match(html, /공식 프로필<\/span><span[^>]*>0건 · missing · low · warning/);
  assert.match(html, /출처 계약/);
  assert.match(html, /missing_role · 지방의정포털 의원 정보 · official_profile/);
  assert.match(html, /진단 설명/);
  assert.match(html, /최종 발행 상태: publishable_degraded\./);
  assert.match(html, /신선도 계보/);
  assert.match(html, /staleness_bucket/);
  assert.match(html, /fresh/);
  assert.match(html, /최근 발행 묶음 기준이다\./);
  assert.match(html, /huboid/);
  assert.match(html, /600000001/);
});

test("sample district head dossier exposes enough data for hero block and non-meeting section actions", () => {
  const person = dossiers["seoul-gangdong:district-head"];
  const hero = buildPersonHeroMeta(person);
  const officialActivity = buildSectionCardViewModel({
    item: person.bills[0],
    titleKeys: ["bill_title", "bill_name", "title"],
    metaKeys: ["proposed_at", "bill_date", "source_kind"],
    detailFields: [{ label: "제안일", keys: ["proposed_at", "bill_date"] }],
    preferredSourceKinds: [],
    preferredSourceRoles: ["official_activity"],
    sectionSourceRefs: person.source_refs,
  });
  const finance = buildSectionCardViewModel({
    item: person.finance_activity[0],
    titleKeys: ["title"],
    metaKeys: ["amount"],
    detailFields: [{ label: "금액", keys: ["amount"] }],
    preferredSourceKinds: ["local_finance_365"],
    preferredSourceRoles: [],
    sectionSourceRefs: person.source_refs,
  });

  assert.equal(hero.name, "이수희");
  assert.match(hero.imageUrl ?? "", /^https:\/\/.+/);
  assert.equal(hero.educationItems.length > 0, true);
  assert.equal(hero.careerItems.length > 0, true);
  assert.equal((hero.links?.length ?? 0) > 0, true);
  assert.deepEqual(person.meeting_activity, []);

  assert.equal(officialActivity.actions.viewUrl?.includes("gangdong.go.kr"), true);
  assert.equal(finance.actions.viewUrl?.includes("finance"), true);
  assert.equal(finance.actions.downloadUrl?.includes("download"), true);
});

test("sample council member dossier includes activity grounding fields for bills and meetings", () => {
  const person =
    dossiers[
      "seoul-gangdong:council-member:서울_강동구의회_002003:CLIKM20220000022640"
    ];

  assert.equal(person.bills[0]?.participation_type, "primary_sponsor");
  assert.equal(person.bills[0]?.bill_stage, "approved");
  assert.equal(person.bills[0]?.ordinance_status, "approved_not_confirmed");
  assert.equal(person.bills[0]?.bill_summary?.status, "title_only");
  assert.equal(
    person.bills[0]?.bill_summary?.summary_line,
    "강동구 청년 지원에 관한 조례를 정하는 의안이다.",
  );
  assert.equal(person.bills[0]?.official_record_locator?.kind, "bill_detail");

  assert.equal(person.meeting_activity[0]?.activity_type, "district_question");
  assert.equal(person.meeting_activity[0]?.activity_label, "구정질문");
  assert.equal(person.meeting_activity[0]?.record_grounding_level, "record_located");
  assert.equal(person.meeting_activity[0]?.content_grounding?.status, "unavailable");
});

test("sample district head dossier reflects demoted meeting linkage policy", () => {
  const person = dossiers["seoul-gangdong:district-head"];

  assert.deepEqual(person.meeting_activity, []);
  assert.equal(
    person.diagnostics?.data_gap_flags?.includes(
      "uncollected:district_head_minutes_person_linkage",
    ),
    true,
  );
});
