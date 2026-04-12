from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AgentContractTests(unittest.TestCase):
    def test_common_contract_lists_expected_frontend_entries(self) -> None:
        text = (ROOT / ".agents" / "contracts" / "common.yaml").read_text(
            encoding="utf-8"
        )
        expected = [
            "version: 2",
            "profile: common",
            "top_level_entry: AGENTS.md",
            "control_plane_entry: .agents/README.md",
            "- glossary.md",
            "default: common",
            "id: assembly",
            "entry: .agents/entry/assembly.md",
            "id: local-election",
            "entry: .agents/entry/local-election.md",
            "id: local-council",
            "entry: .agents/entry/local-council.md",
            "id: common",
            "entry: .agents/entry/common.md",
            "issue: .agents/workflows/issue.md",
            "worktree: .agents/workflows/worktree.md",
            "implementation: .agents/workflows/implementation.md",
            "review: .agents/workflows/review.md",
            "commit: .agents/workflows/commit.md",
            "pull-request: .agents/workflows/pull-request.md",
            "requested-pr-review-follow-up: .agents/workflows/requested-pr-review-follow-up.md",
            "pre-merge: .agents/workflows/pre-merge.md",
            "post-merge: .agents/workflows/post-merge.md",
            "default_base_ref: origin/main",
            "pr_creation: explicit_user_request_only",
            "pr_merge_strategy: merge_commit_only",
            "pr_assignee: best_effort_creator_when_human",
            "pr_labels: best_effort_type_inferred",
            "pr_projects: explicit_repo_policy_only",
        ]

        for item in expected:
            with self.subTest(item=item):
                self.assertIn(item, text)

    def test_contract_uses_frontend_domain_set(self) -> None:
        text = (ROOT / ".agents" / "contracts" / "common.yaml").read_text(
            encoding="utf-8"
        )

        self.assertIn("id: local-council", text)
        self.assertNotIn("docs/지방의원", text)


if __name__ == "__main__":
    unittest.main()
