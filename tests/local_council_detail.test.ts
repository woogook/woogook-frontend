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
  buildPersonHeroMeta,
  resolveSectionActionLink,
  buildSectionDetailRows,
  buildSectionCardViewModel,
  buildExpandableSectionContentId,
} from "../src/features/local-council/detail";
import {
  buildLocalCouncilDiagnosticsViewModel,
  getLocalCouncilFreshnessDetailRows,
  getLocalCouncilOfficeExplanation,
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
    downloadUrl: "https://example.com/primary-file.pdf",
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
    downloadUrl: "https://example.com/direct-file.pdf",
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
    downloadUrl: "https://example.com/fallback-file.pdf",
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
    downloadUrl: null,
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
    downloadUrl: null,
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
    downloadUrl: null,
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
          person_key: "seoul-gangdong:council-member:서울_강동구의회_002003:GD-MEMBER-001",
          note: "1인 spot-check 대상",
        },
      ],
      spot_check: {
        kind: "member_source_docid",
        council_slug: "seoul-gangdong",
        member_source_docid: "GD-MEMBER-001",
        person_key: "seoul-gangdong:council-member:서울_강동구의회_002003:GD-MEMBER-001",
      },
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
        "member_source_docid_check · 1인 spot-check 대상 · seoul-gangdong:council-member:서울_강동구의회_002003:GD-MEMBER-001",
      ],
      spotCheckTitle: "구의원 spot-check",
      spotCheckRows: [
        { label: "유형", value: "member_source_docid" },
        {
          label: "대상",
          value: "seoul-gangdong:council-member:서울_강동구의회_002003:GD-MEMBER-001",
        },
        { label: "의회", value: "seoul-gangdong" },
        { label: "member_source_docid", value: "GD-MEMBER-001" },
      ],
    },
  );
  assert.equal(
    getLocalCouncilOfficeExplanation("basic_head"),
    "구청장은 구 행정을 총괄하는 단체장입니다.",
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
      resolveData: {
        resolution_status: "resolved",
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
      resolveData: {
        resolution_status: "resolved",
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
    "seoul-gangdong:council-member:서울_강동구의회_002003:GD-MEMBER-001"
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
    "공식 프로필 1건",
    "의안 2건",
    "회의 활동 1건",
  ]);
  assert.equal(councilMember.summary.fallback_reason, "source_coverage_limited");
  assert.equal(councilMember.diagnostics?.spot_check?.kind, "member_source_docid");
  assert.equal(councilMember.diagnostics?.agentic_review_status, "pass");
  assert.equal(councilMember.diagnostics?.agentic_enrichment_status, "fallback");
  assert.equal(councilMember.freshness.basis_kind, "published_batch_finished_at");
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

test("sample district head dossier exposes enough data for hero block and section actions", () => {
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
  const meeting = buildSectionCardViewModel({
    item: person.meeting_activity[0],
    titleKeys: ["session_label", "meeting_name", "title"],
    metaKeys: ["meeting_date", "date"],
    detailFields: [
      { label: "회의명", keys: ["meeting_name", "title"] },
      { label: "회의일", keys: ["meeting_date", "date"] },
    ],
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

  assert.equal(officialActivity.actions.viewUrl?.includes("gangdong.go.kr"), true);
  assert.equal(meeting.actions.viewUrl?.includes("gangdong.go.kr"), true);
  assert.equal(finance.actions.viewUrl?.includes("finance"), true);
  assert.equal(finance.actions.downloadUrl?.includes("download"), true);
});
