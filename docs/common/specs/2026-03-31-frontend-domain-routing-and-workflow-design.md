# 프론트엔드 도메인 라우팅 분리 및 작업 워크플로 설계

- 문서 유형: `specs`
- 소유 도메인: `common`
- 상태: `superseded`
- 관련 이슈: `없음`
- 관련 PR: `없음`
- 정본 여부: `아니오`
- 최종 갱신일: `2026-04-11`
- 대체 문서: `docs/common/canonical/agent-control-plane-v2-cutover-map.md`

> 이 문서는 과거 v1-lite 도입 설계 기록이다. 현재 작업 진입과 workflow 기준은 `AGENTS.md`, `.agents/README.md`, `.agents/workflows/*.md`, `.agents/contracts/common.yaml`을 따른다.

## 목적

- `woogook-frontend` 안에서 국회 도메인과 지방선거 도메인의 작업 표면을 명확히 분리한다.
- 국회팀 신규 참여자가 바로 따라올 수 있는 온보딩 문서와 작업 워크플로를 `woogook-frontend/docs` 안에 정착시킨다.
- 백엔드 저장소의 `AGENTS.md` 중심 workflow를 참고해, 프론트 저장소도 `AGENTS -> 도메인 진입 문서 -> workflow/guides -> GitHub Issue/PR helper` 흐름으로 운영한다.

## 배경

현재 `woogook-frontend`는 다음 특성을 가진다.

- 실제 사용자 기능은 지방선거 중심으로 구현돼 있다.
- 국회 서비스는 `src/app/page.tsx` 안의 탭과 준비 중 섹션 수준에 머물러 있다.
- 서비스 선택, 화면 상태, 안내 문구가 단일 페이지에 섞여 있어 도메인 경계가 약하다.
- 루트 `AGENTS.md`는 로컬 운영 메모 성격은 있으나, 도메인별 문서 진입과 GitHub workflow를 라우팅하는 구조는 아니다.
- `docs/` 디렉터리가 없어 정책, 원칙, 실무 기준이 코드와 함께 축적되지 못하고 있다.

이 상태에서 국회 전담 팀원이 합류하면, 같은 리포지토리 안에서 작업하더라도 어느 URL, 어느 파일, 어느 문서를 기준으로 작업해야 하는지 빠르게 판단하기 어렵다. 이번 설계의 목표는 리포지토리를 분리하지 않고도 URL, 문서, 작업 워크플로를 도메인 단위로 분리하는 것이다.

## 설계 요약

이번 설계는 아래 네 가지 결정을 함께 채택한다.

1. 서비스 진입 URL을 `/assembly`, `/local-election`로 완전히 분리한다.
2. `woogook-frontend/docs`를 정책, 원칙, 실무 기준의 정본 저장소로 사용하고 `woogook-docs`는 수정하지 않는다.
3. 루트 `AGENTS.md`는 라우터 역할만 맡기고, 실제 규칙은 `docs/common`, `docs/assembly`, `docs/local-election` 아래 문서로 위임한다.
4. GitHub 작업은 `Issue -> work-log -> PR` 흐름을 표준화하고, 상태 변경은 `gh` 또는 `gh api`를 기본 경로로 사용한다.

## 상세 설계

### 1. 라우팅 및 진입 구조

프론트엔드의 서비스 진입점은 아래처럼 나눈다.

- `/`
  - 서비스 선택 허브 페이지로 사용한다.
  - 국회와 지방선거 중 어느 서비스로 들어갈지 안내만 담당한다.
  - 특정 서비스 로직이나 도메인 상태를 직접 담지 않는다.
- `/assembly`
  - 국회 서비스 전용 진입점이다.
  - 국회팀의 기본 작업 표면은 이 라우트와 그 하위 경로로 한정한다.
- `/local-election`
  - 현재 지방선거 메인 화면과 흐름을 이 경로로 이동한다.
  - 기존 지방선거 기능의 기준 URL로 사용한다.

공용 레이아웃과 메타데이터 정책은 다음처럼 유지한다.

- `src/app/layout.tsx`
  - 공통 폰트, `Providers`, 전역 스타일만 유지한다.
  - 특정 도메인 이름이나 선거 종류를 title/description에 직접 박아 넣지 않는다.
- `src/app/page.tsx`
  - 서비스 허브 전용 페이지로 축소한다.
  - 기존 지방선거 상태머신과 국회 준비 중 UI는 제거한다.
- `src/app/assembly/page.tsx`
  - 국회 전용 엔트리 페이지를 담당한다.
- `src/app/local-election/page.tsx`
  - 지방선거 전용 엔트리 페이지를 담당한다.

이 구조의 핵심은 "같은 저장소, 다른 URL, 다른 작업 표면"이다. 국회팀이 신규 기능을 추가할 때 지방선거 메인 상태머신을 직접 건드리지 않아도 되고, 지방선거팀도 반대로 독립된 흐름을 유지할 수 있다.

### 2. 코드 및 파일 경계

라우팅 분리만으로는 작업 충돌을 줄이기 어렵기 때문에, 파일 책임도 함께 분리한다. 초기 정리 목표는 아래와 같다.

- `src/app/assembly/**`
  - 국회 라우트 엔트리와 국회 라우트 전용 레이아웃을 둔다.
- `src/app/local-election/**`
  - 지방선거 엔트리와 기존 지방선거 페이지 흐름을 둔다.
- `src/features/assembly/**`
  - 국회 도메인 전용 컴포넌트, 화면 조합, fetch helper를 둔다.
- `src/features/local-election/**`
  - 기존 `src/app/components`에 흩어진 지방선거 전용 컴포넌트를 점진적으로 이동한다.
- `src/components/ui/**`
  - shadcn/ui 기반 공용 UI만 유지한다.
- `src/lib/**`
  - 도메인 중립 유틸리티, schema, 공통 API helper만 유지한다.

파일 소유권 원칙은 아래를 따른다.

- 국회팀은 원칙적으로 `src/app/assembly/**`, `src/features/assembly/**`, `docs/assembly/**`를 우선 수정한다.
- 지방선거팀은 `src/app/local-election/**`, `src/features/local-election/**`, `docs/local-election/**`를 우선 수정한다.
- `src/components/ui/**`, `src/lib/**`, `docs/common/**` 같은 공용 경로는 공통 변경으로 간주하며, 변경 이유와 영향 범위를 문서와 PR에 명시한다.

### 3. 문서 taxonomy

프론트 저장소 안의 문서 정본 경로는 아래처럼 잡는다.

- `docs/common/`
  - 공통 정책, 공통 workflow, 공통 guide, 공통 spec을 둔다.
- `docs/assembly/`
  - 국회팀 전용 진입 문서, 온보딩, 작업 범위, 도메인 규칙을 둔다.
- `docs/local-election/`
  - 지방선거팀 전용 진입 문서와 실무 기준을 둔다.

초기 생성 대상은 아래를 기준으로 한다.

- `docs/common/canonical/llm-entry-common.md`
- `docs/common/canonical/llm-workflow-harness.md`
- `docs/common/codex/policies/documentation-policy.md`
- `docs/common/codex/workflows/issue-writing-guide.md`
- `docs/common/codex/workflows/development-execution-guide.md`
- `docs/common/codex/workflows/documentation-review-guide.md`
- `docs/common/codex/workflows/work-completion-guide.md`
- `docs/common/codex/guides/git-commit-guide.md`
- `docs/common/codex/guides/github-pr-and-merge-guide.md`
- `docs/common/codex/guides/local-hook-and-ci-enforcement-guide.md`
- `docs/assembly/canonical/llm-entry.md`
- `docs/assembly/onboarding/assembly-team-onboarding.md`
- `docs/assembly/workflows/assembly-development-scope.md`
- `docs/local-election/canonical/llm-entry.md`

이 taxonomy는 백엔드 저장소의 `docs/common/...` 구조를 참고하지만, 프론트 저장소 상태에 맞는 경로와 검증 기준으로 다시 작성한다.

### 4. `AGENTS.md` 라우팅 원칙

루트 `AGENTS.md`는 더 이상 장문의 로컬 운영 메모가 아니라, 아래 질문에 답하는 라우터 역할을 맡는다.

1. 지금 요청이 `일반 응답`인가, `프로젝트 실행`인가
2. `프로젝트 실행`이면 소유 도메인이 `assembly`, `local-election`, `common` 중 무엇인가
3. 어느 `llm-entry` 문서를 먼저 읽어야 하는가
4. 어느 workflow 문서를 다음으로 읽어야 하는가

루트 문서에는 안정적인 라우팅 규칙만 둔다.

- 문서/설명/커밋/PR은 한글 우선 원칙을 따른다.
- 용어와 표기는 `glossary.md`를 따른다.
- GitHub 상태 변경은 connector 쓰기 권한을 전제하지 않고 `gh` 또는 `gh api`를 기본 경로로 본다.
- 실제 구현 규칙과 검증 절차는 `docs/common/...` 및 도메인 문서로 위임한다.

국회 신규 팀원의 기본 읽기 순서는 아래처럼 고정한다.

1. `AGENTS.md`
2. `docs/assembly/canonical/llm-entry.md`
3. `docs/assembly/onboarding/assembly-team-onboarding.md`
4. 현재 작업 단계에 맞는 `docs/common/codex/workflows/*.md`
5. 필요한 경우 `docs/common/codex/guides/*.md`

### 5. GitHub Issue, work-log, PR workflow

프론트 저장소도 백엔드와 동일하게 `Issue -> work-log -> PR` 흐름을 채택한다.

기본 원칙은 아래와 같다.

- 자연어 요청이 모두 GitHub Issue 생성으로 이어지지는 않는다.
- `프로젝트 실행`으로 분류된 경우에만 GitHub workflow를 시작한다.
- 기존 open Issue가 같은 목표와 범위를 가진다면 재사용을 우선한다.
- work-log는 기준 Issue에 댓글로 남긴다.
- PR 본문은 템플릿에 맞게 생성하고, 검증 결과와 문서 영향 범위를 포함한다.

GitHub 상태 변경 기본 경로는 아래를 따른다.

- 조회와 검색
  - connector 또는 `gh issue list`, `gh pr list`, `gh search prs`
- 상태 변경
  - `gh issue create`
  - `gh issue edit`
  - `gh pr create`
  - 필요 시 `gh api`

스크립트 자동화는 경량 이식 버전으로 시작한다.

- `scripts/llm_workflow_sync.py`
  - open Issue 탐색
  - Issue 본문 upsert
  - work-log 댓글 생성/갱신
- `scripts/prepare_pr.py`
  - PR 본문 초안 생성
  - 문서 영향 범위 요약
  - 검증 명령 결과 정리
- `scripts/validate_llm_workflow.py`
  - 로컬 preflight
  - 필수 section과 검증 결과 누락 여부 확인

초기 운영 metadata는 경량으로 시작한다.

- 소유 도메인
- 범위 / 비범위
- 검증 명령
- 문서 영향
- 관련 경로
- 남은 위험

백엔드의 `operating_mode`, `semantic quality gate`, `specialist_roles`는 향후 확장 가능 항목으로 두되, 프론트 1차 도입 범위의 필수 조건으로 강제하지 않는다. 프론트 저장소가 새 workflow에 적응한 뒤 필요하면 phase 2로 확장한다.

### 6. 국회팀 온보딩 문서 범위

국회팀 온보딩 문서는 README 대체 문서가 아니라, 신규 참여자가 첫날 따라야 하는 실제 작업 규칙 문서여야 한다. 아래 항목을 포함한다.

- 국회 도메인의 목표와 현재 범위
- 수정 가능한 기본 경로와 공용 경로 구분
- `/assembly` 라우트 기준 화면 구조
- 새 컴포넌트, API route, 문서를 추가하는 위치
- `src/components/ui`, `src/lib` 같은 공용 경로를 건드릴 때 기록해야 할 영향 범위
- 기본 검증 명령
- 작업 시작 전 읽어야 할 문서
- PR 전 체크리스트

이 온보딩 문서는 국회팀원이 루트 `AGENTS.md`를 읽은 뒤 곧바로 보는 첫 실무 문서가 된다.

### 7. 검증 기준

검증 기준은 변경 유형에 따라 다르게 적용한다.

- 문서만 수정한 경우
  - 링크 경로, 명령 예시, 문서 taxonomy, 용어 일관성을 수동 검토한다.
- 라우팅, 메타데이터, 전역 레이아웃, API route, 타입, 빌드 결과에 영향을 주는 경우
  - `npm run lint`
  - `npm run build`
- helper script나 GitHub workflow 검증 로직을 추가하는 경우
  - 해당 스크립트의 샘플 실행 예시 또는 dry-run 결과를 문서와 함께 남긴다.

루트 `AGENTS.md`와 `docs/common/codex/guides/local-hook-and-ci-enforcement-guide.md`에는 위 기준을 명시해, 국회팀과 지방선거팀이 같은 검증 규칙을 공유하도록 한다.

### 8. 적용 순서

실제 적용은 아래 순서를 따른다.

1. `docs/` taxonomy와 진입 문서를 먼저 만든다.
2. 루트 `AGENTS.md`를 라우터 구조로 개편한다.
3. `/`, `/assembly`, `/local-election` 라우트를 분리한다.
4. 지방선거 전용 로직을 `src/features/local-election/**`로 점진 이동한다.
5. 국회 온보딩 문서와 도메인 작업 문서를 연결한다.
6. GitHub workflow helper와 템플릿 연결을 추가한다.

이 순서를 택하는 이유는, 코드 구조 변경보다 먼저 작업 규칙과 문서 진입점을 고정해야 신규 팀원이 같은 기준으로 움직일 수 있기 때문이다.

## 비채택안과 이유

### 1. 단일 `/` 페이지 안에서 탭만 유지하는 안

- 검토 내용
  - 현재 `src/app/page.tsx` 구조를 유지하면서 탭 UI만 개선하는 방식
- 채택하지 않은 이유
  - URL과 작업 범위가 분리되지 않아 국회팀과 지방선거팀이 같은 파일을 자주 수정하게 된다.
  - 온보딩 문서를 써도 실제 코드 경계와 맞지 않아 문서 효용이 낮다.

### 2. 국회 프론트를 별도 저장소로 즉시 분리하는 안

- 검토 내용
  - 국회 전용 프론트를 새 리포지토리로 분리해 독립 개발하는 방식
- 채택하지 않은 이유
  - 현재 사용자 요구는 같은 리포 안에서 라우트만 분리하는 것이다.
  - 공용 UI, 공통 schema, 공통 API helper가 있는 상태에서 저장소를 먼저 나누면 중복 관리 비용이 커진다.

### 3. GitHub workflow 없이 문서만 추가하는 안

- 검토 내용
  - `AGENTS.md`와 온보딩 문서만 정리하고, Issue/PR 운영은 기존 수동 방식에 맡기는 방식
- 채택하지 않은 이유
  - 신규 팀원이 늘어날수록 작업 기준 Issue, 검증 기록, 문서 영향 범위가 흩어질 가능성이 높다.
  - 백엔드 저장소와 운영 방식이 달라져 크로스팀 협업 비용이 올라간다.

## 리스크와 대응

### 1. 초기 문서량 증가

- 리스크
  - 도입 초기에 문서가 많아 보여 진입 장벽이 생길 수 있다.
- 대응
  - 루트 `AGENTS.md`는 라우터로만 유지하고, 도메인별 `llm-entry`가 필요한 문서만 단계적으로 읽게 만든다.

### 2. 라우트 분리 과정에서 기존 지방선거 화면 회귀

- 리스크
  - 기존 `src/app/page.tsx` 상태머신을 옮기는 과정에서 레이아웃 또는 내비게이션 회귀가 생길 수 있다.
- 대응
  - `/local-election` 이동 후 `npm run lint`, `npm run build`를 기본 검증으로 묶고, 허브 `/`는 가능한 한 얇게 유지한다.

### 3. workflow 자동화 과투자

- 리스크
  - 백엔드 수준의 운영값과 validator를 한 번에 모두 이식하면 프론트 팀이 workflow 자체에 막힐 수 있다.
- 대응
  - 1차는 경량 metadata와 필수 검증 위주로 시작하고, 실제 사용성을 본 뒤 확장한다.

## 후속 작업

- 루트 `AGENTS.md` 라우터 개편
- `docs/common`, `docs/assembly`, `docs/local-election` 초기 문서 생성
- `/`, `/assembly`, `/local-election` 라우팅 분기 구현
- 지방선거 컴포넌트의 도메인 경로 정리
- GitHub workflow helper 스크립트 초안 이식
