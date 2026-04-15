import { expect, type Locator, type Page } from "@playwright/test";

type RoleScope = Page | Locator;

export async function gotoLocalCouncilAddressStep(page: Page) {
  await page.goto("/local-council");

  await expect(
    page.getByRole("heading", { name: "우리동네 지방의원을 확인하세요" }),
  ).toBeVisible();
}

export async function expectLocalCouncilHeaderLinks(scope: RoleScope) {
  const serviceHubLink = scope.getByRole("link", { name: "서비스 허브" });
  await expect(serviceHubLink).toBeVisible();
  await expect(serviceHubLink).toHaveAttribute("href", "/");

  const localElectionLink = scope.getByRole("link", { name: "지방선거" });
  await expect(localElectionLink).toBeVisible();
  await expect(localElectionLink).toHaveAttribute("href", "/local-election");
}

export async function openSampleGangdongRoster(page: Page) {
  await gotoLocalCouncilAddressStep(page);
  await page.getByRole("button", { name: "서울 강동구 천호동" }).click();
}

export async function openIntegrationGangdongRoster(page: Page) {
  await gotoLocalCouncilAddressStep(page);
  await page.getByLabel("시/도").selectOption("서울특별시");
  await page.getByLabel("구/군/시").selectOption("강동구");
  await page.getByLabel("읍/면/동").selectOption("천호동");
  await page.getByRole("button", { name: "지방의원 확인하기" }).click();
}

export async function expectGangdongRoster(
  page: Page,
  options: {
    dataSourceLabel: string;
    districtHeadName: string;
    councilMemberNames: string[];
  },
) {
  await expect(page.getByRole("heading", { name: "서울특별시 강동구" })).toBeVisible();
  await expect(page.getByText(options.dataSourceLabel)).toBeVisible();
  await expect(page.getByRole("heading", { name: "구청장" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "구의원" })).toBeVisible();
  await expect(page.getByRole("button", { name: options.districtHeadName })).toBeVisible();

  for (const councilMemberName of options.councilMemberNames) {
    await expect(
      page.getByRole("button", { name: councilMemberName }),
    ).toBeVisible();
  }
}

export async function openRosterPerson(page: Page, name: string) {
  await page.getByRole("button", { name }).click();
  await expect(page.getByRole("button", { name: "명단으로 돌아가기" })).toBeVisible();
}

export async function expectPersonDetailShell(
  page: Page,
  options: {
    name: string;
    headline: string;
    dataSourceLabel: string;
  },
) {
  await expect(
    page.getByRole("heading", { name: options.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: options.headline, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(options.dataSourceLabel)).toBeVisible();
}

export function getSectionByHeading(scope: RoleScope, heading: string) {
  return scope
    .getByRole("heading", { name: heading, exact: true })
    .first()
    .locator("xpath=ancestor::section[1]");
}

export async function expandSectionCard(section: Locator, name: string | RegExp) {
  const cardButton = section.getByRole("button", { name });
  await expect(cardButton).toBeVisible();
  await cardButton.click();
}

export async function expectExternalLink(link: Locator, href: string) {
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", href);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(link).toHaveAttribute("rel", /noreferrer/);
}
