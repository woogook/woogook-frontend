from __future__ import annotations

import importlib.util
import io
import json
import tempfile
import unittest
from unittest import mock
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = ROOT / "scripts" / "codex_turn_flow_hooks.py"
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


def read_events(path: Path) -> list[dict[str, object]]:
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


class CodexTurnFlowHookTests(unittest.TestCase):
    def test_repo_local_codex_hook_config_enables_hooks_and_targets_runner(self) -> None:
        project_config = (ROOT / ".codex" / "config.toml").read_text(encoding="utf-8")
        hook_config = json.loads((ROOT / ".codex" / "hooks.json").read_text(encoding="utf-8"))
        user_prompt_command = hook_config["hooks"]["UserPromptSubmit"][0]["hooks"][0][
            "command"
        ]
        stop_command = hook_config["hooks"]["Stop"][0]["hooks"][0]["command"]

        self.assertIn("codex_hooks = true", project_config)
        self.assertTrue(user_prompt_command.startswith("/usr/bin/python3 -c "))
        self.assertTrue(stop_command.startswith("/usr/bin/python3 -c "))
        self.assertIn("runpy.run_path", user_prompt_command)
        self.assertIn("runpy.run_path", stop_command)
        self.assertIn("scripts", user_prompt_command)
        self.assertIn("scripts", stop_command)
        self.assertIn("codex_turn_flow_hooks.py", user_prompt_command)
        self.assertIn("codex_turn_flow_hooks.py", stop_command)
        self.assertNotIn("$(", user_prompt_command)
        self.assertNotIn("$(", stop_command)

    def test_user_prompt_submit_starts_turn_and_persists_hook_context(self) -> None:
        module = load_module(SCRIPT_PATH, "codex_turn_flow_hooks")
        helper = load_module(HELPER_PATH, "turn_flow_observability")

        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = initialize_checkout_root(Path(tmpdir) / "repo")

            result = module.handle_hook_event(
                {
                    "hook_event_name": "UserPromptSubmit",
                    "session_id": "019d-hook-test",
                    "cwd": str(repo_root),
                    "prompt": "프론트엔드 하니스 지침에 따라 현재 상태를 점검해줘.",
                    "turn_id": "turn-1",
                    "model": "gpt-5.4",
                }
            )
            context = module.read_hook_context(
                repo_root=repo_root,
                session_key="codex:thread:019d-hook-test",
            )

            self.assertEqual(result, {})
            self.assertIsNotNone(context)
            self.assertEqual(context["intent_label"], "implementation_only")
            self.assertEqual(context["primary_stage"], "implementation")

            events_path = helper.lookup_turn_paths(
                turn_id=context["turn_id"],
                repo_root=repo_root,
            )["events_path"]
            events = read_events(events_path)
            self.assertEqual(len(events), 1)
            self.assertEqual(events[0]["turn_id"], context["turn_id"])
            self.assertEqual(events[0]["stage"], "implementation")
            self.assertEqual(events[0]["status"], "stage_entered")
            self.assertEqual(events[0]["command_family"], "codex")

    def test_stop_completes_stage_and_finalizes_summary_for_same_session(self) -> None:
        module = load_module(SCRIPT_PATH, "codex_turn_flow_hooks")
        helper = load_module(HELPER_PATH, "turn_flow_observability")

        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = initialize_checkout_root(Path(tmpdir) / "repo")

            module.handle_hook_event(
                {
                    "hook_event_name": "UserPromptSubmit",
                    "session_id": "019d-hook-test",
                    "cwd": str(repo_root),
                    "prompt": "프론트엔드 하니스 지침에 따라 현재 상태를 점검해줘.",
                    "turn_id": "turn-1",
                    "model": "gpt-5.4",
                }
            )
            stop_result = module.handle_hook_event(
                {
                    "hook_event_name": "Stop",
                    "session_id": "019d-hook-test",
                    "cwd": str(repo_root),
                    "turn_id": "turn-1",
                    "last_assistant_message": "점검을 마쳤습니다.",
                }
            )
            registry_path = helper.lookup_session_registry_path(
                repo_root=repo_root,
                session_key="codex:thread:019d-hook-test",
            )
            summary_paths = list(
                (repo_root / "tmp" / "turn-flow-observability" / "turns").glob(
                    "*/*/summary.json"
                )
            )
            summary = json.loads(summary_paths[0].read_text(encoding="utf-8"))

        self.assertEqual(stop_result, {})
        self.assertFalse(registry_path.exists())
        self.assertEqual(summary["recording_status"], "complete")
        self.assertEqual(summary["intent_label"], "implementation_only")
        self.assertEqual(summary["observed_flow"], ["implementation"])
        self.assertEqual(summary["missing_stages"], [])

    def test_classify_prompt_routes_review_and_merge_turns(self) -> None:
        module = load_module(SCRIPT_PATH, "codex_turn_flow_hooks")

        self.assertEqual(
            module.classify_prompt("pre-push review를 해줘")["primary_stage"],
            "review",
        )
        self.assertEqual(
            module.classify_prompt("merge 전 점검해줘")["primary_stage"],
            "pre-merge",
        )
        self.assertEqual(
            module.classify_prompt("merge 후 정리해줘")["primary_stage"],
            "post-merge",
        )

    def test_main_logs_malformed_json_as_specific_hook_warning(self) -> None:
        module = load_module(SCRIPT_PATH, "codex_turn_flow_hooks")
        stderr = io.StringIO()

        with (
            mock.patch.object(module.sys, "argv", ["codex_turn_flow_hooks.py"]),
            mock.patch.object(module.sys, "stdin", io.StringIO("{not-json")),
            mock.patch.object(module.sys, "stderr", stderr),
        ):
            exit_code = module.main()

        self.assertEqual(exit_code, 0)
        warning = stderr.getvalue()
        self.assertIn("ignored malformed hook payload", warning)
        self.assertIn("JSONDecodeError", warning)
        self.assertNotIn("Unexpected error", warning)
        self.assertNotIn("Traceback", warning)


if __name__ == "__main__":
    unittest.main()
