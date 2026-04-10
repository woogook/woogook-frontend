"""프론트엔드 v2 agent control-plane의 최소 구조를 검증한다."""

from __future__ import annotations

from pathlib import Path
import sys


REQUIRED_FILES = [
    "AGENTS.md",
    "glossary.md",
    ".agents/README.md",
    ".agents/contracts/common.yaml",
    ".agents/entry/assembly.md",
    ".agents/entry/local-election.md",
    ".agents/entry/local-council.md",
    ".agents/entry/common.md",
    "docs/local-council/canonical/llm-entry.md",
    ".agents/workflows/issue.md",
    ".agents/workflows/worktree.md",
    ".agents/workflows/commit.md",
    ".agents/workflows/implementation.md",
    ".agents/workflows/review.md",
    ".agents/workflows/requested-pr-review-follow-up.md",
    ".agents/workflows/pull-request.md",
    ".agents/workflows/pre-merge.md",
    ".agents/workflows/post-merge.md",
    ".codex/ENTRY.md",
    ".codex/config.toml",
    ".codex/hooks.json",
    ".claude/ENTRY.md",
    ".github/ISSUE_TEMPLATE/agent-task.yml",
    ".github/ISSUE_TEMPLATE/config.yml",
    ".github/pull_request_template.md",
    ".github/workflows/agents-harness-check.yml",
]

REQUIRED_CONTRACT_STRINGS = [
    "top_level_entry: AGENTS.md",
    "- glossary.md",
    "control_plane_entry: .agents/README.md",
    "id: common",
    "entry: .agents/entry/common.md",
    "id: assembly",
    "entry: .agents/entry/assembly.md",
    "id: local-election",
    "entry: .agents/entry/local-election.md",
    "id: local-council",
    "entry: .agents/entry/local-council.md",
    "issue: .agents/workflows/issue.md",
    "worktree: .agents/workflows/worktree.md",
    "implementation: .agents/workflows/implementation.md",
    "commit: .agents/workflows/commit.md",
    "review: .agents/workflows/review.md",
    "requested-pr-review-follow-up: .agents/workflows/requested-pr-review-follow-up.md",
    "pull-request: .agents/workflows/pull-request.md",
    "pre-merge: .agents/workflows/pre-merge.md",
    "post-merge: .agents/workflows/post-merge.md",
    "default_base_ref: origin/main",
    "pr_creation: explicit_user_request_only",
    "pr_merge_strategy: merge_commit_only",
    "pr_assignee: best_effort_creator_when_human",
    "pr_labels: best_effort_type_inferred",
    "pr_projects: explicit_repo_policy_only",
]

REQUIRED_ISSUE_TEMPLATE_STRINGS = [
    "label: 배경",
    "label: 목표",
    "label: 소유 도메인",
    "label: 범위",
    "label: 비범위",
    "label: 작업 체크리스트",
    "label: 검증",
    "label: 문서 영향",
    "label: 참고 자료",
    "common",
    "assembly",
    "local-election",
    "local-council",
]

REQUIRED_PR_TEMPLATE_STRINGS = [
    "PR 생성 시 가능한 경우 assignee와 labels를 함께 설정하고, projects는 저장소 명시 정책이 있을 때만 추가한다.",
    "- 관련 이슈:",
    "- closing keyword:",
    "- 소유 도메인:",
    "## 변경 내용",
    "## 리뷰 포인트",
    "## 문서 영향",
    "## 검증",
]


def repo_root() -> Path:
    """저장소 루트를 반환한다."""

    return Path(__file__).resolve().parent.parent


def check_required_files(root: Path) -> list[str]:
    """필수 파일 존재 여부를 확인한다."""

    errors: list[str] = []
    for relative_path in REQUIRED_FILES:
        if not (root / relative_path).exists():
            errors.append(f"missing required file: {relative_path}")
    return errors


def check_agents_top_gate(root: Path) -> list[str]:
    """AGENTS.md의 최소 라우팅 내용을 확인한다."""

    text = (root / "AGENTS.md").read_text(encoding="utf-8")
    errors: list[str] = []
    if "glossary.md" not in text:
        errors.append("AGENTS.md must route to glossary.md")
    if ".agents/README.md" not in text:
        errors.append("AGENTS.md must route to .agents/README.md")
    return errors


def check_common_contract(root: Path) -> list[str]:
    """common contract의 최소 key를 확인한다."""

    text = (root / ".agents" / "contracts" / "common.yaml").read_text(
        encoding="utf-8"
    )
    errors: list[str] = []
    for expected in REQUIRED_CONTRACT_STRINGS:
        if expected not in text:
            errors.append(f"missing contract entry: {expected}")
    return errors


def check_templates(root: Path) -> list[str]:
    """issue/PR template의 최소 항목을 확인한다."""

    errors: list[str] = []
    issue_template = (root / ".github" / "ISSUE_TEMPLATE" / "agent-task.yml").read_text(
        encoding="utf-8"
    )
    pr_template = (root / ".github" / "pull_request_template.md").read_text(
        encoding="utf-8"
    )

    for expected in REQUIRED_ISSUE_TEMPLATE_STRINGS:
        if expected not in issue_template:
            errors.append(f"missing issue template entry: {expected}")

    for expected in REQUIRED_PR_TEMPLATE_STRINGS:
        if expected not in pr_template:
            errors.append(f"missing pr template entry: {expected}")

    return errors


def main() -> int:
    """필수 surface가 갖춰졌는지 확인하고 종료 코드를 반환한다."""

    root = repo_root()
    errors = [
        *check_required_files(root),
        *check_agents_top_gate(root),
        *check_common_contract(root),
        *check_templates(root),
    ]
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
