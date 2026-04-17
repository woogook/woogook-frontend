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
    dataSourceLabel: "로컬 미리보기 데이터",
  });
  await expectLocalCouncilHeaderLinks(page);

  await expectExternalLink(
    page.getByRole("link", { name: "공식 프로필" }),
    "https://www.gangdong.go.kr/web/mayor/contents/gdo010_010",
  );
  await expectExternalLink(
    page.getByRole("link", { name: "구청장실" }),
    "https://www.gangdong.go.kr/web/mayor",
  );

  const committeeSection = getSectionByHeading(page, "위원회");
  await expect(committeeSection.getByText("공식 근거가 아직 준비되지 않았습니다.")).toBeVisible();

  const officialProfileSection = getSectionByHeading(page, "공식 프로필");
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
  await overlaySection.getByRole("button", { name: "열기" }).click();
  await expect(overlaySection.getByText("최근 보도")).toBeVisible();
  await expectExternalLink(
    overlaySection.getByRole("link", { name: "원문 보기" }),
    "https://example.com/news/1",
  );

  const summarySection = getSectionByHeading(page, "근거 요약");
  await expect(summarySection.getByText("공식 프로필 1건")).toBeVisible();
  await expect(summarySection.getByText("재정 활동 1건")).toBeVisible();
  await expect(summarySection.getByText("지방재정365")).toBeVisible();

  const diagnosticsSection = getSectionByHeading(page, "발행·진단");
  await expect(diagnosticsSection.getByText("강동구 구청장 상세 미리보기")).toBeVisible();
  await expect(diagnosticsSection.getByText("저장된 projection만 사용")).toBeVisible();

  const explainabilitySection = getSectionByHeading(page, "설명 가능한 진단");
  await expect(explainabilitySection.getByText("요약 설명")).toBeVisible();
  await expect(
    explainabilitySection.getByText("출처 계약 점검", { exact: true }),
  ).toBeVisible();

  const electedBasisSection = getSectionByHeading(page, "당선 근거");
  await expandSectionCard(electedBasisSection, /제8회 전국동시지방선거 당선 기록/);
  await expect(electedBasisSection.getByText("선거일 2022-06-01")).toBeVisible();
  await expect(
    electedBasisSection.getByText("출처 · 중앙선거관리위원회 현직자 근거"),
  ).toBeVisible();

  const spotCheckSection = getSectionByHeading(page, "구청장 spot-check");
  await expect(spotCheckSection.getByText("강동구청장실 공식 프로필")).toBeVisible();

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
    dataSourceLabel: "로컬 미리보기 데이터",
  });

  await expect(page.getByText("요약 보강 이유 · source_coverage_limited")).toBeVisible();
  await expect(page.getByText("summary_fallback", { exact: true })).toBeVisible();

  const summarySection = getSectionByHeading(page, "근거 요약");
  await expect(summarySection.getByText("상임위 1건")).toBeVisible();
  await expect(summarySection.getByText("의안 2건")).toBeVisible();
  await expect(summarySection.getByText("지방의정포털 의원 정보")).toBeVisible();

  const diagnosticsSection = getSectionByHeading(page, "발행·진단");
  await expect(diagnosticsSection.getByText("publishable_degraded")).toBeVisible();
  await expect(diagnosticsSection.getByText("summary_fallback", { exact: true })).toBeVisible();

  const explainabilitySection = getSectionByHeading(page, "설명 가능한 진단");
  await expect(
    explainabilitySection.getByText("최종 발행 상태: publishable_degraded."),
  ).toBeVisible();
  await expect(explainabilitySection.getByText("점검 이슈 0건")).toBeVisible();

  const electedBasisSection = getSectionByHeading(page, "당선 근거");
  await expandSectionCard(electedBasisSection, /구의원 당선 기록/);
  await expect(electedBasisSection.getByText("600000001")).toBeVisible();
  await expect(
    electedBasisSection.getByText("출처 · 중앙선거관리위원회 당선 근거"),
  ).toBeVisible();

  const spotCheckSection = getSectionByHeading(page, "구의원 spot-check");
  await expect(
    spotCheckSection.getByText("CLIKM20220000022640", { exact: true }),
  ).toBeVisible();

  const committeeSection = getSectionByHeading(page, "위원회");
  await expect(committeeSection.getByText("행정복지위원회")).toBeVisible();

  const billsSection = getSectionByHeading(page, "의안");
  await expect(
    billsSection.getByText("서울특별시 강동구 청년 지원 조례안").first(),
  ).toBeVisible();

  const meetingsSection = getSectionByHeading(page, "회의");
  await expect(meetingsSection.getByText("제322회 임시회 · 구정질문")).toBeVisible();

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

test("local-council sample sparse council-member detail renders degraded empty-state branches", async ({
  page,
}) => {
  await openSampleGangdongRoster(page);
  await openRosterPerson(page, "이나리");
  await expectPersonDetailShell(page, {
    name: "이나리",
    headline: "이나리 공식 근거 요약",
    dataSourceLabel: "로컬 미리보기 데이터",
  });

  await expect(page.getByText("no_official_activity")).toBeVisible();
  await expect(
    page.getByText("추가 근거가 연결되기 전까지는 보강 정보가 비어 있을 수 있습니다."),
  ).toBeVisible();

  const summarySection = getSectionByHeading(page, "근거 요약");
  await expect(summarySection.getByText("당선 근거 1건")).toBeVisible();

  const electedBasisSection = getSectionByHeading(page, "당선 근거");
  await expandSectionCard(electedBasisSection, /구의원 당선 기록/);
  await expect(
    electedBasisSection.getByText("출처 · 중앙선거관리위원회 당선 근거"),
  ).toBeVisible();

  for (const sectionTitle of ["위원회", "의안", "회의", "재정 활동"]) {
    const section = getSectionByHeading(page, sectionTitle);
    await expect(
      section.getByText("공식 근거가 아직 준비되지 않았습니다.", { exact: true }),
    ).toBeVisible();
  }
});
