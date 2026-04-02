# 프론트엔드 배포 의사결정: public repo + Vercel Hobby + EC2 + RDS

- 문서 유형: `canonical`
- 소유 도메인: `common`
- 상태: `active`
- 관련 이슈: `없음`
- 관련 PR: `없음`
- 정본 여부: `예`
- 최종 갱신일: `2026-04-02`

## 목적

- 프런트 배포 구조에 대한 현재 팀 합의와 그 배경을 한 곳에 정리한다.
- 왜 `public repo + Vercel Hobby + EC2 + RDS` 조합을 선택했는지 설명한다.
- 배포가 완료될 때까지 팀원이 반복해서 참고할 수 있는 정본 문서로 유지한다.

## 이 문서의 역할

이 문서는 `왜 이 결정을 했는가`를 설명하는 문서다.

- 배포 배경
- 제약 조건
- 선택한 구조
- 선택 이유
- 남은 리스크와 합의 사항

실제 배포를 수행할 때 따라가는 절차 문서는 아래 runbook에서 관리한다.

- `docs/common/runbooks/vercel-deployment-runbook.md`

## 배경

현재 팀은 아래 조건 안에서 배포 방안을 검토하고 있다.

- 프런트엔드는 `woogook-frontend` 저장소에서 관리한다.
- API 서버는 별도 GitHub 저장소로 관리하고, AWS EC2에서 운영할 예정이다.
- DB는 AWS RDS를 사용할 예정이다.
- 학교 프로젝트 특성상 AWS 사용 범위는 제한적이며, 외부 서비스 사용은 가능하다.
- 프런트 저장소는 현재 GitHub organization 아래에 있으며, 원래는 private repository였다.
- 팀은 비용을 낮추기 위해 `Vercel Hobby` 사용을 우선 검토하고 있다.

## 현재 합의 요약

현재 기준의 합의안은 아래와 같다.

- 프런트 저장소는 `public repo`로 전환한다.
- 프런트는 `Vercel Hobby`에 배포한다.
- API 서버는 별도 저장소에서 개발하고 `EC2`에 배포한다.
- DB는 `RDS`를 사용한다.
- 프런트는 장기적으로 `UI + 얇은 프록시`만 맡고, 비즈니스 API와 DB 접근은 EC2 API 서버로 모은다.
- 팀 배포 기본 경로는 `Vercel Git integration`이 아니라 `GitHub Actions + Vercel CLI`로 잡는다.

## 현재 코드 기준 확인 사항

현재 프런트 저장소는 정적 파일만 배포하는 구조가 아니다.

- `Next.js 16`과 `React 19`를 사용한다.
- `next start` 기반의 서버 실행을 전제로 한다.
- 일부 `route.ts`는 `runtime = "nodejs"`로 동작한다.
- 일부 API route는 프런트 저장소 안에서 Postgres를 직접 조회한다.
- 일부 API route는 별도 백엔드로 프록시한다.
- 클라이언트는 대부분 same-origin `/api/*` 호출을 전제로 작성돼 있다.

핵심적으로 확인된 경로는 아래와 같다.

- DB 직접 접근: `src/lib/db.ts`
- 지방선거 투표지 조회: `src/app/api/ballots/route.ts`
- 지역 목록 조회: `src/app/api/regions/cities/route.ts`
- 구/군 조회: `src/app/api/regions/sigungu/route.ts`
- 읍/면/동 조회: `src/app/api/regions/emd/route.ts`
- 백엔드 프록시 공용 코드: `src/app/api/local-election/v1/chat/_shared.ts`
- same-origin API 호출: `src/lib/api-client.ts`

이 구조 때문에 현재 시점의 프런트는 "정적 사이트"가 아니라 "서버 기능을 일부 포함한 Next.js 앱"으로 봐야 한다.

## 선택한 구조

현재 코드와 팀 제약을 같이 놓고 보면, 목표 구조는 아래처럼 잡는 것이 가장 현실적이다.

- 프런트 배포: `Vercel`
- API 배포: `EC2`
- DB: `RDS`
- 프런트 역할: `UI + 얇은 프록시`
- 실제 비즈니스 API와 DB 접근: `EC2 API 서버`

즉, 장기적으로는 프런트가 DB를 직접 읽지 않고 `EC2 API`만 바라보는 구조로 정리해야 한다.

## 왜 이 구조를 선택했는가

### 1. 프런트 운영 부담이 낮다

Vercel은 Next.js 프런트 배포 경험이 가장 단순하다. 학교 프로젝트에서 프런트용 EC2를 별도로 운영하는 것보다, 프런트는 관리형 서비스에 두는 편이 운영 난도가 낮다.

### 2. API와 DB 책임을 명확히 분리할 수 있다

지금 프런트 저장소 안에는 DB를 직접 읽는 route가 남아 있지만, 운영 안정성을 생각하면 DB 접근은 API 서버 쪽으로 일원화하는 것이 맞다. 이 경계가 정리되면 프런트와 API의 장애 범위도 분리된다.

### 3. Vercel Hobby에서도 최소한의 CI/CD는 가능하다

Vercel의 Git integration 제약은 있지만, `GitHub Actions + Vercel CLI`를 쓰면 preview / production 배포를 자동화할 수 있다. 따라서 `Pro` 없이도 운영 가능한 경로는 존재한다.

## 왜 public repo 전환을 같이 결정했는가

`Vercel Hobby`에서 가장 큰 제약은 GitHub organization의 private repository를 Git integration으로 바로 연결할 수 없다는 점이다.

팀은 비용을 낮게 유지하면서도, 아래 목표를 함께 달성하고 싶었다.

- Vercel 프로젝트를 팀이 이해하기 쉬운 형태로 운용하기
- Preview / Production 개념을 명확히 나누기
- 추후 필요하면 Vercel 쪽 Git 연동 옵션도 열어두기
- 배포 관련 문서와 운영 맥락을 팀이 직관적으로 공유하기

엄밀히 말하면 `GitHub Actions + Vercel CLI`만 쓸 경우 public repo 전환이 절대 필수는 아니다. Vercel 공식 문서도 CLI 빌드/배포 경로를 별도로 제공한다. 다만 이번 프로젝트에서는 아래 이유로 public repo 전환을 같이 채택하는 편이 더 단순하다고 판단했다.

- Hobby 플랜 제약을 팀이 문서와 운영 방식으로 이해하기 쉽다.
- 공개 저장소 기준으로 GitHub Actions 사용료 부담이 낮다.
- 향후 Vercel 프로젝트 연결이나 Preview 확인 흐름이 더 단순해진다.
- 학교 프로젝트 특성상 외부 공개에 대한 수용 가능성이 있다고 판단했다.

## Vercel Hobby 제약 정리

### 1. private organization private repo는 Git integration으로 배포할 수 없다

`Vercel Hobby`에서는 GitHub organization의 private repository를 Git integration으로 연결해 배포할 수 없다.

### 2. repository를 public으로 전환하면 연결 자체는 가능하다

repository가 `organization 소유 public repo`라면 Vercel 연결 자체는 가능하다.

### 3. 하지만 Git-connected Hobby 배포는 협업 제약이 남는다

Vercel 공식 문서 기준으로 Hobby 팀의 Git-connected 프로젝트는 커밋 작성자 제약이 남는다. 실무적으로는 "owner 중심 배포"에 가깝고, 팀 전체가 Git integration만으로 자연스럽게 preview와 production을 돌리는 구조로 보기 어렵다.

따라서 저장소를 public으로 바꾸더라도, 팀 기본 배포 전략은 아래처럼 두는 편이 안전하다.

- Git integration: 보조 수단
- GitHub Actions + Vercel CLI: 주 배포 경로

## GitHub Actions CI/CD는 가능한가

결론부터 말하면 `public repo + Vercel Hobby + GitHub Actions` 조합은 가능하다.

다만 가능한 범위와 불가능한 범위를 구분해야 한다.

### 가능한 것

- `pull_request`에서 `lint`와 `build`를 수행하는 일반 CI
- `main`이 아닌 브랜치 push 시 preview 배포
- `main` merge 후 production 배포
- Vercel 환경변수를 이용한 preview / production 환경 분리

### 제한이 있는 것

- 외부 fork PR에서 secrets를 사용하는 preview deploy
- Dependabot 이벤트에서 secrets를 사용하는 deploy
- Vercel Git integration만으로 팀 전체 협업 배포를 안정적으로 운영하는 방식

GitHub 공식 문서 기준으로 fork에서 들어온 PR에는 `GITHUB_TOKEN`을 제외한 secrets가 전달되지 않는다. 따라서 `VERCEL_TOKEN` 기반 배포는 fork PR에서 기본적으로 불가능하다고 봐야 한다.

이 제약을 고려하면 팀 운영 정책은 아래처럼 정리하는 것이 적절하다.

- `pull_request`: CI만 수행
- `push` to non-`main`: preview deploy
- `push` to `main`: production deploy
- 팀 작업은 가능하면 본 저장소 내부 branch 기반으로 진행

## 현재 시점에서 중요한 운영 판단

### 1. 지금은 production cutover 시점이 아니다

API 서버가 아직 완전히 준비되지 않았으므로, 지금 단계의 목표는 실제 production 배포가 아니라 배포 구조와 선결 조건을 정리하는 것이다.

### 2. 프런트의 장기 목표 상태는 DB 직접 접근 제거다

지금 프런트에는 DB 직접 접근 route가 남아 있다. 운영 경계를 명확히 하려면 이 부분은 EC2 API 서버로 옮겨야 한다.

### 3. Node 버전 통일이 선행돼야 한다

현재 로컬 확인 기준, 이 저장소는 `Node.js 18` 환경에서 `npm run build`가 실패했다. Next.js 16은 `Node.js 20.9+`를 요구하므로, 로컬 개발 환경과 GitHub Actions runner, Vercel 빌드 환경의 Node 버전을 함께 맞춰야 한다.

## 팀이 계속 확인해야 할 합의 항목

### 필수 확인 항목

- repository를 public으로 전환할지 여부
- `Vercel Hobby`를 유지할지 여부
- Vercel 프로젝트 owner를 누구로 둘지
- 팀 작업을 같은 저장소의 branch 중심으로 할지 여부
- fork PR preview는 포기하고 CI만 유지할지 여부
- 프런트가 DB 직접 접근을 제거하고 API만 호출하는 구조로 갈지 여부

### 아직 보류 가능한 항목

- production 도메인 연결 시점
- DNS cutover 시점
- GitHub Actions 자동배포 실제 적용 시점
- preview URL을 팀 외부까지 공개할지 여부

## API 준비 후 다음 단계

API 서버가 준비되면 아래 순서로 움직이는 것이 좋다.

1. EC2 API에서 프런트가 기대하는 엔드포인트 계약을 확정한다.
2. 프런트의 DB 직접 조회 route를 EC2 API 프록시로 교체한다.
3. Node 버전을 `20.9+`로 통일한다.
4. Vercel 프로젝트를 만들고 preview / production 환경변수를 설정한다.
5. GitHub Actions에 `CI`, `Preview CD`, `Production CD` workflow를 추가한다.
6. preview 환경에서 기능 검증을 마친 뒤 production cutover를 진행한다.

실행 절차의 상세 단계는 runbook에서 계속 갱신한다.

## 현재 저장소 기준으로 영향이 큰 경로

향후 수정 또는 정리 대상은 아래와 같다.

- `src/lib/db.ts`
- `src/app/api/ballots/route.ts`
- `src/app/api/regions/cities/route.ts`
- `src/app/api/regions/sigungu/route.ts`
- `src/app/api/regions/emd/route.ts`
- `src/app/api/assembly/v1/members/route.ts`
- `src/app/api/local-election/v1/chat/_shared.ts`
- `src/lib/api-client.ts`
- `package.json`

## 팀 공유용 요약

현재 `woogook-frontend`는 정적 사이트가 아니라 서버 기능을 일부 포함한 Next.js 앱이다. 팀 제약을 고려하면 목표 배포 구조는 `Vercel(Hobby) + EC2 API + RDS`가 가장 현실적이다. 다만 `Vercel Hobby`는 GitHub organization private repo를 Git integration으로 바로 연결할 수 없고, repository를 public으로 바꾸더라도 Hobby의 Git-connected 협업 제약이 남는다. 따라서 팀 기본 배포 전략은 `GitHub Actions + Vercel CLI`로 잡는 것이 맞다.

또한 이번 public repo 전환은 단순히 "Vercel에 연결하기 위해서만" 내린 결정은 아니다. 비용 제약, 팀 운영 단순성, 공개 저장소 기준 GitHub Actions 활용성, 향후 배포 흐름의 일관성을 함께 고려한 결과다. API 서버가 아직 준비되지 않았으므로, 지금은 production 배포를 서두르기보다 "프런트가 DB를 직접 읽지 않고 EC2 API만 호출하는 구조"를 목표 상태로 먼저 합의해야 한다.

## 참고 자료

- [Vercel Git Deployments](https://vercel.com/docs/git)
- [Vercel: How can I use GitHub Actions with Vercel?](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)
- [Vercel: Deploying a project from the CLI](https://vercel.com/docs/projects/deploy-from-cli)
- [Vercel: Troubleshoot project collaboration](https://vercel.com/docs/deployments/troubleshoot-project-collaboration)
- [GitHub Docs: Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [GitHub Docs: Billing and usage](https://docs.github.com/en/actions/concepts/billing-and-usage)
- [Next.js 16](https://nextjs.org/blog/next-16)
