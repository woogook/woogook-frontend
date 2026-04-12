# frontend observability phase a

## 배경

- 기준 이슈: `#22`
- 설계 문서: `docs/superpowers/specs/2026-04-12-frontend-observability-design.md`
- 목표는 backend와 분리된 frontend 전용 observability의 Phase A를 현재 저장소 안에서 먼저 가동하는 것이다.
- `Vercel Hobby` 제약 때문에 플랫폼 로그 drain에 기대지 않고, 앱 레벨 telemetry와 metrics를 직접 심어야 한다.

## 변경 사항

- `vitest`와 `prom-client`를 추가하고 CI에 `npm run test`를 포함했다.
- `.logs/frontend/YYYY-MM-DD/*.ndjson` 로컬 로그 정책과 rotation 기반 writer를 추가했다.
- 브라우저/서버/analyzer 공통 observability envelope와 correlation id 유틸을 추가했다.
- 브라우저 bootstrap, browser ingest route, metrics endpoint, analyzer webhook route를 추가했다.
- `api-client`에 correlation id 전파와 client-side 실패 로깅을 추가했다.
- 주요 API route와 backend proxy route를 `observeRoute` helper로 감싸 request metric과 structured error logging을 추가했다.
- README와 배포 runbook에 observability endpoint와 환경변수를 문서화했다.

## 비채택안

- preview/production에서도 항상 로컬 파일 쓰기를 시도하는 안은 채택하지 않았다.
  - 이유: `Vercel` serverless 파일시스템에서 실패 지점이 되므로, 기본값은 `local` 환경에서만 파일 기록으로 제한했다.
- 모든 `info`급 page-view/request 로그를 Loki로 보내는 안은 채택하지 않았다.
  - 이유: free tier 소모가 커서 `warn/error`와 analyzer/pipeline event 중심으로 cloud 전송 기준을 줄였다.
- LLM 공급자별 SDK를 저장소에 직접 넣는 안은 채택하지 않았다.
  - 이유: 우선은 generic webhook 연동으로 두고, 공급자 선택은 후속 단계로 분리했다.

## 검증

- `npm run test`
- `npm run lint`
  - 기존 `src/app/components/CandidateCards.tsx`의 `@next/next/no-img-element` warning 1건 유지
- `npm run build`

## 후속 메모

- `WOOGOOK_OBSERVABILITY_LLM_WEBHOOK_URL`의 실제 LLM 공급자 연결은 후속 작업으로 분리한다.
- `EC2 frontend-observability gateway`가 준비되면 direct Loki push와 analyzer 실행 위치를 재정렬한다.
- `Vercel` worktree의 추가 lockfile warning을 없애려면 `next.config.ts`의 `turbopack.root` 정리가 필요하다.
