import { expect, test } from "@playwright/test";

import {
  expectExternalLink,
  expectGangdongRoster,
  expectLocalCouncilHeaderLinks,
  expectPersonDetailShell,
  expandSectionCard,
  getSectionByHeading,
  gotoLocalCouncilAddressStep,
  openRosterPerson,
  openSampleGangdongRoster,
} from "../helpers/local-council";

test("local-council address fields and global navigation are reachable", async ({
  page,
}) => {
  await gotoLocalCouncilAddressStep(page);

  await expect(page.getByLabel("시/도")).toBeVisible();
  await expect(page.getByLabel("구/군/시")).toBeVisible();
  await expect(page.getByLabel("읍/면/동")).toBeVisible();
  await expectLocalCouncilHeaderLinks(page);
});

test("local-council address step keeps shared region fallback options visible on regions API failure", async ({
  page,
}) => {
  await page.route("**/api/regions/**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        message: "지역 선거 데이터를 불러오지 못했습니다.",
      }),
    });
  });

  await gotoLocalCouncilAddressStep(page);
  await expect(
    page.getByText("지역 선거 데이터를 불러오지 못했습니다. 일부 기본 지역 목록으로 계속 진행합니다."),
  ).toBeVisible();

  await page.getByLabel("시/도").selectOption("서울특별시");
  await expect(page.getByLabel("구/군/시").locator("option")).toContainText(["강동구"]);

  await page.getByLabel("구/군/시").selectOption("강동구");
  await expect(page.getByLabel("읍/면/동").locator("option")).toContainText(["천호동"]);
});

test("local-council sample district-head detail covers official links, overlay, and explicit back buttons", async ({
  page,
}) => {
  await openSampleGangdongRoster(page);
  await expectGangdongRoster(page, {
    dataSourceLabel: "로컬 미리보기 데이터",
    districtHeadName: "이수희",
    councilMemberNames: ["김가동", "이나리"],
  });

  await openRosterPerson(page, "이수희");
  await expectPersonDetailShell(page, {
    name: "이수희",
    headline: "이수희 공식 근거 요약",
  });
  await expectLocalCouncilHeaderLinks(page);
  await expect(page.getByText("로컬 미리보기 데이터")).toHaveCount(0);
  await expect(page.getByText("기준 2026-04-08 10:10:00")).toHaveCount(0);
  await expect(page.getByText("개발·로컬 미리보기용 샘플 데이터입니다.")).toHaveCount(0);

  await expectExternalLink(
    page.getByRole("link", { name: "공식 프로필" }),
    "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010",
  );
  await expectExternalLink(
    page.getByRole("link", { name: "구청장실", exact: true }),
    "https://www.gangdong.go.kr/web/mayor",
  );

  const committeeSection = getSectionByHeading(page, "위원회");
  await expect(committeeSection.getByText("공식 근거가 아직 준비되지 않았습니다.")).toBeVisible();

  const officialProfileSection = getSectionByHeading(page, "공식 프로필");
  await expect(
    officialProfileSection.getByRole("link", { name: "원문 이동" }),
  ).toHaveCount(0);
  await expandSectionCard(officialProfileSection, /힘찬 변화, 자랑스러운 강동/);
  await expectExternalLink(
    officialProfileSection.getByRole("link", { name: "출처 · 강동구 소통 구청장실" }),
    "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010",
  );
  await expectExternalLink(
    officialProfileSection.getByRole("link", { name: "활동" }),
    "https://www.gangdong.go.kr/web/mayor/mayorCalendar/list",
  );
  await expectExternalLink(
    officialProfileSection.getByRole("link", { name: "공약" }),
    "https://www.gangdong.go.kr/web/mayor/contents/gdo020_130",
  );

  const financeSection = getSectionByHeading(page, "재정 활동");
  await expandSectionCard(financeSection, /강동구 예산 집행 내역/);
  await expectExternalLink(
    financeSection.getByRole("link", { name: "출처 · 지방재정365" }),
    "https://www.localfinance.go.kr/finance/gangdong/budget-execution",
  );
  await expectExternalLink(
    financeSection.getByRole("link", { name: "원문 다운로드" }),
    "https://www.localfinance.go.kr/finance/gangdong/budget-execution/download.csv",
  );

  const overlaySection = getSectionByHeading(page, "보강 정보");
  await expect(overlaySection.getByRole("button", { name: /보강 정보/ })).toBeVisible();
  await expect(overlaySection.getByText("최근 보도")).toBeVisible();
  await expectExternalLink(
    overlaySection.getByRole("link", { name: "원문 보기" }),
    "https://example.com/news/1",
  );

  const summarySection = getSectionByHeading(page, "근거 요약");
  await expect(summarySection.getByText("공식 프로필 1건")).toBeVisible();
  await expect(summarySection.getByText("재정 활동 1건")).toBeVisible();
  await expect(summarySection.getByText("지방재정365")).toBeVisible();
  await expect(summarySection.getByText("확인된 공식 근거를 바탕으로 핵심 활동과 출처를 정리했습니다.")).toBeVisible();

  await expect(page.getByText("발행·진단")).toHaveCount(0);
  await expect(page.getByText("설명 가능한 진단")).toHaveCount(0);
  await expect(page.getByText(/spot-check/)).toHaveCount(0);

  const electedBasisSection = getSectionByHeading(page, "당선 근거");
  await expandSectionCard(electedBasisSection, /제8회 전국동시지방선거 당선 기록/);
  await expect(electedBasisSection.getByText("선거일 2022-06-01")).toBeVisible();
  await expectExternalLink(
    electedBasisSection.getByRole("link", { name: "출처 · 중앙선거관리위원회" }),
    "https://www.data.go.kr/data/15000864/openapi.do",
  );

  await page.getByRole("button", { name: "명단으로 돌아가기" }).click();
  await expectGangdongRoster(page, {
    dataSourceLabel: "로컬 미리보기 데이터",
    districtHeadName: "이수희",
    councilMemberNames: ["김가동", "이나리"],
  });

  await page.getByRole("button", { name: "지역 다시 선택" }).click();
  await expect(
    page.getByRole("heading", { name: "우리동네 지방의원을 확인하세요" }),
  ).toBeVisible();
});

test("local-council sample council-member detail covers rich branches and browser back navigation", async ({
  page,
}) => {
  await openSampleGangdongRoster(page);
  await openRosterPerson(page, "김가동");
  await expectPersonDetailShell(page, {
    name: "김가동",
    headline: "김가동 공식 근거 요약",
  });
  await expect(page.getByText("로컬 미리보기 데이터")).toHaveCount(0);
  await expect(page.getByText("요약 보강 이유 · source_coverage_limited")).toHaveCount(0);
  await expect(page.getByText("summary_fallback", { exact: true })).toHaveCount(0);
  await expect(page.getByText("발행·진단")).toHaveCount(0);
  await expect(page.getByText("설명 가능한 진단")).toHaveCount(0);
  await expect(page.getByText(/spot-check/)).toHaveCount(0);

  const summarySection = getSectionByHeading(page, "근거 요약");
  await expect(summarySection.getByText("상임위 1건")).toBeVisible();
  await expect(summarySection.getByText("의안 2건")).toBeVisible();
  await expect(summarySection.getByText("지방의정포털 의원 정보")).toBeVisible();
  await expect(
    page.getByText("강동구 청년 지원에 관한 조례를 정하는 의안이다."),
  ).toHaveCount(0);

  const electedBasisSection = getSectionByHeading(page, "당선 근거");
  await expandSectionCard(electedBasisSection, /구의원 당선 기록/);
  await expect(electedBasisSection.getByText("600000001")).toBeVisible();
  await expectExternalLink(
    electedBasisSection.getByRole("link", { name: "출처 · 중앙선거관리위원회" }),
    "https://www.data.go.kr/data/15000864/openapi.do",
  );

  const committeeSection = getSectionByHeading(page, "위원회");
  await expect(committeeSection.getByText("행정복지위원회")).toBeVisible();

  const billsSection = getSectionByHeading(page, "의안");
  await expect(billsSection.getByRole("link", { name: "원문 이동" })).toHaveCount(0);
  await expandSectionCard(billsSection, /서울특별시 강동구 청년 지원 조례안/);
  await expectExternalLink(
    billsSection.getByRole("link", { name: "출처 · 강동구의회 의안검색" }).first(),
    "https://council.gangdong.go.kr/meeting/bill/bill.do",
  );
  await expect(
    billsSection.getByText("서울특별시 강동구 청년 지원 조례안").first(),
  ).toBeVisible();
  await expect(billsSection.getByText("2026-04-07", { exact: true })).toBeVisible();

  const meetingsSection = getSectionByHeading(page, "회의");
  await expect(meetingsSection.getByText("제322회 임시회 · 구정질문")).toBeVisible();
  await expect(
    meetingsSection.getByText("2026-03-25", { exact: true }).first(),
  ).toBeVisible();
  await expandSectionCard(meetingsSection, /제322회 임시회 · 구정질문/);
  await expectExternalLink(
    meetingsSection.getByRole("link", { name: "회의록 위치 확인" }),
    "https://council.gangdong.go.kr/meeting/confer/recent.do",
  );

  const financeSection = getSectionByHeading(page, "재정 활동");
  await expect(financeSection.getByText("공식 근거가 아직 준비되지 않았습니다.")).toBeVisible();

  await page.goBack();
  await expectGangdongRoster(page, {
    dataSourceLabel: "로컬 미리보기 데이터",
    districtHeadName: "이수희",
    councilMemberNames: ["김가동", "이나리"],
  });

  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "우리동네 지방의원을 확인하세요" }),
  ).toBeVisible();
});

test("local-council sample council-member external bill links restore the detail view on browser back", async ({
  page,
}) => {
  await openSampleGangdongRoster(page);
  await openRosterPerson(page, "김가동");
  await expectPersonDetailShell(page, {
    name: "김가동",
    headline: "김가동 공식 근거 요약",
  });

  const billsSection = getSectionByHeading(page, "의안");
  await expandSectionCard(billsSection, /서울특별시 강동구 청년 지원 조례안/);
  const billSourceLink = billsSection
    .getByRole("link", { name: "출처 · 강동구의회 의안검색" })
    .first();
  await expectExternalLink(
    billSourceLink,
    "https://council.gangdong.go.kr/meeting/bill/bill.do",
  );

  await Promise.all([
    page.waitForURL(/https:\/\/council\.gangdong\.go\.kr\/meeting\/bill\/bill\.do/),
    billSourceLink.click(),
  ]);

  await page.goBack();

  await expectPersonDetailShell(page, {
    name: "김가동",
    headline: "김가동 공식 근거 요약",
  });
  await expect(page.getByRole("button", { name: "명단으로 돌아가기" })).toBeVisible();
});

test("local-council sample sparse council-member detail renders degraded empty-state branches", async ({
  page,
}) => {
  await openSampleGangdongRoster(page);
  await openRosterPerson(page, "이나리");
  await expectPersonDetailShell(page, {
    name: "이나리",
    headline: "이나리 공식 근거 요약",
  });

  await expect(page.getByText("보강 정보")).toHaveCount(0);
  await expect(page.getByText(/spot-check/)).toHaveCount(0);
  await expect(page.getByText("발행·진단")).toHaveCount(0);

  const summarySection = getSectionByHeading(page, "근거 요약");
  await expect(summarySection.getByText("당선 근거 1건")).toBeVisible();

  const profileSection = getSectionByHeading(page, "공식 프로필");
  await expect(
    profileSection.getByText("공식 근거가 아직 준비되지 않았습니다.", { exact: true }),
  ).toBeVisible();

  const electedBasisSection = getSectionByHeading(page, "당선 근거");
  await expandSectionCard(electedBasisSection, /구의원 당선 기록/);
  await expectExternalLink(
    electedBasisSection.getByRole("link", { name: "출처 · 중앙선거관리위원회" }),
    "https://www.data.go.kr/data/15000864/openapi.do",
  );

  for (const sectionTitle of ["위원회", "의안", "회의", "재정 활동"]) {
    const section = getSectionByHeading(page, sectionTitle);
    await expect(
      section.getByText("공식 근거가 아직 준비되지 않았습니다.", { exact: true }),
    ).toBeVisible();
  }
});
