from __future__ import annotations

import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "validate_agents_harness.py"


def load_module():
    spec = importlib.util.spec_from_file_location("validate_agents_harness", MODULE_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class AgentValidationTests(unittest.TestCase):
    def test_validate_agents_harness_exits_zero(self) -> None:
        result = subprocess.run(
            [sys.executable, "scripts/validate_agents_harness.py"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_check_required_files_covers_frontend_control_plane(self) -> None:
        module = load_module()

        with tempfile.TemporaryDirectory() as tmpdir:
            errors = module.check_required_files(Path(tmpdir))

        self.assertIn("missing required file: glossary.md", errors)
        self.assertIn("missing required file: .agents/entry/assembly.md", errors)
        self.assertIn("missing required file: .agents/entry/local-election.md", errors)
        self.assertIn("missing required file: .agents/entry/local-council.md", errors)
        self.assertIn("missing required file: .agents/entry/common.md", errors)
        self.assertIn(
            "missing required file: docs/local-council/canonical/llm-entry.md",
            errors,
        )
        self.assertIn(
            "missing required file: .github/workflows/agents-harness-check.yml",
            errors,
        )
        self.assertIn(
            "missing required file: .github/ISSUE_TEMPLATE/config.yml",
            errors,
        )

    def test_check_common_contract_requires_all_required_entries(self) -> None:
        module = load_module()

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            contract_dir = root / ".agents" / "contracts"
            contract_dir.mkdir(parents=True)
            (contract_dir / "common.yaml").write_text(
                "\n".join(
                    [
                        "routing:",
                        "  top_level_entry: AGENTS.md",
                        "  shared_canonical:",
                        "    - glossary.md",
                        "  control_plane_entry: .agents/README.md",
                        "workflows:",
                        "  issue: .agents/workflows/issue.md",
                        "  review: .agents/workflows/review.md",
                        "  pull-request: .agents/workflows/pull-request.md",
                        "policies:",
                        "  default_base_ref: origin/main",
                        "  pr_creation: explicit_user_request_only",
                    ]
                ),
                encoding="utf-8",
            )

            errors = module.check_common_contract(root)

        self.assertIn(
            "missing contract entry: worktree: .agents/workflows/worktree.md",
            errors,
        )
        self.assertIn(
            "missing contract entry: implementation: .agents/workflows/implementation.md",
            errors,
        )
        self.assertIn(
            "missing contract entry: requested-pr-review-follow-up: "
            ".agents/workflows/requested-pr-review-follow-up.md",
            errors,
        )
        self.assertIn("missing contract entry: pr_merge_strategy: merge_commit_only", errors)
        self.assertIn(
            "missing contract entry: pr_assignee: best_effort_creator_when_human",
            errors,
        )
        self.assertIn("missing contract entry: pr_labels: best_effort_type_inferred", errors)
        self.assertIn("missing contract entry: pr_projects: explicit_repo_policy_only", errors)

    def test_check_templates_requires_pr_metadata_guidance(self) -> None:
        module = load_module()

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            issue_template_dir = root / ".github" / "ISSUE_TEMPLATE"
            issue_template_dir.mkdir(parents=True)
            (issue_template_dir / "agent-task.yml").write_text(
                "\n".join(
                    [
                        "label: 배경",
                        "label: 목표",
                        "label: 소유 도메인",
                        "label: 범위",
                        "label: 비범위",
                        "label: 작업 체크리스트",
                        "label: 검증",
                        "label: 문서 영향",
                        "label: 참고 자료",
                    ]
                ),
                encoding="utf-8",
            )
            (root / ".github" / "pull_request_template.md").write_text(
                "\n".join(
                    [
                        "## 배경",
                        "",
                        "- 관련 이슈:",
                        "- closing keyword:",
                        "- 소유 도메인:",
                        "",
                        "## 변경 내용",
                        "## 리뷰 포인트",
                        "## 문서 영향",
                        "## 검증",
                    ]
                ),
                encoding="utf-8",
            )

            errors = module.check_templates(root)

        self.assertIn(
            "missing pr template entry: PR 생성 시 가능한 경우 assignee와 labels를 함께 설정하고, "
            "projects는 저장소 명시 정책이 있을 때만 추가한다.",
            errors,
        )
        for domain in ["common", "assembly", "local-election", "local-council"]:
            with self.subTest(domain=domain):
                self.assertIn(f"missing issue template entry: {domain}", errors)


if __name__ == "__main__":
    unittest.main()
