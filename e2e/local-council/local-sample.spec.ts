import { expect, test } from "@playwright/test";

test("local-council address fields are reachable by accessible labels", async ({ page }) => {
  await page.goto("/local-council");

  await expect(page.getByLabel("시/도")).toBeVisible();
  await expect(page.getByLabel("구/군/시")).toBeVisible();
  await expect(page.getByLabel("읍/면/동")).toBeVisible();
});

test("local-council sample smoke flow renders roster, detail, and browser back navigation", async ({
  page,
}) => {
  await page.goto("/local-council");

  await expect(
    page.getByRole("heading", { name: "우리동네 지방의원을 확인하세요" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "서울 강동구 천호동" }).click();

  await expect(page.getByRole("heading", { name: "서울특별시 강동구" })).toBeVisible();
  await expect(page.getByText("로컬 미리보기 데이터")).toBeVisible();
  await expect(page.getByRole("heading", { name: "구청장" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "구의원" })).toBeVisible();
  await expect(page.getByText("이수희")).toBeVisible();
  await expect(page.getByText("김가동")).toBeVisible();
  await expect(page.getByText("이나리")).toBeVisible();

  await page.getByRole("button", { name: /김가동/ }).click();

  await expect(page.getByRole("button", { name: "명단으로 돌아가기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "김가동 공식 근거 요약" })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("heading", { name: "서울특별시 강동구" })).toBeVisible();

  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "우리동네 지방의원을 확인하세요" }),
  ).toBeVisible();
});
