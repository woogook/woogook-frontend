# Frontend Observability Single Env PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** root `/.env` 하나만 수정해 frontend 앱과 local observability stack을 함께 실행할 수 있도록 single-env PoC를 구현한다.

**Architecture:** root `/.env`를 사용자가 관리하는 source of truth로 두고, stack 실행 전 helper script가 필요한 key만 골라 `ops/observability/.env`를 생성한다. frontend 앱은 계속 root `/.env`를 직접 읽고, `docker compose` 기반 stack은 generated mirror만 읽도록 유지해 이후 재분리를 쉽게 만든다.

**Tech Stack:** `Node.js`, `Vitest`, `Next.js 16`, `Docker Compose`, `Grafana`, `Loki`, `Prometheus`

---

### Task 1: stack env sync helper를 테스트 우선으로 추가한다

**Files:**
- Create: `scripts/observability/sync-stack-env.mjs`
- Create: `scripts/observability/sync-stack-env.test.mjs`

- [ ] **Step 1: failing test로 입력 우선순위와 출력 키를 고정한다**

```js
import { describe, expect, it } from "vitest";

import {
  STACK_ENV_KEYS,
  buildStackEnvContent,
  resolveSourceEnvPath,
} from "./sync-stack-env.mjs";

describe("sync stack env", () => {
  it("prefers /.env over /.env.example", () => {
    expect(
      resolveSourceEnvPath({
        cwd: "/tmp/project",
        existsSync: (target) => target === "/tmp/project/.env",
      }),
    ).toBe("/tmp/project/.env");
  });

  it("falls back to /.env.example when /.env is missing", () => {
    expect(
      resolveSourceEnvPath({
        cwd: "/tmp/project",
        existsSync: (target) => target === "/tmp/project/.env.example",
      }),
    ).toBe("/tmp/project/.env.example");
  });

  it("writes only stack keys in a stable order", () => {
    expect(STACK_ENV_KEYS).toEqual([
      "GRAFANA_ADMIN_USER",
      "GRAFANA_ADMIN_PASSWORD",
      "GRAFANA_ALERTS_DISCORD_WEBHOOK_URL",
      "FRONTEND_METRICS_TARGET",
    ]);

    expect(
      buildStackEnvContent({
        GRAFANA_ADMIN_USER: "admin",
        GRAFANA_ADMIN_PASSWORD: "admin",
        GRAFANA_ALERTS_DISCORD_WEBHOOK_URL: "https://discord.example/webhook",
        FRONTEND_METRICS_TARGET: "host.docker.internal:3000",
        WOOGOOK_OBSERVABILITY_ENV: "local",
      }),
    ).toBe(`GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
GRAFANA_ALERTS_DISCORD_WEBHOOK_URL=https://discord.example/webhook
FRONTEND_METRICS_TARGET=host.docker.internal:3000
`);
  });
});
```

- [ ] **Step 2: 새 테스트가 RED인지 확인한다**

Run: `npm run test -- scripts/observability/sync-stack-env.test.mjs`  
Expected: `Cannot find module './sync-stack-env.mjs'` 또는 export 누락으로 실패한다.

- [ ] **Step 3: 최소 sync helper를 구현한다**

```js
export const STACK_ENV_KEYS = [
  "GRAFANA_ADMIN_USER",
  "GRAFANA_ADMIN_PASSWORD",
  "GRAFANA_ALERTS_DISCORD_WEBHOOK_URL",
  "FRONTEND_METRICS_TARGET",
];

export function resolveSourceEnvPath({
  cwd = process.cwd(),
  existsSync = fs.existsSync,
} = {}) {
  const envPath = path.join(cwd, ".env");
  if (existsSync(envPath)) return envPath;

  const examplePath = path.join(cwd, ".env.example");
  if (existsSync(examplePath)) return examplePath;

  throw new Error("root .env or .env.example is required");
}

export function buildStackEnvContent(envMap) {
  return `${STACK_ENV_KEYS.map((key) => `${key}=${envMap[key] ?? ""}`).join("\n")}\n`;
}
```

`main()`에서는 root env를 파싱한 뒤 `ops/observability/.env`를 쓰고, `synced stack env: <path> (source: <path>)` 형식으로 출력한다.

- [ ] **Step 4: targeted test를 GREEN으로 만든다**

Run: `npm run test -- scripts/observability/sync-stack-env.test.mjs`  
Expected: `1 file passed`

- [ ] **Step 5: helper의 실제 CLI 동작도 한 번 검증한다**

Run: `node scripts/observability/sync-stack-env.mjs`  
Expected: `ops/observability/.env` 경로와 source 경로가 출력된다.

### Task 2: root `/.env.example`를 canonical example로 확장하고 stack script를 연결한다

**Files:**
- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: `package.json`
- Delete: `ops/observability/.env.example`

- [ ] **Step 1: root example에 stack key까지 포함하는 failing test를 쓴다**

`sync-stack-env.test.mjs`에 아래 검증을 추가한다.

```js
it("allows empty stack webhook values without dropping the key", () => {
  expect(
    buildStackEnvContent({
      GRAFANA_ADMIN_USER: "admin",
      GRAFANA_ADMIN_PASSWORD: "admin",
      GRAFANA_ALERTS_DISCORD_WEBHOOK_URL: "",
      FRONTEND_METRICS_TARGET: "host.docker.internal:3000",
    }),
  ).toContain("GRAFANA_ALERTS_DISCORD_WEBHOOK_URL=\n");
});
```

- [ ] **Step 2: RED를 확인한다**

Run: `npm run test -- scripts/observability/sync-stack-env.test.mjs`  
Expected: 아직 빈 문자열 보존이나 정렬이 맞지 않으면 실패한다.

- [ ] **Step 3: example와 script wiring을 최소 수정으로 반영한다**

수정 기준:

- root `/.env.example`에 아래 stack 섹션을 추가한다.

```dotenv
# observability local stack
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
GRAFANA_ALERTS_DISCORD_WEBHOOK_URL=
FRONTEND_METRICS_TARGET=host.docker.internal:3000
```

- `package.json` stack 스크립트는 모두 sync step을 선행한다.

```json
{
  "observability:stack:sync-env": "node scripts/observability/sync-stack-env.mjs",
  "observability:stack:config": "npm run observability:stack:sync-env && docker compose -f ops/observability/docker-compose.yml --env-file ops/observability/.env config",
  "observability:stack:up": "npm run observability:stack:sync-env && docker compose -f ops/observability/docker-compose.yml --env-file ops/observability/.env up -d",
  "observability:stack:down": "npm run observability:stack:sync-env && docker compose -f ops/observability/docker-compose.yml --env-file ops/observability/.env down -v"
}
```

- `ops/observability/.env.example`는 삭제한다.
- `.gitignore`에서 `!ops/observability/.env.example` 예외는 제거하고, `ops/observability/.env` ignore는 유지한다.

- [ ] **Step 4: targeted test를 다시 GREEN으로 만든다**

Run: `npm run test -- scripts/observability/sync-stack-env.test.mjs`  
Expected: `1 file passed`

- [ ] **Step 5: generated mirror가 실제로 생기는지 확인한다**

Run: `npm run observability:stack:sync-env && cat ops/observability/.env`  
Expected: `GRAFANA_*`, `FRONTEND_METRICS_TARGET` 네 줄이 출력된다.

### Task 3: runbook와 local 문서를 single `/.env` 흐름으로 정리한다

**Files:**
- Modify: `docs/common/runbooks/frontend-observability-local-runbook.md`
- Modify as needed: `docs/superpowers/specs/2026-04-14-frontend-observability-single-env-poc-design.md`

- [ ] **Step 1: 문서 drift를 드러내는 grep 점검을 먼저 돌린다**

Run: `rg -n "ops/observability/.env.example|\\.env.local|cp \\.env.example \\.env|observability:stack:sync-env" docs/common/runbooks/frontend-observability-local-runbook.md docs/superpowers/specs/2026-04-14-frontend-observability-single-env-poc-design.md`  
Expected: `ops/observability/.env.example` 또는 남은 `.env.local` 참조가 보인다.

- [ ] **Step 2: runbook를 실제 실행 순서와 맞춘다**

반영 기준:

- stack 준비는 `cp .env.example .env`만 안내한다.
- `npm run observability:stack:up` 전에 별도 `ops/observability/.env` 생성 단계를 제거한다.
- `ops/observability/.env`는 generated file이라고 설명한다.
- `.env.local`이 남아 있으면 `.env`를 덮어쓴다는 경고는 유지한다.

- [ ] **Step 3: spec 문서도 구현안과 같은 표현으로 맞춘다**

반영 기준:

- root `/.env.example`가 canonical example이라는 점
- `ops/observability/.env`가 generated mirror라는 점
- `ops/observability/.env.example`를 더 이상 기준 파일로 쓰지 않는다는 점

- [ ] **Step 4: 문서 참조가 정리됐는지 다시 확인한다**

Run: `rg -n "ops/observability/.env.example" docs/common/runbooks/frontend-observability-local-runbook.md docs/superpowers/specs/2026-04-14-frontend-observability-single-env-poc-design.md package.json`  
Expected: 출력이 없거나, 남아 있더라도 deprecated 설명 한 곳만 남는다.

### Task 4: 검증 명령을 single-env 흐름 기준으로 다시 실행한다

**Files:**
- Modify as needed: 관련 구현 파일 전반

- [ ] **Step 1: observability script test 묶음을 실행한다**

Run: `npm run test -- scripts/observability`  
Expected: sync helper test를 포함해 observability script test가 모두 통과한다.

- [ ] **Step 2: lint를 실행한다**

Run: `npm run lint`  
Expected: 새 에러가 없고, 기존 warning만 남거나 warning 없이 종료된다.

- [ ] **Step 3: stack config 경로를 실행한다**

Run: `npm run observability:stack:config`  
Expected: sync step 후 `docker compose ... config`가 exit 0으로 끝난다.

- [ ] **Step 4: 이동된 기본 워크트리 변경분까지 포함해 최종 상태를 확인한다**

Run: `git status --short`  
Expected: single-env PoC 관련 파일만 변경된 상태로 보인다.
