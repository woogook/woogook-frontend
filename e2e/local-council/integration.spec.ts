import { expect, test } from "@playwright/test";

import {
  expectExternalLink,
  expectGangdongRoster,
  expectLocalCouncilHeaderLinks,
  expectPersonDetailShell,
  expandSectionCard,
  getSectionByHeading,
  openIntegrationGangdongRoster,
  openRosterPerson,
} from "../helpers/local-council";

const integrationEnabled = process.env.PLAYWRIGHT_LOCAL_COUNCIL_INTEGRATION === "1";

test.skip(!integrationEnabled, "local-council integration harness is disabled");

test("local-council integration flow covers district-head official links and deterministic source actions", async ({
  page,
}) => {
  await openIntegrationGangdongRoster(page);
  await expectGangdongRoster(page, {
    dataSourceLabel: "공식 근거 데이터",
    districtHeadName: "통합테스트 구청장",
    councilMemberNames: ["통합테스트 구의원"],
  });
  await expectLocalCouncilHeaderLinks(page);
  await expect(page.getByText("로컬 미리보기 데이터")).toHaveCount(0);

  await openRosterPerson(page, "통합테스트 구청장");
  await expectPersonDetailShell(page, {
    name: "통합테스트 구청장",
    headline: "통합테스트 구청장 공식 근거 요약",
  });
  await expectLocalCouncilHeaderLinks(page);
  await expect(page.getByText("공식 근거 데이터")).toHaveCount(0);
  await expect(page.getByText("발행·진단")).toHaveCount(0);
  await expect(page.getByText("설명 가능한 진단")).toHaveCount(0);

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
  await expandSectionCard(officialProfileSection, /통합 테스트용 구청장 프로필/);
  await expectExternalLink(
    officialProfileSection.getByRole("link", { name: "출처 · 강동구청장실" }),
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
  await expandSectionCard(financeSection, /통합 테스트 재정 활동/);
  await expectExternalLink(
    financeSection.getByRole("link", { name: "출처 · 지방재정365" }),
    "https://www.localfinance.go.kr/finance/gangdong/budget-execution",
  );
  await expectExternalLink(
    financeSection.getByRole("link", { name: "원문 다운로드" }),
    "https://www.localfinance.go.kr/finance/gangdong/budget-execution/download.csv",
  );

  const summarySection = getSectionByHeading(page, "근거 요약");
  await expect(summarySection.getByText("공식 프로필 1건")).toBeVisible();
  await expect(summarySection.getByText("재정 활동 1건")).toBeVisible();

  const electedBasisSection = getSectionByHeading(page, "당선 근거");
  await expandSectionCard(electedBasisSection, /제8회 전국동시지방선거 당선 기록/);
  await expect(electedBasisSection.getByText("integration-district-head")).toBeVisible();
  await expectExternalLink(
    electedBasisSection.getByRole("link", { name: "출처 · 중앙선거관리위원회" }),
    "https://www.data.go.kr/data/15000864/openapi.do",
  );

  await page.getByRole("button", { name: "명단으로 돌아가기" }).click();
  await expectGangdongRoster(page, {
    dataSourceLabel: "공식 근거 데이터",
    districtHeadName: "통합테스트 구청장",
    councilMemberNames: ["통합테스트 구의원"],
  });
});

test("local-council integration flow covers council-member detail branches and explicit navigation", async ({
  page,
}) => {
  await openIntegrationGangdongRoster(page);
  await openRosterPerson(page, "통합테스트 구의원");
  await expectPersonDetailShell(page, {
    name: "통합테스트 구의원",
    headline: "통합테스트 구의원 공식 근거 요약",
  });
  await expect(page.getByText("공식 근거 데이터")).toHaveCount(0);
  await expect(page.getByText("요약 보강 이유 · integration_fixture")).toHaveCount(0);
  await expect(page.getByText("발행·진단")).toHaveCount(0);
  await expect(page.getByText("설명 가능한 진단")).toHaveCount(0);

  await expectExternalLink(
    page.getByRole("link", { name: "지방의정포털", exact: true }),
    "https://clik.nanet.go.kr/potal/search/searchView.do?DOCID=INTEGRATION_PROFILE&collection=assemblyinfo",
  );

  const summarySection = getSectionByHeading(page, "근거 요약");
  await expect(summarySection.getByText("상임위 1건")).toBeVisible();
  await expect(summarySection.getByText("integration_fixture")).toHaveCount(0);

  const committeeSection = getSectionByHeading(page, "위원회");
  await expandSectionCard(committeeSection, /행정복지위원회/);
  await expectExternalLink(
    committeeSection.getByRole("link", { name: "출처 · 지방의정포털" }),
    "https://clik.nanet.go.kr/potal/search/searchView.do?DOCID=INTEGRATION_PROFILE&collection=assemblyinfo",
  );

  const billsSection = getSectionByHeading(page, "의안");
  await expect(billsSection.getByRole("link", { name: "원문 이동" })).toHaveCount(0);
  await expandSectionCard(billsSection, /통합 테스트 조례안/);
  await expectExternalLink(
    billsSection.getByRole("link", { name: "출처 · 강동구의회 의안검색" }),
    "https://council.gangdong.go.kr/bills/integration",
  );

  const meetingsSection = getSectionByHeading(page, "회의");
  await expandSectionCard(meetingsSection, /통합 테스트 임시회/);
  await expectExternalLink(
    meetingsSection.getByRole("link", { name: "출처 · 강동구의회 의안검색" }),
    "https://council.gangdong.go.kr/bills/integration",
  );

  const financeSection = getSectionByHeading(page, "재정 활동");
  await expect(financeSection.getByText("공식 근거가 아직 준비되지 않았습니다.")).toBeVisible();

  const electedBasisSection = getSectionByHeading(page, "당선 근거");
  await expandSectionCard(electedBasisSection, /제8회 전국동시지방선거 당선 기록/);
  await expect(electedBasisSection.getByText("integration-council-member")).toBeVisible();
  await expectExternalLink(
    electedBasisSection.getByRole("link", { name: "출처 · 중앙선거관리위원회" }),
    "https://www.data.go.kr/data/15000864/openapi.do",
  );

  await page.getByRole("button", { name: "명단으로 돌아가기" }).click();
  await page.getByRole("button", { name: "지역 다시 선택" }).click();
  await expect(
    page.getByRole("heading", { name: "우리동네 지방의원을 확인하세요" }),
  ).toBeVisible();
});
