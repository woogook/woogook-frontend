# Frontend Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `woogook-frontend`에 로컬 전체 파일 로깅, 브라우저/서버 구조화 telemetry, Prometheus metrics, Grafana/Discord/LLM analyzer Phase A 경로를 구현한다.

**Architecture:** 브라우저 이벤트와 Next 서버 이벤트를 하나의 공통 envelope로 맞추고, 로컬에서는 `.logs/frontend/YYYY-MM-DD/*.ndjson`에 full-fidelity로 적재한다. 운영/preview에서는 서버가 Loki push API와 alert/analyzer webhook에 연결할 수 있게 하고, API route와 client fetch에 correlation id와 metrics를 심는다.

**Tech Stack:** `Next.js 16`, `React 19`, `TypeScript`, `zod`, `prom-client`, `vitest`

---

### Task 1: 테스트/설정 기반 추가

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `.gitignore`
- Create: `vitest.config.ts`
- Create: `src/lib/observability/__tests__/config.test.ts`

- [ ] **Step 1: 관측성 유틸 테스트 러너를 먼저 추가한다**

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  },
  "dependencies": {
    "prom-client": "^15.1.3"
  }
}
```

- [ ] **Step 2: CI에 테스트를 포함한다**

```yaml
- name: Run tests
  run: npm run test
```

- [ ] **Step 3: 로컬 로그 디렉터리를 ignore 한다**

```gitignore
/.logs/
```

- [ ] **Step 4: observability env/config의 기본값을 검증하는 실패 테스트를 쓴다**

```ts
import { describe, expect, it } from "vitest";
import { parseObservabilityConfig } from "@/lib/observability/config";

describe("parseObservabilityConfig", () => {
  it("provides local logging defaults when env is empty", () => {
    const config = parseObservabilityConfig({});

    expect(config.localRootDir).toContain(".logs/frontend");
    expect(config.rotateBytes).toBe(50 * 1024 * 1024);
    expect(config.retentionDays).toBe(14);
  });
});
```

### Task 2: 공통 observability core 구현

**Files:**
- Create: `src/lib/observability/config.ts`
- Create: `src/lib/observability/types.ts`
- Create: `src/lib/observability/correlation.ts`
- Create: `src/lib/observability/local-file.ts`
- Create: `src/lib/observability/metrics.ts`
- Create: `src/lib/observability/server.ts`
- Create: `src/lib/observability/__tests__/local-file.test.ts`
- Create: `src/lib/observability/__tests__/server.test.ts`

- [ ] **Step 1: local file rotation과 gzip 보존 정책의 실패 테스트를 쓴다**

```ts
it("rolls over to the next suffix when the file exceeds rotateBytes", async () => {
  // append twice with tiny rotateBytes and assert server.001.ndjson exists
});
```

- [ ] **Step 2: correlation id와 공통 envelope 유틸을 구현한다**

```ts
export function getOrCreateCorrelationId(headers: Headers): string {
  return headers.get("x-correlation-id") ?? crypto.randomUUID();
}
```

- [ ] **Step 3: NDJSON writer를 구현한다**

```ts
await appendObservabilityEvent({
  channel: "server",
  event,
});
```

- [ ] **Step 4: Prometheus registry와 request/error metric helper를 구현한다**

```ts
requestDuration.observe(labels, seconds);
requestTotal.inc(labels);
```

- [ ] **Step 5: server logger와 Loki push transport를 구현한다**

```ts
await logServerEvent({
  level: "error",
  component: "next-api",
  signalType: "server_error",
  route,
  correlationId,
});
```

### Task 3: 브라우저 이벤트 수집과 client 계측

**Files:**
- Create: `src/lib/observability/client.ts`
- Create: `src/app/components/ObservabilityBootstrap.tsx`
- Create: `src/app/api/observability/browser-events/route.ts`
- Modify: `src/app/providers.tsx`
- Modify: `src/lib/api-client.ts`
- Create: `src/lib/observability/__tests__/client.test.ts`

- [ ] **Step 1: client payload builder와 session id 유지 로직의 실패 테스트를 쓴다**

```ts
it("reuses the same session id for repeated browser events", () => {
  // same storage -> same session id
});
```

- [ ] **Step 2: window error, unhandled rejection, page view를 수집하는 bootstrap component를 구현한다**

```tsx
useEffect(() => {
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  return () => { /* cleanup */ };
}, []);
```

- [ ] **Step 3: 브라우저 이벤트 ingest route를 구현한다**

```ts
export async function POST(request: Request) {
  const payload = browserEventBatchSchema.parse(await request.json());
  await ingestBrowserEvents(payload);
  return Response.json({ accepted: payload.events.length });
}
```

- [ ] **Step 4: api-client fetch에 correlation id header와 실패 로그를 추가한다**

```ts
headers.set("x-correlation-id", correlationId);
emitClientApiFailure(...);
```

### Task 4: 서버 route 계측과 analyzer/metrics endpoint 추가

**Files:**
- Create: `src/app/api/observability/metrics/route.ts`
- Create: `src/app/api/observability/analyzer/route.ts`
- Modify: `src/app/api/ballots/route.ts`
- Modify: `src/app/api/regions/cities/route.ts`
- Modify: `src/app/api/regions/sigungu/route.ts`
- Modify: `src/app/api/regions/emd/route.ts`
- Modify: `src/app/api/assembly/v1/members/route.ts`
- Modify: `src/app/api/local-election/v1/chat/_shared.ts`
- Modify: `src/app/api/local-election/v1/chat/conversations/route.ts`
- Modify: `src/app/api/local-election/v1/chat/conversations/[conversationId]/route.ts`
- Modify: `src/app/api/local-election/v1/chat/conversations/[conversationId]/messages/route.ts`
- Create: `src/lib/observability/analyzer.ts`
- Create: `src/lib/observability/__tests__/analyzer.test.ts`

- [ ] **Step 1: analyzer 요약 생성기의 실패 테스트를 쓴다**

```ts
it("builds a human-readable incident summary from alert labels and recent events", () => {
  // expect summary sections and next actions
});
```

- [ ] **Step 2: metrics endpoint를 구현한다**

```ts
export async function GET() {
  return new Response(await metricsRegistry.metrics(), {
    headers: { "content-type": metricsRegistry.contentType },
  });
}
```

- [ ] **Step 3: Grafana alert webhook를 analyzer route로 받아 Discord/LLM 후속 처리 경로를 구현한다**

```ts
const summary = await buildIncidentSummary(payload);
await maybeSendDiscord(summary);
await maybeSendLlm(summary);
```

- [ ] **Step 4: 기존 API route를 공통 observability helper로 감싼다**

```ts
return observeRoute(request, "regions/cities", async (context) => {
  // existing handler body
});
```

### Task 5: 문서 정리와 최종 검증

**Files:**
- Modify: `README.md`
- Modify: `docs/common/runbooks/vercel-deployment-runbook.md`

- [ ] **Step 1: README에 observability 환경변수와 로컬 로그 경로를 문서화한다**

```md
- 로컬 로그: `.logs/frontend/YYYY-MM-DD/*.ndjson`
- metrics: `/api/observability/metrics`
- analyzer webhook: `/api/observability/analyzer`
```

- [ ] **Step 2: runbook에 Grafana/Discord 연결 순서를 추가한다**

```md
- Grafana Cloud Loki push credential
- Discord webhook
- analyzer webhook URL
```

- [ ] **Step 3: 전체 검증을 실행한다**

```bash
npm run test
npm run lint
npm run build
```

- [ ] **Step 4: 검증이 끝나면 의미 있는 단위로 commit 한다**

```bash
git add .
git commit -m "feat(common): 프런트 observability 기초 구현"
```
