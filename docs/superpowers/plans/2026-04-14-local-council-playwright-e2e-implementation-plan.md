# 현직 지방의원 Playwright E2E 도입 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/local-council`에 대해 Playwright 기반 브라우저 회귀 테스트를 도입하고, sample 기반 smoke E2E와 backend/DB 기반 integration E2E의 기반을 만든다.

**Architecture:** 저장소의 기준 브라우저 테스트 자산은 `Playwright Test`로 두고, 새 시나리오 탐색과 디버깅은 `Playwright CLI`로 보조한다. 1차 구현은 `local-council` sample happy path가 실제 브라우저에서 안정적으로 돌도록 접근성 locator를 보강하고, smoke spec과 integration harness의 골격을 함께 추가한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Vitest 4, Playwright Test, Playwright CLI, GitHub Actions.

---

## File Map

- `package.json`: Playwright 의존성과 `e2e` 실행 script를 추가한다.
- `package-lock.json`: 새 dependency lockfile을 반영한다.
- `.nvmrc`: 로컬 Node 기준을 `24.14.1`로 올린다.
- `.gitignore`: `playwright-report`, `test-results` 같은 실행 산출물을 ignore한다.
- `playwright.config.ts`: 공통 Playwright 설정과 web server, artifact 정책을 정의한다.
- `src/features/regions/components/RegionAddressInput.tsx`: label/select 연결을 보강해 Playwright locator를 안정화한다.
- `e2e/local-council/local-sample.spec.ts`: sample 기반 smoke E2E를 추가한다.
- `e2e/local-council/integration.spec.ts`: integration E2E skeleton과 environment guard를 추가한다.
- `docs/local-council/runbooks/playwright-e2e.md`: Playwright Test와 CLI 실행 방법을 정리한다.
- `.github/workflows/ci.yml`: smoke E2E job을 추가한다.

## Preflight

- [ ] **Step 1: 작업 위치와 baseline을 확인한다**

Run:

```bash
pwd
git branch --show-current
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npm test'
```

Expected:

```text
/Users/eric/dev/upstage/woogook/woogook-frontend/.worktrees/local-council-playwright-e2e
codex/local-council-playwright-e2e
Test Files  8 passed (8)
Tests       30 passed (30)
```

Do not start implementation if baseline diverges unexpectedly.

---

### Task 1: Add Playwright Tooling and Node 24 Baseline

**Files:**
- Modify: `.nvmrc`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.ts`

- [ ] **Step 1: Add a failing smoke Playwright spec reference before config exists**

Create `e2e/local-council/local-sample.spec.ts` with this minimal content. It should fail because Playwright is not installed/configured yet.

```ts
import { expect, test } from "@playwright/test";

test("local-council sample smoke flow renders the roster shell", async ({ page }) => {
  await page.goto("/local-council");
  await page.getByRole("button", { name: "서울 강동구 천호동" }).click();
  await expect(page.getByRole("heading", { name: "서울특별시 강동구" })).toBeVisible();
});
```

- [ ] **Step 2: Run the failing smoke spec**

Run:

```bash
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npx playwright test e2e/local-council/local-sample.spec.ts'
```

Expected: FAIL with missing `@playwright/test` package or missing Playwright config/browser setup.

- [ ] **Step 3: Add Playwright dependencies and scripts**

Update `package.json` so `devDependencies` includes:

```json
"@playwright/test": "^1.55.0"
```

and `scripts` includes:

```json
"e2e": "playwright test",
"e2e:smoke": "playwright test e2e/local-council/local-sample.spec.ts",
"e2e:integration": "PLAYWRIGHT_LOCAL_COUNCIL_INTEGRATION=1 playwright test e2e/local-council/integration.spec.ts",
"e2e:install": "playwright install --with-deps chromium"
```

Update `.gitignore` to include:

```gitignore
/playwright-report/
/test-results/
```

Update `.nvmrc` to:

```text
24.14.1
```

- [ ] **Step 4: Create the Playwright config**

Create `playwright.config.ts` with this baseline:

```ts
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT || "3000");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

- [ ] **Step 5: Install dependencies and browsers**

Run:

```bash
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npm install'
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npm run e2e:install'
```

Expected: PASS, with Chromium browser assets installed.

---

### Task 2: Stabilize Browser Locators and Make Smoke Spec Pass

**Files:**
- Modify: `src/features/regions/components/RegionAddressInput.tsx`
- Modify: `e2e/local-council/local-sample.spec.ts`

- [ ] **Step 1: Strengthen the smoke spec with real user flow assertions**

Replace `e2e/local-council/local-sample.spec.ts` with:

```ts
import { expect, test } from "@playwright/test";

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
  await expect(page.getByText("김가동")).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("heading", { name: "서울특별시 강동구" })).toBeVisible();

  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "우리동네 지방의원을 확인하세요" }),
  ).toBeVisible();
});
```

- [ ] **Step 2: Run the smoke spec and capture the expected locator/navigation failure**

Run:

```bash
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npm run e2e:smoke'
```

Expected: FAIL because one or more elements do not yet expose stable accessible names or the detail/back navigation assertion is incomplete.

- [ ] **Step 3: Add explicit label/select bindings in `RegionAddressInput`**

Update `SelectField` in `src/features/regions/components/RegionAddressInput.tsx` to accept `id` and connect it:

```tsx
function SelectField({
  id,
  label,
  sublabel,
  value,
  onChange,
  disabled,
  placeholder,
  options,
}: {
  id: string;
  label: string;
  sublabel?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
  options: string[];
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-semibold tracking-wide"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
        {sublabel && <span style={{ color: "var(--text-tertiary)" }}> {sublabel}</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-[48px] w-full cursor-pointer appearance-none rounded px-3 pr-9 text-[14px] disabled:opacity-40"
        >
```

Then wire call sites with stable ids:

```tsx
<SelectField id="region-city" ... />
<SelectField id="region-district" ... />
<SelectField id="region-dong" ... />
```

- [ ] **Step 4: If needed, adjust the smoke spec to assert the actual detail shell**

Use the existing UI text as-is; do not add test-only copy unless necessary. Prefer `getByRole`, `getByText`, and the existing button names before introducing `data-testid`.

- [ ] **Step 5: Run smoke spec until green**

Run:

```bash
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npm run e2e:smoke'
```

Expected: PASS with 1 test, 0 failures.

---

### Task 3: Add Integration Spec Skeleton and Runtime Guard

**Files:**
- Create: `e2e/local-council/integration.spec.ts`
- Create: `docs/local-council/runbooks/playwright-e2e.md`

- [ ] **Step 1: Add the integration spec first with an environment guard**

Create `e2e/local-council/integration.spec.ts` with:

```ts
import { expect, test } from "@playwright/test";

const enabled = process.env.PLAYWRIGHT_LOCAL_COUNCIL_INTEGRATION === "1";

test.skip(!enabled, "integration harness is disabled");

test("local-council integration flow resolves a real district and opens detail", async ({
  page,
}) => {
  await page.goto("/local-council");

  await page.getByLabel("시/도").selectOption("서울특별시");
  await page.getByLabel("구/군/시").selectOption("강동구");
  await page.getByLabel("읍/면/동").selectOption("천호동");
  await page.getByRole("button", { name: "지방의원 확인하기" }).click();

  await expect(page.getByRole("heading", { name: "서울특별시 강동구" })).toBeVisible();
});
```

- [ ] **Step 2: Run the integration spec with the guard still off**

Run:

```bash
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npm run e2e:integration'
```

Expected: PASS with the spec reported as skipped, not failed.

- [ ] **Step 3: Add the runbook for both Playwright Test and CLI**

Create `docs/local-council/runbooks/playwright-e2e.md` and document:

```md
# 현직 지방의원 Playwright E2E Runbook

## Smoke

```bash
npm run e2e:smoke
```

## Integration

1. `woogook-backend`에서 postgres와 backend를 띄운다.
2. frontend에서 `WOOGOOK_BACKEND_BASE_URL`를 backend URL로 지정한다.
3. 아래 명령으로 integration spec을 실행한다.

```bash
PLAYWRIGHT_LOCAL_COUNCIL_INTEGRATION=1 npm run e2e:integration
```

## CLI

Playwright CLI는 locator 탐색, 실패 재현, 실제 DOM 상태 확인에만 사용한다. 기준 회귀 테스트는 반드시 `Playwright Test` spec으로 남긴다.
```

- [ ] **Step 4: Re-run smoke and the skipped integration command**

Run:

```bash
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npm run e2e:smoke'
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npm run e2e:integration'
```

Expected: smoke PASS, integration SKIPPED.

---

### Task 4: Wire Smoke E2E into CI

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add smoke E2E steps after unit tests**

Update `.github/workflows/ci.yml` to install browsers and run smoke E2E:

```yml
      - name: Install Playwright browsers
        run: npm run e2e:install

      - name: Run smoke E2E
        run: npm run e2e:smoke
```

Keep `lint`, `test`, and `build` in the workflow.

- [ ] **Step 2: Run lint, unit tests, and smoke E2E locally**

Run:

```bash
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npm run lint'
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npm run test'
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npm run e2e:smoke'
```

Expected: all PASS.

- [ ] **Step 3: Run build once Playwright changes are stable**

Run:

```bash
zsh -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.21.0 >/dev/null; npm run build'
```

Expected: PASS.

- [ ] **Step 4: Commit the implementation branch**

Run:

```bash
git add .nvmrc .gitignore package.json package-lock.json playwright.config.ts \
  src/features/regions/components/RegionAddressInput.tsx \
  e2e/local-council/local-sample.spec.ts e2e/local-council/integration.spec.ts \
  docs/local-council/runbooks/playwright-e2e.md .github/workflows/ci.yml
git commit -m "feat(local-council): Playwright E2E 기반 추가"
```

Expected: commit succeeds with all browser automation changes grouped together.
