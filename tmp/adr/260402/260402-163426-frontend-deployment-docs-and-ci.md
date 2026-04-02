# 작업 기록: 프런트 배포 문서 정리 및 최소 CI 도입

## 배경

- 팀 내부에서 `public repo + Vercel Hobby + EC2 + RDS` 방향의 배포 의사결정을 공유할 문서가 필요했다.
- 초기에는 검토 문서, 문서 재배치 기록, CI workflow 추가 기록이 각각 별도 ADR로 나뉘어 있었다.
- 이후 팀이 지속적으로 참고할 문서는 `의사결정 문서`와 `실행 runbook`으로 분리하고, 작업 기록은 하나의 ADR로 통합하는 편이 더 적절하다고 판단했다.
- backend server와 Vercel CD가 아직 준비되지 않았으므로, 실제 deploy workflow 대신 안전하게 넣을 수 있는 최소 CI만 먼저 도입하기로 했다.

## 변경 사항

- 배포 배경과 선택 이유를 정리한 정본 문서를 `docs/common/canonical/frontend-deployment-decision.md`에 배치했다.
- 실제 배포 시 담당자가 따라갈 실행 문서를 `docs/common/runbooks/vercel-deployment-runbook.md`로 분리했다.
- `README.md`의 작업 문서 진입 섹션에 배포 의사결정 문서와 runbook 링크를 추가했다.
- `.github/workflows/ci.yml`을 추가했다.
- CI는 `pull_request`와 `main` branch `push`에서만 실행되도록 제한했다.
- CI는 `Node.js 24 LTS`를 기준으로 `npm ci`, `npm run lint`, `npm run build`만 수행하도록 구성했다.
- CI 시작 단계에서 실제 `Node.js`와 `npm` 버전을 출력하고, major version이 `24`가 아니면 실패하도록 version check step을 넣었다.
- 기존 `tmp/adr/260402` 아래에 나뉘어 있던 세 개의 작업 기록을 이 문서로 통합했다.
- code review 지적을 반영해 runbook에서 현재 구현된 workflow와 후속 예정 workflow를 분리하고, CI trigger 설명을 실제 `ci.yml` 기준으로 수정했다.

## 비채택안

- 기존 날짜 기반 검토 문서를 계속 `docs/common/specs` 아래에 두는 안
  - 지속 운영 문서로 보기에는 파일명과 위치가 불안정했다.
- 의사결정 문서와 실행 문서를 하나의 파일로 유지하는 안
  - 배경 설명과 실제 절차의 변경 주기가 달라 분리하는 편이 맞다고 봤다.
- preview / production deploy workflow까지 함께 추가하는 안
  - backend/API 준비 전에는 실패 가능성이 높아 제외했다.
- 모든 branch `push`에서 CI를 돌리는 안
  - 현재 단계에서는 운영 노이즈를 줄이기 위해 채택하지 않았다.
- `Node.js 22`를 사용하는 안
  - 2026-04-02 기준 `24`가 Active LTS이므로 기본값으로 채택하지 않았다.

## 검증

- `AGENTS.md`, `docs/common/canonical/llm-entry-common.md`, `docs/common/canonical/llm-workflow-harness.md`를 다시 확인해 공통 문서 경계를 맞췄다.
- `docs/common/codex/workflows/documentation-review-guide.md` 기준으로 문서 위치와 링크 진입성을 점검했다.
- `README.md`에 새 정본 문서 진입 링크를 추가해 발견 가능성을 보강했다.
- `npx -y actionlint .github/workflows/ci.yml`
  - 성공
- `npx -y -p node@24 -p npm@11 npm ci`
  - 성공
- `NODE24=$(npx -y -p node@24 -c 'which node') && "$NODE24" node_modules/eslint/bin/eslint.js .`
  - 성공
  - 경고 1건: `src/app/components/CandidateCards.tsx`의 `@next/next/no-img-element`
- `NODE24=$(npx -y -p node@24 -c 'which node') && "$NODE24" node_modules/next/dist/bin/next build`
  - 성공
- `docs/common/runbooks/vercel-deployment-runbook.md`
  - 현재 구현과 후속 목표가 혼동되지 않는지 수동 검토

## 후속 메모

- 배포 구현이 시작되면 `docs/common/runbooks/vercel-deployment-runbook.md`를 중심으로 실제 workflow 파일명, 롤백 절차, 운영 중 오류 대응을 계속 보강해야 한다.
- 의사결정 변경이 생기면 `docs/common/canonical/frontend-deployment-decision.md`를 우선 갱신하고, 실행 절차 영향이 있으면 runbook도 함께 갱신한다.
- 현재 로컬 기본 Node는 `18.20.8`이므로, 팀 개발 환경도 추후 `20.9+` 이상으로 맞출 필요가 있다.
- deploy workflow는 API 서버와 Vercel 환경변수가 준비된 뒤 별도로 추가하는 편이 맞다.
