import { expect, test } from "@playwright/test";

const integrationEnabled = process.env.PLAYWRIGHT_LOCAL_COUNCIL_INTEGRATION === "1";

test.skip(!integrationEnabled, "local-council integration harness is disabled");

test("local-council integration flow resolves a real district and opens detail", async ({
  page,
}) => {
  await page.goto("/local-council");

  await page.getByLabel("시/도").selectOption("서울특별시");
  await page.getByLabel("구/군/시").selectOption("강동구");
  await page.getByLabel("읍/면/동").selectOption("천호동");
  await page.getByRole("button", { name: "지방의원 확인하기" }).click();

  await expect(page.getByRole("heading", { name: "서울특별시 강동구" })).toBeVisible();
  await expect(page.getByText("공식 근거 데이터")).toBeVisible();
  await expect(page.getByText("로컬 미리보기 데이터")).toHaveCount(0);
  await expect(page.getByText("통합테스트 구청장")).toBeVisible();
  await expect(page.getByText("통합테스트 구의원")).toBeVisible();

  await page.getByRole("button", { name: /통합테스트 구의원/ }).click();

  await expect(
    page.getByRole("heading", { name: "통합테스트 구의원", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "통합테스트 구의원 공식 근거 요약" }),
  ).toBeVisible();
  await expect(page.getByText("공식 근거 데이터")).toBeVisible();
});
