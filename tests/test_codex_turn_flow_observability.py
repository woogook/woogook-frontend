from __future__ import annotations

import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = ROOT / "scripts" / "codex_turn_flow_observability.py"
HELPER_PATH = ROOT / "scripts" / "turn_flow_observability.py"


def load_module(path: Path, module_name: str):
    spec = importlib.util.spec_from_file_location(module_name, path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def initialize_checkout_root(root: Path) -> Path:
    root.mkdir(parents=True, exist_ok=True)
    (root / ".git").mkdir(parents=True, exist_ok=True)
    return root


def create_linked_worktree(main_root: Path, *, name: str = "linked") -> Path:
    worktree_root = main_root.parent / name
    worktree_root.mkdir(parents=True, exist_ok=True)
    worktree_git_dir = main_root / ".git" / "worktrees" / name
    worktree_git_dir.mkdir(parents=True, exist_ok=True)
    (worktree_git_dir / "commondir").write_text("../..\n", encoding="utf-8")
    (worktree_root / ".git").write_text(
        f"gitdir: {worktree_git_dir.resolve()}\n",
        encoding="utf-8",
    )
    return worktree_root


class CodexTurnFlowObservabilityTests(unittest.TestCase):
    def test_start_turn_uses_codex_thread_id_and_main_checkout_canonical_root(self) -> None:
        wrapper = load_module(SCRIPT_PATH, "codex_turn_flow_observability")
        helper = load_module(HELPER_PATH, "turn_flow_observability")

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            main_root = initialize_checkout_root(tmp_path / "main")
            linked_root = create_linked_worktree(main_root)

            payload = wrapper.start_turn(
                repo_root=linked_root,
                now_rfc3339="2026-04-10T02:15:00Z",
                random_suffix="dbg1",
                env={"CODEX_THREAD_ID": "019d70f0-8dec-7122-a4a4-431cceb0e4aa"},
            )

            self.assertEqual(payload["recording_status"], "started")
            self.assertEqual(
                payload["events_path"],
                str(
                    main_root.resolve()
                    / "tmp"
                    / "turn-flow-observability"
                    / "turns"
                    / "2026-04-10"
                    / payload["turn_id"]
                    / "events.jsonl"
                ),
            )
            registry_path = helper.lookup_session_registry_path(
                repo_root=linked_root,
                session_key="codex:thread:019d70f0-8dec-7122-a4a4-431cceb0e4aa",
            )
            self.assertTrue(registry_path.exists())

    def test_finalize_turn_uses_env_session_key_and_cleans_registry(self) -> None:
        wrapper = load_module(SCRIPT_PATH, "codex_turn_flow_observability")
        helper = load_module(HELPER_PATH, "turn_flow_observability")

        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = initialize_checkout_root(Path(tmpdir) / "repo")
            env = {"CODEX_THREAD_ID": "019d70f0-8dec-7122-a4a4-431cceb0e4aa"}

            payload = wrapper.start_turn(
                repo_root=repo_root,
                now_rfc3339="2026-04-10T02:15:00Z",
                random_suffix="dbg1",
                env=env,
            )
            record_result = wrapper.record_stage(
                repo_root=repo_root,
                stage="implementation",
                status="stage_completed",
                timestamp="2026-04-10T02:15:10Z",
                issue_number=18,
                env=env,
            )
            summary = wrapper.finalize_turn(
                repo_root=repo_root,
                intent_label="implementation_only",
                require_issue=False,
                require_worktree=False,
                env=env,
            )
            registry_path = helper.lookup_session_registry_path(
                repo_root=repo_root,
                session_key="codex:thread:019d70f0-8dec-7122-a4a4-431cceb0e4aa",
            )

            self.assertEqual(record_result, {"recorded": True, "warning": None})
            self.assertEqual(summary["recording_status"], "complete")
            self.assertEqual(summary["turn_id"], payload["turn_id"])
            self.assertFalse(registry_path.exists())
            self.assertTrue(Path(payload["summary_path"]).exists())

    def test_start_turn_returns_skipped_payload_when_codex_thread_id_is_missing(self) -> None:
        wrapper = load_module(SCRIPT_PATH, "codex_turn_flow_observability")

        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = initialize_checkout_root(Path(tmpdir) / "repo")

            payload = wrapper.start_turn(
                repo_root=repo_root,
                now_rfc3339="2026-04-10T02:15:00Z",
                random_suffix="dbg1",
                env={},
            )

        self.assertEqual(payload["recording_status"], "skipped")
        self.assertIsNone(payload["turn_id"])
        self.assertIsNone(payload["events_path"])
        self.assertIn("CODEX_THREAD_ID is required", payload["warning"])

    def test_cli_start_turn_accepts_checkout_subdirectory_as_repo_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = Path(tmpdir) / "repo"
            subprocess.run(
                ["git", "init", str(repo_root)],
                check=True,
                capture_output=True,
                text=True,
            )
            subdir = repo_root / "app"
            subdir.mkdir(parents=True, exist_ok=True)

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT_PATH),
                    "--repo-root",
                    str(subdir),
                    "start-turn",
                    "--session-key",
                    "codex:thread:subdir-smoke",
                    "--now-rfc3339",
                    "2026-04-10T02:15:00Z",
                    "--random-suffix",
                    "dbg1",
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('"recording_status": "started"', result.stdout)


if __name__ == "__main__":
    unittest.main()
