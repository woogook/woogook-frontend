from __future__ import annotations

import json
import re
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


class AgentDocsTests(unittest.TestCase):
    def test_agents_top_gate_routes_to_glossary_and_control_plane(self) -> None:
        text = read("AGENTS.md")

        self.assertIn("glossary.md", text)
        self.assertIn(".agents/README.md", text)

    def test_agents_readme_routes_to_all_frontend_workflows(self) -> None:
        text = read(".agents/README.md")
        expected = [
            ".agents/workflows/issue.md",
            ".agents/workflows/worktree.md",
            ".agents/workflows/implementation.md",
            ".agents/workflows/review.md",
            ".agents/workflows/commit.md",
            ".agents/workflows/pull-request.md",
            ".agents/workflows/requested-pr-review-follow-up.md",
            ".agents/workflows/pre-merge.md",
            ".agents/workflows/post-merge.md",
        ]

        for item in expected:
            with self.subTest(item=item):
                self.assertIn(item, text)

    def test_agents_readme_lists_frontend_domains(self) -> None:
        text = read(".agents/README.md")

        self.assertIn("`assembly`", text)
        self.assertIn("`local-election`", text)
        self.assertIn("`local-council`", text)
        self.assertIn("`common`", text)

    def test_domain_canonical_docs_route_to_agent_entries(self) -> None:
        domains = {
            "assembly": "docs/assembly/canonical/llm-entry.md",
            "local-election": "docs/local-election/canonical/llm-entry.md",
            "local-council": "docs/local-council/canonical/llm-entry.md",
        }

        for domain, path in domains.items():
            with self.subTest(domain=domain):
                text = read(path)

                self.assertIn(f".agents/entry/{domain}.md", text)
                self.assertIn(".agents/workflows/*.md", text)
                self.assertIn(f"docs/{domain}/**", text)

    def test_agents_readme_mentions_best_effort_turn_flow_helper(self) -> None:
        text = read(".agents/README.md")
        match = re.search(
            r"^## turn-flow observability\n(.*?)(?:\n## |\Z)",
            text,
            flags=re.MULTILINE | re.DOTALL,
        )
        self.assertIsNotNone(match)
        section = match.group(1)

        self.assertIn("scripts/turn_flow_observability.py", section)
        self.assertIn("best effort", section)
        self.assertIn("메인 작업의 gate가 아니다", section)
        self.assertIn("session-scoped", section)
        self.assertIn("session_key", section)
        for stage in [
            "issue",
            "worktree",
            "implementation",
            "review",
            "commit",
            "push",
            "pull-request",
            "pre-merge",
            "post-merge",
        ]:
            with self.subTest(stage=stage):
                self.assertIn(stage, section)

    def test_gitignore_keeps_turn_events_shareable_but_runtime_state_ignored(self) -> None:
        text = read(".gitignore")
        turn_event_path = "tmp/turn-flow-observability/turns/example/events.jsonl"
        active_session_path = "tmp/turn-flow-observability/active-sessions/example.json"
        hook_state_path = "tmp/turn-flow-observability/hook-state/example.json"
        worktree_path = ".worktrees/example"
        pycache_path = "tests/__pycache__/test_agents_docs.cpython-313.pyc"

        turn_event_check = subprocess.run(
            ["git", "check-ignore", "--quiet", turn_event_path],
            cwd=ROOT,
            check=False,
        )
        active_session_check = subprocess.run(
            ["git", "check-ignore", "--quiet", active_session_path],
            cwd=ROOT,
            check=False,
        )
        hook_state_check = subprocess.run(
            ["git", "check-ignore", "--quiet", hook_state_path],
            cwd=ROOT,
            check=False,
        )
        worktree_check = subprocess.run(
            ["git", "check-ignore", "--quiet", worktree_path],
            cwd=ROOT,
            check=False,
        )
        pycache_check = subprocess.run(
            ["git", "check-ignore", "--quiet", pycache_path],
            cwd=ROOT,
            check=False,
        )

        self.assertIn(".worktrees/", text)
        self.assertIn("/tmp/turn-flow-observability/*", text)
        self.assertIn("!/tmp/turn-flow-observability/turns/", text)
        self.assertIn("!/tmp/turn-flow-observability/turns/**", text)
        self.assertEqual(turn_event_check.returncode, 1)
        self.assertEqual(active_session_check.returncode, 0)
        self.assertEqual(hook_state_check.returncode, 0)
        self.assertEqual(worktree_check.returncode, 0)
        self.assertEqual(pycache_check.returncode, 0)

    def test_entry_adapters_link_to_shared_session_scoped_observability_contract(self) -> None:
        codex_text = read(".codex/ENTRY.md")
        claude_text = read(".claude/ENTRY.md")

        self.assertIn("session-scoped turn-flow observability", codex_text)
        self.assertIn(".agents/README.md", codex_text)
        self.assertIn("scripts/codex_turn_flow_observability.py", codex_text)
        self.assertIn(".codex/config.toml", codex_text)
        self.assertIn(".codex/hooks.json", codex_text)
        self.assertIn("scripts/codex_turn_flow_hooks.py", codex_text)
        self.assertIn("session_id", codex_text)
        self.assertIn("CODEX_THREAD_ID", codex_text)
        self.assertIn("automatic invocation", codex_text)
        self.assertIn("project-local hook wiring", codex_text)
        self.assertIn("start-turn", codex_text)
        self.assertIn("record-stage", codex_text)
        self.assertIn("finalize-turn", codex_text)
        self.assertIn("session-scoped turn-flow observability", claude_text)
        self.assertIn(".agents/README.md", claude_text)

    def test_agents_readme_preserves_work_record_rule(self) -> None:
        text = read(".agents/README.md")

        self.assertIn("tmp/adr/<yymmdd>/", text)
        for section in ["배경", "변경 사항", "비채택안", "검증", "후속 메모"]:
            with self.subTest(section=section):
                self.assertIn(section, text)

    def test_local_council_entry_has_canonical_placeholder(self) -> None:
        entry_text = read(".agents/entry/local-council.md")

        self.assertIn("docs/local-council/canonical/llm-entry.md", entry_text)
        self.assertTrue((ROOT / "docs/local-council/canonical/llm-entry.md").exists())

    def test_package_scripts_expose_runnable_agents_commands(self) -> None:
        package_json = json.loads(read("package.json"))
        scripts = package_json["scripts"]

        self.assertEqual(
            scripts["agents:sync:issue"],
            "python3 scripts/agents_sync.py issue",
        )
        self.assertEqual(
            scripts["agents:sync:pull-request"],
            "python3 scripts/agents_sync.py pull-request",
        )
        self.assertEqual(
            scripts["agents:sync:post-merge-report"],
            "python3 scripts/agents_sync.py post-merge-report",
        )
        self.assertNotIn("agents:sync", scripts)


if __name__ == "__main__":
    unittest.main()
