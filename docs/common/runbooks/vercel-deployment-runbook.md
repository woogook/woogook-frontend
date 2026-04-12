# Vercel 배포 Runbook

- 문서 유형: `runbook`
- 소유 도메인: `common`
- 상태: `draft`
- 관련 의사결정 문서: `docs/common/canonical/frontend-deployment-decision.md`
- 최종 갱신일: `2026-04-02`

## 목적

- `woogook-frontend`를 Vercel에 배포할 때 담당자가 실제로 따라갈 수 있는 절차를 정리한다.
- `Vercel Hobby + GitHub Actions + Vercel CLI`를 기준 경로로 사용한다.
- API 서버가 준비되기 전에는 사전 준비 체크리스트로, 준비된 뒤에는 실제 배포 runbook으로 갱신한다.

## 적용 범위

- 프런트 저장소: `woogook-frontend`
- 프런트 배포: `Vercel Hobby`
- API 서버: `EC2`
- DB: `RDS`

## 이 문서를 읽기 전에

배포 배경과 의사결정 이유는 아래 문서에서 확인한다.

- `docs/common/canonical/frontend-deployment-decision.md`

## 현재 기준 운영 원칙

- Vercel의 Git integration만으로 팀 배포를 운영하지 않는다.
- 기본 배포 경로는 `GitHub Actions + Vercel CLI`다.
- 현재 저장소에 실제로 추가된 workflow는 `.github/workflows/ci.yml` 하나다.
- `ci.yml`은 `pull_request`와 `main` branch `push`에서만 실행된다.
- preview / production deploy workflow는 backend/API와 Vercel 환경이 준비된 뒤 후속으로 추가한다.
- 외부 fork PR에서는 secrets 기반 deploy를 시도하지 않는다.

## Phase 0. 사전 준비

### 0-1. 저장소와 권한

- [ ] 저장소가 `public repo`인지 확인한다.
- [ ] Vercel 프로젝트 owner를 정한다.
- [ ] GitHub Actions를 수정할 수 있는 권한이 있는지 확인한다.
- [ ] GitHub Secrets를 추가할 수 있는 권한이 있는지 확인한다.

### 0-2. 런타임 정렬

- [ ] 로컬 개발 환경 Node 버전을 `20.9+`로 맞춘다.
- [ ] GitHub Actions runner에서도 Node `20` 또는 그 이상을 사용한다.
- [ ] `package.json`에 Node 버전 정책을 명시할지 결정한다.

### 0-3. 프런트 구조 확인

- [ ] 프런트가 호출하는 API 경로를 점검한다.
- [ ] 프런트의 DB 직접 접근 route를 정리 대상으로 식별한다.
- [ ] API 서버가 제공해야 할 엔드포인트 목록을 확정한다.

우선 점검 대상 경로는 아래와 같다.

- `src/lib/db.ts`
- `src/app/api/ballots/route.ts`
- `src/app/api/regions/cities/route.ts`
- `src/app/api/regions/sigungu/route.ts`
- `src/app/api/regions/emd/route.ts`
- `src/app/api/assembly/v1/members/route.ts`
- `src/app/api/local-election/v1/chat/_shared.ts`
- `src/lib/api-client.ts`

## Phase 1. API 준비 여부 확인

Vercel production 배포 전에는 최소한 아래 조건이 충족돼야 한다.

- [ ] EC2 API 서버가 외부에서 접근 가능하다.
- [ ] 프런트가 필요한 엔드포인트가 모두 동작한다.
- [ ] API base URL이 고정돼 있다.
- [ ] preview와 production에서 사용할 API 주소 정책이 정리돼 있다.

최소 엔드포인트 범위

- [ ] `ballots`
- [ ] `regions/cities`
- [ ] `regions/sigungu`
- [ ] `regions/emd`
- [ ] `assembly/v1/members`
- [ ] `local-election/v1/chat/*`

## Phase 2. Vercel 프로젝트 준비

### 2-1. 로컬에서 프로젝트 연결

```bash
vercel login
vercel link
```

확인 항목

- [ ] 연결 대상 Vercel 계정이 올바른가
- [ ] 연결된 프로젝트가 `woogook-frontend`와 맞는가
- [ ] `.vercel/project.json`이 생성됐는가

### 2-2. 프로젝트 ID와 org ID 확인

`.vercel/project.json`에서 아래 값을 확인한다.

- `projectId`
- `orgId`

이 값은 GitHub Actions secrets에 사용한다.

### 2-3. 환경변수 등록

Vercel 프로젝트에서 아래 환경변수를 분리해서 관리한다.

- Preview
- Production

최소 필수 후보

- `WOOGOOK_BACKEND_BASE_URL`
- `WOOGOOK_OBSERVABILITY_ENV`
- `WOOGOOK_OBSERVABILITY_RELEASE`

필요 시 추가 후보

- 프런트 전용 feature flag
- 배포 환경 표시용 값
- `WOOGOOK_OBSERVABILITY_LOKI_PUSH_URL`
- `WOOGOOK_OBSERVABILITY_LOKI_QUERY_URL`
- `WOOGOOK_OBSERVABILITY_LOKI_USERNAME`
- `WOOGOOK_OBSERVABILITY_LOKI_PASSWORD`
- `WOOGOOK_OBSERVABILITY_DISCORD_WEBHOOK_URL`
- `WOOGOOK_OBSERVABILITY_LLM_WEBHOOK_URL`
- `WOOGOOK_OBSERVABILITY_OUTBOUND_TIMEOUT_MS`
- `WOOGOOK_OBSERVABILITY_ANALYZER_LOOKBACK_MINUTES`

로컬에서는 아래 값을 선택적으로 사용한다.

- `WOOGOOK_OBSERVABILITY_LOCAL_ROOT_DIR`
- `WOOGOOK_OBSERVABILITY_WRITE_LOCAL_FILES`
- `WOOGOOK_OBSERVABILITY_ROTATE_BYTES`
- `WOOGOOK_OBSERVABILITY_RETENTION_DAYS`
- `WOOGOOK_OBSERVABILITY_LOCAL_MIRROR_TO_CLOUD`

## Phase 3. GitHub Secrets 준비

GitHub 저장소 Secrets에 아래 값을 추가한다.

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

권장 방식

- `VERCEL_TOKEN`: Vercel owner 또는 배포 전담 계정의 access token 사용
- `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`: `vercel link`로 연결한 프로젝트 기준 값 사용

주의

- 외부 fork PR에는 secrets가 전달되지 않는다.
- 따라서 `pull_request` 이벤트에서 deploy job을 실행하지 않는다.

## Phase 4. GitHub Actions 설계

이 절은 `현재 구현된 workflow`와 `후속으로 추가할 workflow`를 함께 설명한다.

### 4-0. workflow 파일 구성

현재 구현

- `.github/workflows/ci.yml`

후속 추가 예정

- `.github/workflows/vercel-preview.yml`
- `.github/workflows/vercel-production.yml`

### 4-1. CI

트리거

- `pull_request`
- `main` branch `push`

기본 작업

- `npm ci`
- `npm run test`
- `npm run lint`
- `npm run build`

### 4-2. Preview 배포

아래 workflow는 아직 저장소에 추가되지 않았고, backend/API와 Vercel 환경이 준비된 뒤 도입한다.

트리거

- `main`이 아닌 branch `push`

기본 흐름

```bash
vercel pull --yes --environment=preview --token=$VERCEL_TOKEN
vercel build --token=$VERCEL_TOKEN
vercel deploy --prebuilt --token=$VERCEL_TOKEN
```

### 4-3. Production 배포

아래 workflow는 아직 저장소에 추가되지 않았고, preview 검증 체계가 준비된 뒤 도입한다.

트리거

- `main` branch `push`

기본 흐름

```bash
vercel pull --yes --environment=production --token=$VERCEL_TOKEN
vercel build --prod --token=$VERCEL_TOKEN
vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
```

## Phase 5. 배포 전 최종 점검

배포 직전에는 아래를 확인한다.

- [ ] `npm run lint` 통과
- [ ] `npm run build` 통과
- [ ] `npm run test` 통과
- [ ] preview / production 환경변수 등록 완료
- [ ] API 서버 헬스체크 확인
- [ ] 프런트의 핵심 사용자 흐름 점검

핵심 사용자 흐름 예시

- [ ] `/` 서비스 허브 진입
- [ ] `/local-election` 주소 입력 후 데이터 조회
- [ ] `/assembly`에서 의원 조회
- [ ] API 장애 시 사용자 메시지가 적절한지 확인
- [ ] `/api/observability/metrics`가 scrape 가능한지 확인
- [ ] Grafana alert webhook이 `/api/observability/analyzer`로 도달하는지 확인

## Phase 6. Preview 배포 실행

실행 조건

- [ ] API preview 또는 공용 테스트 API가 준비돼 있다.
- [ ] preview 환경변수가 등록돼 있다.
- [ ] non-`main` branch에서 변경 사항이 push 됐다.

실행 후 확인

- [ ] preview URL이 생성됐는가
- [ ] 핵심 페이지가 열리는가
- [ ] API 호출이 실패하지 않는가
- [ ] browser ingest endpoint와 metrics endpoint가 응답하는가
- [ ] 브라우저 콘솔과 Vercel 로그에 치명 오류가 없는가

## Phase 7. Production 배포 실행

실행 조건

- [ ] preview 검증 완료
- [ ] EC2 API production 준비 완료
- [ ] production 환경변수 등록 완료
- [ ] production 도메인 정책 확인 완료

실행 후 확인

- [ ] production URL 접속 가능
- [ ] 핵심 사용자 흐름 정상 동작
- [ ] 주요 에러 로그 없음
- [ ] Loki push와 Discord/analyzer webhook이 기대대로 연결되는가
- [ ] API 응답 시간과 사용자 체감이 허용 범위인지 확인

## Phase 8. 운영 중 체크 사항

- [ ] 새로운 프런트 API 경로가 생기면 EC2 API 이관 원칙과 충돌하지 않는지 확인한다.
- [ ] 환경변수가 바뀌면 Vercel Preview / Production을 함께 갱신한다.
- [ ] Node 버전 정책이 바뀌면 로컬, CI, Vercel 설정을 함께 맞춘다.
- [ ] deploy 실패 원인을 `코드`, `환경변수`, `Vercel 설정`, `EC2 API` 중 어디에서 찾을지 분리해 본다.

## 알려진 제약

- `Vercel Hobby`에서는 Git-connected 협업 제약이 남는다.
- 외부 fork PR에서는 secrets 기반 deploy가 불가능하다.
- API 서버가 준비되지 않으면 production cutover를 진행할 수 없다.
- 현재 프런트 저장소에는 DB 직접 접근 경로가 남아 있으므로, 장기적으로는 API 서버 쪽으로 옮겨야 한다.

## 추후 보강할 항목

배포 작업이 실제로 시작되면 아래 내용을 이 문서에 계속 보강한다.

- 실제 workflow 파일명과 위치
- 실제 Vercel 프로젝트명
- preview / production 도메인 정보
- 배포 중 자주 발생한 오류와 대응 방법
- 롤백 절차
