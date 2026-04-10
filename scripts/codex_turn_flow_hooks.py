#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import sys
import time
import traceback
from pathlib import Path
from typing import Any, Mapping


DEFAULT_INTENT_LABEL = "implementation_only"
DEFAULT_PRIMARY_STAGE = "implementation"
DEFAULT_HOOK_TIMEOUT_SECONDS = 600
STOP_FINALIZE_MARGIN_SECONDS = 1.0
SUPPORTED_HOOK_EVENTS = frozenset({"UserPromptSubmit", "Stop"})
REVIEW_PATTERN = re.compile(
    r"(?:pre-?push\s+review|code\s+review|\breview\b|리뷰)",
    flags=re.IGNORECASE,
)
PRE_MERGE_PATTERN = re.compile(
    r"(?:pre-?merge|merge\s+전|머지\s+전)",
    flags=re.IGNORECASE,
)
POST_MERGE_PATTERN = re.compile(
    r"(?:post-?merge|merge\s+후|머지\s+후)",
    flags=re.IGNORECASE,
)
PRIMARY_STAGE_TO_INTENT_LABEL = {
    DEFAULT_PRIMARY_STAGE: DEFAULT_INTENT_LABEL,
    "review": "review_only",
    "pre-merge": "pre_merge_only",
    "post-merge": "post_merge_only",
}


def _load_module(path: Path, module_name: str):
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"failed to load module from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SCRIPT_DIR = Path(__file__).resolve().parent
WRAPPER = _load_module(
    SCRIPT_DIR / "codex_turn_flow_observability.py",
    "codex_turn_flow_observability",
)
HELPER = _load_module(
    SCRIPT_DIR / "turn_flow_observability.py",
    "turn_flow_observability",
)


def classify_prompt(prompt: str) -> dict[str, object]:
    normalized = prompt.strip()
    if PRE_MERGE_PATTERN.search(normalized):
        return {
            "intent_label": "pre_merge_only",
            "primary_stage": "pre-merge",
            "require_issue": False,
            "require_worktree": False,
        }
    if POST_MERGE_PATTERN.search(normalized):
        return {
            "intent_label": "post_merge_only",
            "primary_stage": "post-merge",
            "require_issue": False,
            "require_worktree": False,
        }
    if REVIEW_PATTERN.search(normalized):
        return {
            "intent_label": "review_only",
            "primary_stage": "review",
            "require_issue": False,
            "require_worktree": False,
        }
    return {
        "intent_label": DEFAULT_INTENT_LABEL,
        "primary_stage": DEFAULT_PRIMARY_STAGE,
        "require_issue": False,
        "require_worktree": False,
    }


def build_session_key(payload: Mapping[str, object]) -> str | None:
    session_id = payload.get("session_id")
    if not isinstance(session_id, str) or not session_id.strip():
        return None
    try:
        return WRAPPER.normalize_session_key(session_key=session_id)
    except ValueError:
        return None


def resolve_repo_root(payload: Mapping[str, object]) -> Path | None:
    raw_cwd = payload.get("cwd")
    if not isinstance(raw_cwd, str) or not raw_cwd.strip():
        return None
    try:
        return WRAPPER.normalize_repo_root(raw_cwd)
    except Exception:
        return None


def lookup_hook_context_path(*, repo_root: Path, session_key: str) -> Path:
    artifact_root = HELPER.artifact_root_for(repo_root)
    session_hash = HELPER.hash_session_key(session_key)
    return artifact_root / "hook-state" / f"{session_hash}.json"


def read_hook_context(
    *,
    repo_root: Path,
    session_key: str,
) -> dict[str, object] | None:
    path = lookup_hook_context_path(repo_root=repo_root, session_key=session_key)
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    return payload


def write_hook_context(
    *,
    repo_root: Path,
    session_key: str,
    payload: dict[str, object],
) -> None:
    HELPER.write_json_atomically(
        lookup_hook_context_path(repo_root=repo_root, session_key=session_key),
        payload,
    )


def cleanup_hook_context(
    *,
    repo_root: Path,
    session_key: str,
) -> None:
    lookup_hook_context_path(repo_root=repo_root, session_key=session_key).unlink(
        missing_ok=True
    )


def _stage_status_exists(
    *,
    repo_root: Path,
    turn_id: str,
    stage: str,
    status: str,
) -> bool:
    try:
        paths = HELPER.lookup_turn_paths(turn_id=turn_id, repo_root=repo_root)
        events, _ = HELPER.read_events(paths["events_path"])
    except (KeyError, OSError, ValueError, TypeError):
        return False
    return any(
        event.get("stage") == stage and event.get("status") == status
        for event in events
        if isinstance(event, dict)
    )


def _path_within_repo(*, repo_root: Path, cwd: Path) -> bool:
    try:
        cwd.relative_to(repo_root)
        return True
    except ValueError:
        return False


def iter_hook_config_paths(
    *,
    repo_root: Path,
    cwd: Path,
    home_dir: Path | None = None,
) -> list[Path]:
    paths: list[Path] = []
    seen: set[Path] = set()

    def add(path: Path) -> None:
        resolved = path.resolve()
        if resolved in seen or not resolved.exists():
            return
        seen.add(resolved)
        paths.append(resolved)

    add((home_dir or Path.home()) / ".codex" / "hooks.json")
    resolved_repo_root = repo_root.resolve()
    resolved_cwd = cwd.resolve()
    if _path_within_repo(repo_root=resolved_repo_root, cwd=resolved_cwd):
        project_dirs = [resolved_repo_root]
        relative = resolved_cwd.relative_to(resolved_repo_root)
        current = resolved_repo_root
        for part in relative.parts:
            current = current / part
            project_dirs.append(current)
    else:
        project_dirs = [resolved_repo_root]
    for project_dir in project_dirs:
        add(project_dir / ".codex" / "hooks.json")
    return paths


def read_matching_stop_hook_timeouts(path: Path) -> list[float]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return []
    hooks = payload.get("hooks")
    if not isinstance(hooks, dict):
        return []
    stop_groups = hooks.get("Stop")
    if not isinstance(stop_groups, list):
        return []

    timeouts: list[float] = []
    for group in stop_groups:
        if not isinstance(group, dict):
            continue
        handlers = group.get("hooks")
        if not isinstance(handlers, list):
            continue
        for handler in handlers:
            if not isinstance(handler, dict):
                continue
            if handler.get("type") not in {None, "command"}:
                continue
            timeout = handler.get("timeout", handler.get("timeoutSec"))
            if isinstance(timeout, (int, float)) and timeout > 0:
                timeouts.append(float(timeout))
            else:
                timeouts.append(float(DEFAULT_HOOK_TIMEOUT_SECONDS))
    return timeouts


def stop_finalize_delay_seconds(
    *,
    repo_root: Path,
    cwd: Path,
    home_dir: Path | None = None,
) -> float:
    timeouts: list[float] = []
    for path in iter_hook_config_paths(repo_root=repo_root, cwd=cwd, home_dir=home_dir):
        timeouts.extend(read_matching_stop_hook_timeouts(path))
    if len(timeouts) <= 1:
        return 0.0
    return max(timeouts) + STOP_FINALIZE_MARGIN_SECONDS


def build_hook_context(
    *,
    turn_id: str,
    classification: Mapping[str, object],
) -> dict[str, object]:
    return {
        "turn_id": turn_id,
        "intent_label": classification.get("intent_label", DEFAULT_INTENT_LABEL),
        "primary_stage": classification.get("primary_stage", DEFAULT_PRIMARY_STAGE),
        "require_issue": bool(classification.get("require_issue", False)),
        "require_worktree": bool(classification.get("require_worktree", False)),
    }


def build_default_hook_context(*, turn_id: str | None = None) -> dict[str, object]:
    context: dict[str, object] = {
        "intent_label": DEFAULT_INTENT_LABEL,
        "primary_stage": DEFAULT_PRIMARY_STAGE,
        "require_issue": False,
        "require_worktree": False,
    }
    if turn_id is not None:
        context["turn_id"] = turn_id
    return context


def recover_hook_context_from_turn_events(
    *,
    repo_root: Path,
    turn_id: str,
) -> dict[str, object] | None:
    try:
        paths = HELPER.lookup_turn_paths(turn_id=turn_id, repo_root=repo_root)
        events, _ = HELPER.read_events(paths["events_path"])
    except (KeyError, OSError, TypeError, ValueError):
        return None

    for event in events:
        if not isinstance(event, dict) or event.get("status") != "stage_entered":
            continue
        primary_stage = event.get("stage")
        if not isinstance(primary_stage, str):
            continue
        intent_label = PRIMARY_STAGE_TO_INTENT_LABEL.get(primary_stage)
        if intent_label is None:
            continue
        return build_hook_context(
            turn_id=turn_id,
            classification={
                "intent_label": intent_label,
                "primary_stage": primary_stage,
                "require_issue": False,
                "require_worktree": False,
            },
        )
    return None


def should_reuse_hook_context(
    *,
    existing_context: Mapping[str, object] | None,
    turn_id: str,
) -> bool:
    if existing_context is None:
        return False
    return (
        existing_context.get("turn_id") == turn_id
        and isinstance(existing_context.get("intent_label"), str)
        and isinstance(existing_context.get("primary_stage"), str)
    )


def record_stage_completed_if_needed(
    *,
    repo_root: Path,
    turn_id: str,
    context: Mapping[str, object],
) -> None:
    primary_stage = context.get("primary_stage", DEFAULT_PRIMARY_STAGE)
    if isinstance(primary_stage, str) and not _stage_status_exists(
        repo_root=repo_root,
        turn_id=turn_id,
        stage=primary_stage,
        status="stage_completed",
    ):
        HELPER.record_stage(
            repo_root=repo_root,
            turn_id=turn_id,
            stage=primary_stage,
            status="stage_completed",
            timestamp=HELPER.utc_now_rfc3339(),
            command_family=WRAPPER.DEFAULT_COMMAND_FAMILY,
            branch=WRAPPER.resolve_branch(repo_root),
            issue_number=None,
            pr_number=None,
            exit_code=None,
        )


def finalize_context(
    *,
    repo_root: Path,
    turn_id: str,
    context: Mapping[str, object],
    session_key: str | None = None,
) -> None:
    record_stage_completed_if_needed(
        repo_root=repo_root,
        turn_id=turn_id,
        context=context,
    )
    intent_label = context.get("intent_label", DEFAULT_INTENT_LABEL)
    HELPER.finalize_turn(
        repo_root=repo_root,
        turn_id=turn_id,
        intent_label=intent_label if isinstance(intent_label, str) else DEFAULT_INTENT_LABEL,
        require_issue=bool(context.get("require_issue", False)),
        require_worktree=bool(context.get("require_worktree", False)),
        session_key=session_key,
    )
    if session_key is not None:
        cleanup_hook_context(repo_root=repo_root, session_key=session_key)


def spawn_deferred_finalize(
    *,
    repo_root: Path,
    turn_id: str,
    intent_label: str,
    primary_stage: str,
    require_issue: bool,
    require_worktree: bool,
    delay_seconds: float,
) -> None:
    subprocess.Popen(
        [
            sys.executable,
            str(Path(__file__).resolve()),
            "--finalize-pending",
            "--repo-root",
            str(repo_root),
            "--turn-id",
            turn_id,
            "--intent-label",
            intent_label,
            "--primary-stage",
            primary_stage,
            "--require-issue",
            json.dumps(require_issue),
            "--require-worktree",
            json.dumps(require_worktree),
            "--delay-seconds",
            str(delay_seconds),
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=str(repo_root),
        start_new_session=True,
    )


def finalize_pending_stop(
    *,
    repo_root: Path,
    turn_id: str,
    intent_label: str,
    primary_stage: str,
    require_issue: bool,
    require_worktree: bool,
) -> dict[str, object]:
    try:
        paths = HELPER.lookup_turn_paths(turn_id=turn_id, repo_root=repo_root)
    except (OSError, ValueError):
        return {}
    if paths["summary_path"].exists():
        return {}
    finalize_context(
        repo_root=repo_root,
        turn_id=turn_id,
        context={
            "intent_label": intent_label,
            "primary_stage": primary_stage,
            "require_issue": require_issue,
            "require_worktree": require_worktree,
        },
    )
    return {}


def handle_user_prompt_submit(payload: Mapping[str, object]) -> dict[str, object]:
    session_key = build_session_key(payload)
    repo_root = resolve_repo_root(payload)
    prompt = payload.get("prompt")
    if session_key is None or repo_root is None or not isinstance(prompt, str):
        return {}

    classification = classify_prompt(prompt)
    start_payload = WRAPPER.start_turn(
        repo_root=repo_root,
        session_key=session_key,
    )
    turn_id = start_payload.get("turn_id")
    if not isinstance(turn_id, str) or start_payload.get("recording_status") == "skipped":
        return {}

    existing_context = read_hook_context(repo_root=repo_root, session_key=session_key)
    context = (
        dict(existing_context)
        if should_reuse_hook_context(existing_context=existing_context, turn_id=turn_id)
        else (
            recover_hook_context_from_turn_events(repo_root=repo_root, turn_id=turn_id)
            if start_payload.get("recording_status") == "reused"
            else None
        )
        or build_hook_context(
            turn_id=turn_id,
            classification=classification,
        )
    )
    write_hook_context(
        repo_root=repo_root,
        session_key=session_key,
        payload=context,
    )
    primary_stage = context.get("primary_stage")
    if isinstance(primary_stage, str) and not _stage_status_exists(
        repo_root=repo_root,
        turn_id=turn_id,
        stage=primary_stage,
        status="stage_entered",
    ):
        WRAPPER.record_stage(
            repo_root=repo_root,
            stage=primary_stage,
            status="stage_entered",
            session_key=session_key,
        )
    return {}


def handle_stop(payload: Mapping[str, object]) -> dict[str, object]:
    session_key = build_session_key(payload)
    repo_root = resolve_repo_root(payload)
    if session_key is None or repo_root is None:
        return {}

    context = read_hook_context(repo_root=repo_root, session_key=session_key)
    active_turn = HELPER.resolve_active_session_turn(
        repo_root=repo_root,
        session_key=session_key,
    )
    active_turn_id = active_turn.get("turn_id") if isinstance(active_turn, dict) else None
    if isinstance(active_turn_id, str):
        if not should_reuse_hook_context(
            existing_context=context,
            turn_id=active_turn_id,
        ):
            context = recover_hook_context_from_turn_events(
                repo_root=repo_root,
                turn_id=active_turn_id,
            ) or build_default_hook_context(turn_id=active_turn_id)
    elif context is None:
        context = build_default_hook_context()
    turn_id = active_turn_id if isinstance(active_turn_id, str) else context.get("turn_id")
    delay_seconds = stop_finalize_delay_seconds(
        repo_root=repo_root,
        cwd=Path(payload.get("cwd", str(repo_root))),
    )
    if isinstance(turn_id, str) and delay_seconds > 0:
        intent_label = (
            context["intent_label"]
            if isinstance(context.get("intent_label"), str)
            else DEFAULT_INTENT_LABEL
        )
        primary_stage = (
            context["primary_stage"]
            if isinstance(context.get("primary_stage"), str)
            else DEFAULT_PRIMARY_STAGE
        )
        require_issue = bool(context.get("require_issue", False))
        require_worktree = bool(context.get("require_worktree", False))
        HELPER.cleanup_session_registry(
            repo_root=repo_root,
            session_key=session_key,
            turn_id=turn_id,
        )
        cleanup_hook_context(repo_root=repo_root, session_key=session_key)
        try:
            spawn_deferred_finalize(
                repo_root=repo_root,
                turn_id=turn_id,
                intent_label=intent_label,
                primary_stage=primary_stage,
                require_issue=require_issue,
                require_worktree=require_worktree,
                delay_seconds=delay_seconds,
            )
        except Exception:
            finalize_context(
                repo_root=repo_root,
                turn_id=turn_id,
                context={
                    "intent_label": intent_label,
                    "primary_stage": primary_stage,
                    "require_issue": require_issue,
                    "require_worktree": require_worktree,
                },
                session_key=session_key,
            )
        return {}
    if isinstance(turn_id, str):
        finalize_context(
            repo_root=repo_root,
            turn_id=turn_id,
            context=context,
            session_key=session_key,
        )
        return {}
    intent_label = context.get("intent_label", DEFAULT_INTENT_LABEL)
    WRAPPER.finalize_turn(
        repo_root=repo_root,
        intent_label=intent_label if isinstance(intent_label, str) else DEFAULT_INTENT_LABEL,
        require_issue=bool(context.get("require_issue", False)),
        require_worktree=bool(context.get("require_worktree", False)),
        session_key=session_key,
    )
    cleanup_hook_context(repo_root=repo_root, session_key=session_key)
    return {}


def handle_hook_event(payload: Mapping[str, object]) -> dict[str, object]:
    hook_event_name = payload.get("hook_event_name")
    if hook_event_name not in SUPPORTED_HOOK_EVENTS:
        return {}
    if hook_event_name == "UserPromptSubmit":
        return handle_user_prompt_submit(payload)
    if hook_event_name == "Stop":
        return handle_stop(payload)
    return {}


def parse_finalize_pending_args(argv: list[str]) -> dict[str, object] | None:
    if not argv or argv[0] != "--finalize-pending":
        return None
    parsed: dict[str, object] = {
        "delay_seconds": 0.0,
        "require_issue": False,
        "require_worktree": False,
    }
    index = 1
    while index < len(argv):
        key = argv[index]
        if index + 1 >= len(argv):
            return None
        value = argv[index + 1]
        if key == "--repo-root":
            parsed["repo_root"] = value
        elif key == "--turn-id":
            parsed["turn_id"] = value
        elif key == "--intent-label":
            parsed["intent_label"] = value
        elif key == "--primary-stage":
            parsed["primary_stage"] = value
        elif key == "--require-issue":
            parsed["require_issue"] = value == "true"
        elif key == "--require-worktree":
            parsed["require_worktree"] = value == "true"
        elif key == "--delay-seconds":
            parsed["delay_seconds"] = float(value)
        else:
            return None
        index += 2
    required = {"repo_root", "turn_id", "intent_label", "primary_stage"}
    if not required.issubset(parsed):
        return None
    return parsed


def log_unhandled_exception(exc: Exception) -> None:
    print(
        f"Unexpected error in codex_turn_flow_hooks.py: {exc}",
        file=sys.stderr,
    )
    traceback.print_exc(file=sys.stderr)


def main() -> int:
    try:
        finalize_args = parse_finalize_pending_args(sys.argv[1:])
        if finalize_args is not None:
            if float(finalize_args["delay_seconds"]) > 0:
                time.sleep(float(finalize_args["delay_seconds"]))
            finalize_pending_stop(
                repo_root=Path(str(finalize_args["repo_root"])),
                turn_id=str(finalize_args["turn_id"]),
                intent_label=str(finalize_args["intent_label"]),
                primary_stage=str(finalize_args["primary_stage"]),
                require_issue=bool(finalize_args["require_issue"]),
                require_worktree=bool(finalize_args["require_worktree"]),
            )
            return 0
        raw = sys.stdin.read()
        if not raw.strip():
            return 0
        payload = json.loads(raw)
        if not isinstance(payload, dict):
            return 0
        result = handle_hook_event(payload)
        if result:
            print(json.dumps(result, ensure_ascii=False))
    except Exception as exc:
        log_unhandled_exception(exc)
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
