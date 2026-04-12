# woogook-frontend

국회와 지방선거 서비스를 도메인별로 나눠 제공하는 Next.js 프런트엔드입니다.
루트 `/`는 서비스 허브이고, 실제 기능은 `/assembly`, `/local-election`로 분리합니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다.

## Observability

frontend observability는 `Phase A` 기준으로 저장소 내부에서 바로 동작한다.

- 로컬 로그 경로: `.logs/frontend/YYYY-MM-DD/browser.ndjson`, `.logs/frontend/YYYY-MM-DD/server.ndjson`, `.logs/frontend/YYYY-MM-DD/analyzer.ndjson`
- 브라우저 ingest endpoint: `/api/observability/browser-events`
- Prometheus metrics endpoint: `/api/observability/metrics`
- Grafana alert analyzer webhook: `/api/observability/analyzer`

### 주요 환경변수

- `WOOGOOK_OBSERVABILITY_ENV`
- `WOOGOOK_OBSERVABILITY_RELEASE`
- `WOOGOOK_OBSERVABILITY_LOCAL_ROOT_DIR`
- `WOOGOOK_OBSERVABILITY_WRITE_LOCAL_FILES`
- `WOOGOOK_OBSERVABILITY_ROTATE_BYTES`
- `WOOGOOK_OBSERVABILITY_RETENTION_DAYS`
- `WOOGOOK_OBSERVABILITY_LOCAL_MIRROR_TO_CLOUD`
- `WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL`
- `WOOGOOK_OBSERVABILITY_LOKI_QUERY_URL`
- `WOOGOOK_OBSERVABILITY_LOKI_USERNAME`
- `WOOGOOK_OBSERVABILITY_LOKI_PASSWORD`
- `WOOGOOK_OBSERVABILITY_DISCORD_WEBHOOK_URL`
- `WOOGOOK_OBSERVABILITY_LLM_WEBHOOK_URL`
- `WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS`
- `WOOGOOK_OBSERVABILITY_ANALYZER_LOOKBACK_MINUTES`

로컬 개발에서는 기본적으로 full-fidelity 파일 로그만 남기고, `WOOGOOK_OBSERVABILITY_LOCAL_MIRROR_TO_CLOUD=true`일 때만 cloud 전송을 시도한다.
`WOOGOOK_OBSERVABILITY_LOKI_QUERY_URL`을 비우면 `.../loki/api/v1/push`에서 `.../loki/api/v1/query_range`를 자동 유도한다.

## 주요 진입 경로

- `/`: 서비스 허브
- `/assembly`: 국회 서비스
- `/local-election`: 지방선거 서비스

## 현재 스택

- `Next.js 16` + `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Zod`
- `@tanstack/react-query`
- `Vitest`
- `prom-client`
- `shadcn/ui` 최소 구성 (`Button`, `Tabs`, `Alert`)
- `pg`

## 이번 구조 정리

- API 라우트 입력/응답 검증은 `src/lib/schemas.ts`에서 관리합니다.
- 클라이언트 fetch와 캐시는 `src/lib/api-client.ts`와 `React Query`를 사용합니다.
- UI 공용 컴포넌트는 `src/components/ui` 아래에 둡니다.
- 지방선거 기능 조합은 `src/features/local-election` 아래로 모읍니다.
- 정책, 원칙, 실무 기준 문서는 `docs/**` 아래에 둡니다.

## 작업 문서 진입

- 공통 라우터: `AGENTS.md`
- 공통 agent control-plane: `.agents/README.md`
- 공통 workflow: `.agents/workflows/*`
- machine-facing contract: `.agents/contracts/common.yaml`
- 배포 의사결정: `docs/common/canonical/frontend-deployment-decision.md`
- 배포 runbook: `docs/common/runbooks/vercel-deployment-runbook.md`
- 국회 온보딩: `docs/assembly/onboarding/assembly-team-onboarding.md`
- 현직 지방의원 진입: `docs/local-council/canonical/llm-entry.md`

## 샘플 데이터

- build에서 사용하는 추적 대상 샘플 JSON은 `src/data/samples`에 둡니다.
- Inspector나 별도 로컬 실험용 JSON은 `2026_data`에 둘 수 있지만, 앱 빌드는 이 디렉터리에 의존하지 않습니다.

## 주요 화면 / 경로

- 서비스 허브: `src/app/page.tsx`
- 국회 엔트리: `src/app/assembly/page.tsx`
- 지방선거 엔트리: `src/app/local-election/page.tsx`
- 주소 선택: `src/app/components/AddressInput.tsx`
- 투표지 조회: `src/app/api/ballots/route.ts`
