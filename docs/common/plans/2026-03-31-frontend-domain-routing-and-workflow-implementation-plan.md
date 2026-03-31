# Frontend Domain Routing And Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `woogook-frontend`에 국회/지방선거 도메인 라우팅 분리, 도메인 문서 진입 구조, GitHub Issue/PR workflow 기준을 한 번에 도입한다.

**Architecture:** 루트 `AGENTS.md`는 라우터로 축소하고, 실제 운영 규칙은 `docs/common`, `docs/assembly`, `docs/local-election` 아래로 위임한다. 화면은 `/`, `/assembly`, `/local-election`로 나누고, 기존 지방선거 상태머신은 `src/features/local-election`으로 이동해 도메인 경계를 분명히 한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zod, GitHub CLI(`gh`), Python 3 standard library helper scripts

---

### Task 1: 문서 taxonomy와 루트 라우터 정리

**Files:**
- Create: `docs/common/canonical/llm-entry-common.md`
- Create: `docs/common/canonical/llm-workflow-harness.md`
- Create: `docs/common/codex/policies/documentation-policy.md`
- Create: `docs/common/codex/workflows/issue-writing-guide.md`
- Create: `docs/common/codex/workflows/development-execution-guide.md`
- Create: `docs/common/codex/workflows/documentation-review-guide.md`
- Create: `docs/common/codex/workflows/work-completion-guide.md`
- Create: `docs/common/codex/guides/git-commit-guide.md`
- Create: `docs/common/codex/guides/github-pr-and-merge-guide.md`
- Create: `docs/common/codex/guides/local-hook-and-ci-enforcement-guide.md`
- Create: `docs/assembly/canonical/llm-entry.md`
- Create: `docs/assembly/onboarding/assembly-team-onboarding.md`
- Create: `docs/assembly/workflows/assembly-development-scope.md`
- Create: `docs/local-election/canonical/llm-entry.md`
- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] **Step 1: 문서 경로와 현재 라우터 상태를 다시 확인한다**

Run:

```bash
find docs -maxdepth 4 -type f | sort
sed -n '1,220p' AGENTS.md
sed -n '1,200p' README.md
```

Expected: 새 문서가 아직 거의 없고, 루트 `AGENTS.md`가 라우터보다 로컬 메모 성격임을 확인한다.

- [ ] **Step 2: 루트 `AGENTS.md`를 라우터 구조로 재작성한다**

```md
# AGENTS.md

이 문서는 `woogook-frontend` 저장소의 공통 라우터다.
모든 Agent는 작업 시작 전에 이 문서를 먼저 읽고, 요청 유형과 소유 도메인에 맞는 진입 문서를 추가로 읽는다.

## 기본 분기

1. 요청을 `일반 응답`과 `프로젝트 실행`으로 구분한다.
2. `프로젝트 실행`이면 소유 도메인을 `assembly`, `local-election`, `common` 중 하나로 정한다.
3. 소유 도메인에 맞는 `docs/*/canonical/llm-entry*.md`를 먼저 읽는다.
4. 현재 단계에 맞는 `docs/common/codex/workflows/*.md`와 `docs/common/codex/guides/*.md`를 읽는다.

## 공통 원칙

- 문서, 커밋, PR 본문은 한글 우선으로 작성한다.
- 용어와 표기는 `glossary.md`를 따른다.
- GitHub 상태 변경은 `gh` 또는 `gh api`를 기본 경로로 사용한다.
- 문서 변경 필요 여부 검토는 생략하지 않는다.
```

- [ ] **Step 3: 공통 canonical 문서를 작성한다**

```md
# 공통 LLM 진입 문서

## 목적
- 공통 workflow와 GitHub helper를 어떤 시점에 읽어야 하는지 정한다.

## 기본 진입 순서
1. `AGENTS.md`
2. 이 문서
3. `프로젝트 실행`이면 `docs/common/canonical/llm-workflow-harness.md`
4. 현재 단계에 맞는 `docs/common/codex/workflows/*.md`
```

```md
# 공통 LLM workflow harness 기준

## 목적
- 프론트 저장소에서 `Issue -> work-log -> PR` 흐름을 일관되게 운영한다.

## 공통 계약
- `프로젝트 실행`일 때만 GitHub workflow를 시작한다.
- 기존 open Issue를 먼저 찾고, 없으면 새 이슈를 만든다.
- 상태 변경은 `gh` 또는 `gh api`로 수행한다.
- PR 전에는 로컬 검증(`npm run lint`, 필요 시 `npm run build`)을 먼저 통과한다.
```

- [ ] **Step 4: 도메인 진입 문서와 국회팀 온보딩 문서를 작성한다**

```md
# 국회 도메인 LLM 진입 문서

## 먼저 읽을 문서
1. `docs/assembly/onboarding/assembly-team-onboarding.md`
2. `docs/assembly/workflows/assembly-development-scope.md`
3. 현재 단계에 맞는 `docs/common/codex/workflows/*.md`
```

```md
# 국회팀 온보딩

## 기본 작업 경로
- `src/app/assembly/**`
- `src/features/assembly/**`
- `docs/assembly/**`

## 공용 경로
- `src/components/ui/**`
- `src/lib/**`
- `docs/common/**`

## 기본 검증
- 문서만 수정: 링크와 경로 수동 검토
- 라우팅/빌드 영향: `npm run lint`, `npm run build`
```

- [ ] **Step 5: 공통 workflow/guides 문서를 프론트 기준으로 작성하고 README를 갱신한다**

```md
# 작업 진행 가이드

## 시작 전
- 관련 open Issue와 PR이 있는지 먼저 확인한다.
- 도메인 진입 문서를 읽고 수정 가능 경로를 확인한다.

## 구현 중
- 공용 경로를 수정하면 영향 범위를 work-log와 PR 본문에 남긴다.
- 라우팅, 타입, 빌드 결과에 영향이 있으면 `npm run build`까지 실행한다.
```

```md
# 로컬 훅 및 CI 강제 기준

## 필수 검증
- 코드/설정 변경: `npm run lint`
- 라우팅/빌드 영향: `npm run build`
- 문서만 변경: 수동 검토 가능
```

Run:

```bash
sed -n '1,220p' AGENTS.md
find docs/common docs/assembly docs/local-election -maxdepth 4 -type f | sort
```

Expected: 루트 라우터와 기본 taxonomy가 생기고, 국회팀이 읽을 첫 문서 경로가 확정된다.

- [ ] **Step 6: 변경 사항을 확인하고 커밋한다**

Run:

```bash
git status --short
git add AGENTS.md README.md docs
git commit -m "docs: 프론트 도메인 문서 라우터와 온보딩 기준 추가"
```

Expected: 문서 taxonomy와 루트 라우터 변경이 하나의 커밋으로 기록된다.

### Task 2: GitHub workflow 템플릿과 helper script 도입

**Files:**
- Create: `.github/ISSUE_TEMPLATE/llm-workflow.yml`
- Create: `.github/pull_request_template.md`
- Create: `scripts/llm_workflow_sync.py`
- Create: `scripts/prepare_pr.py`
- Create: `scripts/validate_llm_workflow.py`
- Modify: `package.json`
- Modify: `docs/common/codex/workflows/issue-writing-guide.md`
- Modify: `docs/common/codex/workflows/work-completion-guide.md`

- [ ] **Step 1: GitHub 템플릿과 스크립트 디렉터리를 만든다**

Run:

```bash
mkdir -p .github/ISSUE_TEMPLATE scripts
find .github -maxdepth 2 -type f | sort
```

Expected: 기존 workflow 파일은 유지하고, 이슈 템플릿과 helper script를 둘 경로가 준비된다.

- [ ] **Step 2: Issue 템플릿과 PR 템플릿을 추가한다**

```yaml
name: LLM Workflow
description: LLM/Codex 작업 기준 이슈
title: "[common] "
body:
  - type: textarea
    id: background
    attributes:
      label: 배경
  - type: textarea
    id: goal
    attributes:
      label: 목적
  - type: textarea
    id: scope
    attributes:
      label: 범위
  - type: textarea
    id: non_scope
    attributes:
      label: 비범위
  - type: textarea
    id: verification
    attributes:
      label: 검증 계획
```

```md
## 배경

## 목표

## 주요 변경 사항

## 문서 영향

## 검증

## 남은 위험 / 후속 메모
```

- [ ] **Step 3: 표준 라이브러리 기반 helper script를 추가한다**

```python
#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess


def run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True).strip()


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("find-open-issues")
    args = parser.parse_args()
    if args.command == "find-open-issues":
        print(run(["gh", "issue", "list", "--state", "open", "--limit", "20"]))


if __name__ == "__main__":
    main()
```

```python
#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--issue", required=True)
    parser.add_argument("--base", default="main")
    args = parser.parse_args()
    body = f"""## 배경

- 관련 Issue: #{args.issue}

## 목표

- 프론트 도메인 라우팅과 workflow 정리

## 검증

- npm run lint
- npm run build
"""
    Path("tmp").mkdir(exist_ok=True)
    Path("tmp/pr-body.md").write_text(body, encoding="utf-8")
    print("tmp/pr-body.md")


if __name__ == "__main__":
    main()
```

```python
#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
import sys


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("path")
    args = parser.parse_args()
    content = Path(args.path).read_text(encoding="utf-8")
    required = ["## 배경", "## 목표", "## 검증"]
    missing = [section for section in required if section not in content]
    if missing:
        print(f"missing sections: {', '.join(missing)}")
        sys.exit(1)
    print("workflow validation passed")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: `package.json`에 helper 실행용 스크립트를 추가한다**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "workflow:issues": "python3 scripts/llm_workflow_sync.py find-open-issues",
    "workflow:prepare-pr": "python3 scripts/prepare_pr.py --issue 0",
    "workflow:validate-pr": "python3 scripts/validate_llm_workflow.py tmp/pr-body.md"
  }
}
```

- [ ] **Step 5: helper를 dry-run으로 검증한다**

Run:

```bash
python3 scripts/llm_workflow_sync.py find-open-issues
python3 scripts/prepare_pr.py --issue 999
python3 scripts/validate_llm_workflow.py tmp/pr-body.md
```

Expected: open issue 목록이 출력되고, `tmp/pr-body.md`가 생성되며, validator가 통과한다.

- [ ] **Step 6: 문서와 스크립트를 커밋한다**

Run:

```bash
git add .github package.json scripts docs/common/codex/workflows
git commit -m "feat: 프론트 GitHub workflow 템플릿과 helper 추가"
```

Expected: GitHub workflow 운영 자산이 별도 커밋으로 기록된다.

### Task 3: App Router 서비스 분리와 허브 페이지 도입

**Files:**
- Create: `src/app/assembly/page.tsx`
- Create: `src/app/local-election/page.tsx`
- Create: `src/features/assembly/AssemblyLandingPage.tsx`
- Create: `src/features/local-election/LocalElectionPage.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 루트 페이지를 얇은 서비스 허브로 바꾼다**

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm">우리동네 안내 서비스</p>
        <h1 className="text-4xl font-bold">국회와 지방선거 서비스를 분리해 안내합니다.</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link href="/assembly" className="rounded-2xl border p-6">
            국회 서비스로 이동
          </Link>
          <Link href="/local-election" className="rounded-2xl border p-6">
            지방선거 서비스로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: `src/app/layout.tsx`의 메타데이터를 공용 소개로 바꾼다**

```tsx
export const metadata: Metadata = {
  title: "우리동네 안내 서비스",
  description: "국회와 지방선거 정보를 도메인별로 나눠 안내하는 프런트엔드",
};
```

- [ ] **Step 3: 국회 전용 엔트리와 지방선거 전용 엔트리를 추가한다**

```tsx
import { AssemblyLandingPage } from "@/features/assembly/AssemblyLandingPage";

export default function AssemblyPage() {
  return <AssemblyLandingPage />;
}
```

```tsx
import { LocalElectionPage } from "@/features/local-election/LocalElectionPage";

export default function LocalElectionRoute() {
  return <LocalElectionPage />;
}
```

- [ ] **Step 4: 국회 랜딩 컴포넌트를 추가한다**

```tsx
import Link from "next/link";

export function AssemblyLandingPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm">국회 서비스</p>
        <h1 className="text-4xl font-bold">우리동네 국회의원 안내서</h1>
        <p className="mt-4 text-base text-neutral-600">
          지역구·비례대표 의원 정보와 법안/정책 탐색 기능을 이 경로에서 발전시킵니다.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/" className="rounded-full border px-4 py-2">
            서비스 선택으로 돌아가기
          </Link>
          <Link href="/local-election" className="rounded-full border px-4 py-2">
            지방선거 서비스 보기
          </Link>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: lint와 build로 라우트 분리를 검증한다**

Run:

```bash
npm run lint
npm run build
```

Expected: `/`, `/assembly`, `/local-election`가 정상적으로 빌드되고 메타데이터 충돌이 없다.

- [ ] **Step 6: 라우팅 분리 변경을 커밋한다**

Run:

```bash
git add src/app src/features/assembly src/features/local-election
git commit -m "feat: 국회와 지방선거 라우트를 분리"
```

Expected: 허브 페이지와 도메인별 엔트리 분리가 하나의 기능 커밋으로 기록된다.

### Task 4: 지방선거 상태머신을 도메인 경로로 이동

**Files:**
- Create: `src/features/local-election/LocalElectionPage.tsx`
- Create: `src/features/local-election/components/AddressInput.tsx`
- Create: `src/features/local-election/components/BallotSummary.tsx`
- Create: `src/features/local-election/components/CandidateCards.tsx`
- Create: `src/features/local-election/components/CompareScopeView.tsx`
- Create: `src/features/local-election/components/CompareView.tsx`
- Create: `src/features/local-election/components/DetailView.tsx`
- Create: `src/features/local-election/components/IssueStep.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 기존 지방선거 페이지 상태머신을 `LocalElectionPage.tsx`로 옮긴다**

```bash
mkdir -p src/features/local-election
cp src/app/page.tsx src/features/local-election/LocalElectionPage.tsx
perl -0pi -e 's/export default function Home/export function LocalElectionPage/' src/features/local-election/LocalElectionPage.tsx
```

Then update the copied file imports so they point to the new domain bridge files:

```bash
perl -0pi -e 's#\"\\./components/AddressInput\"#\"@/features/local-election/components/AddressInput\"#g' src/features/local-election/LocalElectionPage.tsx
perl -0pi -e 's#\"\\./components/BallotSummary\"#\"@/features/local-election/components/BallotSummary\"#g' src/features/local-election/LocalElectionPage.tsx
perl -0pi -e 's#\"\\./components/CandidateCards\"#\"@/features/local-election/components/CandidateCards\"#g' src/features/local-election/LocalElectionPage.tsx
perl -0pi -e 's#\"\\./components/CompareScopeView\"#\"@/features/local-election/components/CompareScopeView\"#g' src/features/local-election/LocalElectionPage.tsx
perl -0pi -e 's#\"\\./components/CompareView\"#\"@/features/local-election/components/CompareView\"#g' src/features/local-election/LocalElectionPage.tsx
perl -0pi -e 's#\"\\./components/DetailView\"#\"@/features/local-election/components/DetailView\"#g' src/features/local-election/LocalElectionPage.tsx
perl -0pi -e 's#\"\\./components/IssueStep\"#\"@/features/local-election/components/IssueStep\"#g' src/features/local-election/LocalElectionPage.tsx
```

- [ ] **Step 2: 지방선거 전용 컴포넌트 브리지 파일을 추가한다**

```tsx
export { default } from "@/app/components/AddressInput";
```

```tsx
export { default } from "@/app/components/BallotSummary";
```

```tsx
export { default } from "@/app/components/CandidateCards";
```

```tsx
export { default } from "@/app/components/CompareScopeView";
```

```tsx
export { default } from "@/app/components/CompareView";
```

```tsx
export { default } from "@/app/components/DetailView";
```

```tsx
export { default } from "@/app/components/IssueStep";
```

이 작업 범위에서는 물리 이동보다 import 경계를 먼저 고정한다. 기존 `src/app/components/*`는 실제 구현 소스로 유지하고, 새 경로는 도메인 진입점 역할을 맡긴다.

- [ ] **Step 3: `src/app/page.tsx`에서 지방선거 상태 코드를 제거한다**

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-16">
      <section className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold">우리동네 안내 서비스</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link href="/assembly" className="rounded-2xl border p-6">
            국회
          </Link>
          <Link href="/local-election" className="rounded-2xl border p-6">
            지방선거
          </Link>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: 라우팅 회귀 여부를 검증한다**

Run:

```bash
npm run lint
npm run build
```

Expected: `LocalElectionPage`를 통해 기존 지방선거 기능이 유지되고, 루트 허브는 도메인 선택만 담당한다.

- [ ] **Step 5: 도메인 경계 변경을 커밋한다**

Run:

```bash
git add src/app/page.tsx src/features/local-election
git commit -m "refactor: 지방선거 상태머신을 도메인 경로로 분리"
```

Expected: 지방선거 로직의 도메인 경계 변경이 별도 커밋으로 기록된다.

### Task 5: 문서/운영 가이드 마무리와 최종 검증

**Files:**
- Modify: `README.md`
- Modify: `glossary.md`
- Modify: `agent-git-commit-guide.md`
- Modify: `agent-github-pr-and-merge-guide.md`
- Test: `npm run lint`
- Test: `npm run build`
- Test: `python3 scripts/llm_workflow_sync.py find-open-issues`
- Test: `python3 scripts/prepare_pr.py --issue 999`
- Test: `python3 scripts/validate_llm_workflow.py tmp/pr-body.md`

- [ ] **Step 1: README와 운영 가이드를 새 구조에 맞게 갱신한다**

```md
## 주요 진입 경로

- `/`: 서비스 허브
- `/assembly`: 국회 서비스
- `/local-election`: 지방선거 서비스

## 작업 문서 진입

- 루트 라우터: `AGENTS.md`
- 공통 workflow: `docs/common/codex/workflows/*`
- 국회 온보딩: `docs/assembly/onboarding/assembly-team-onboarding.md`
```

- [ ] **Step 2: 용어집과 agent 가이드를 새 workflow에 맞게 보강한다**

```md
- `assembly`: 국회 서비스 도메인
- `local-election`: 지방선거 서비스 도메인
- `work-log`: 기준 GitHub Issue에 남기는 작업 결정 기록 댓글
```

```md
## PR 전 확인

- 관련 Issue 번호를 본문에 연결했는가
- 문서 영향 범위를 적었는가
- `npm run lint`, `npm run build` 결과를 본문에 적었는가
```

- [ ] **Step 3: 최종 검증을 실행한다**

Run:

```bash
npm run lint
npm run build
python3 scripts/llm_workflow_sync.py find-open-issues
python3 scripts/prepare_pr.py --issue 1
python3 scripts/validate_llm_workflow.py tmp/pr-body.md
```

Expected: 프런트 빌드가 통과하고, workflow helper dry-run이 모두 성공한다.

- [ ] **Step 4: 최종 커밋을 만든다**

Run:

```bash
git add README.md glossary.md agent-git-commit-guide.md agent-github-pr-and-merge-guide.md tmp/pr-body.md
git commit -m "docs: 프론트 운영 가이드와 검증 흐름 정리"
```

Expected: README, 가이드, 검증 결과까지 포함한 마무리 커밋이 생성된다.

- [ ] **Step 5: PR 준비를 완료한다**

Run:

```bash
git status --short
git log --oneline --decorate -5
```

Expected: 작업 트리가 깨끗하고, PR에 담길 커밋 흐름이 검토 가능한 상태다.
