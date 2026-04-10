#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import subprocess
from pathlib import Path
from typing import Mapping, Sequence


THREAD_ID_ENV_VAR = "CODEX_THREAD_ID"
DEFAULT_COMMAND_FAMILY = "codex"
SESSION_KEY_PREFIX = f"{DEFAULT_COMMAND_FAMILY}:thread:"
UNKNOWN_BRANCH = "unknown"


def _load_helper_module():
    script_path = Path(__file__).resolve().with_name("turn_flow_observability.py")
    spec = importlib.util.spec_from_file_location("turn_flow_observability", script_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"failed to load helper module from {script_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


HELPER = _load_helper_module()


def normalize_repo_root(raw: str | Path) -> Path:
    candidate = HELPER.normalize_repo_root(raw)
    dot_git = candidate / ".git"
    if dot_git.is_dir() or dot_git.is_file():
        return candidate
    try:
        result = subprocess.run(
            ["git", "-C", str(candidate), "rev-parse", "--show-toplevel"],
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError:
        return candidate
    top_level = result.stdout.strip()
    if result.returncode != 0 or not top_level:
        return candidate
    return HELPER.normalize_repo_root(top_level)


def normalize_session_key(
    *,
    session_key: str | None,
    env: Mapping[str, str] | None = None,
) -> str:
    def format_session_key(raw: str) -> str:
        normalized = raw.strip()
        if not normalized:
            raise ValueError("session_key must not be blank")
        if normalized.startswith(SESSION_KEY_PREFIX):
            return normalized
        return f"{SESSION_KEY_PREFIX}{normalized}"

    if session_key is not None:
        return format_session_key(session_key)
    source_env = os.environ if env is None else env
    thread_id = source_env.get(THREAD_ID_ENV_VAR)
    if thread_id is None or not thread_id.strip():
        raise ValueError(
            f"{THREAD_ID_ENV_VAR} is required unless --session-key is provided"
        )
    return format_session_key(thread_id)


def resolve_branch(repo_root: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_root), "branch", "--show-current"],
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError:
        return UNKNOWN_BRANCH
    branch = result.stdout.strip()
    if result.returncode != 0 or not branch:
        return UNKNOWN_BRANCH
    return branch


def start_turn(
    *,
    repo_root: Path,
    session_key: str | None = None,
    now_rfc3339: str | None = None,
    random_suffix: str | None = None,
    env: Mapping[str, str] | None = None,
) -> dict[str, object]:
    try:
        resolved_session_key = normalize_session_key(
            session_key=session_key,
            env=env,
        )
    except ValueError as exc:
        return {
            "turn_id": None,
            "recording_status": "skipped",
            "events_path": None,
            "summary_path": None,
            "warning": str(exc),
        }
    return HELPER.start_turn(
        repo_root=normalize_repo_root(repo_root),
        now_rfc3339=now_rfc3339,
        random_suffix=random_suffix,
        session_key=resolved_session_key,
    )


def record_stage(
    *,
    repo_root: Path,
    stage: str,
    status: str,
    timestamp: str | None = None,
    branch: str | None = None,
    issue_number: int | None = None,
    pr_number: int | None = None,
    exit_code: int | None = None,
    session_key: str | None = None,
    env: Mapping[str, str] | None = None,
) -> dict[str, object]:
    try:
        resolved_session_key = normalize_session_key(
            session_key=session_key,
            env=env,
        )
    except ValueError as exc:
        return {"recorded": False, "warning": str(exc)}
    normalized_repo_root = normalize_repo_root(repo_root)
    return HELPER.record_stage(
        repo_root=normalized_repo_root,
        stage=stage,
        status=status,
        timestamp=timestamp or HELPER.utc_now_rfc3339(),
        command_family=DEFAULT_COMMAND_FAMILY,
        branch=branch or resolve_branch(normalized_repo_root),
        issue_number=issue_number,
        pr_number=pr_number,
        exit_code=exit_code,
        session_key=resolved_session_key,
    )


def finalize_turn(
    *,
    repo_root: Path,
    intent_label: str,
    require_issue: bool,
    require_worktree: bool,
    session_key: str | None = None,
    env: Mapping[str, str] | None = None,
) -> dict[str, object]:
    try:
        resolved_session_key = normalize_session_key(
            session_key=session_key,
            env=env,
        )
    except ValueError as exc:
        return {
            "turn_id": None,
            "intent_label": intent_label,
            "recording_status": "skipped",
            "expected_flow": [],
            "observed_flow": [],
            "missing_stages": [],
            "unexpected_stages": [],
            "rule_violations": [],
            "summary_warnings": [str(exc)],
        }
    return HELPER.finalize_turn(
        repo_root=normalize_repo_root(repo_root),
        intent_label=intent_label,
        require_issue=require_issue,
        require_worktree=require_worktree,
        session_key=resolved_session_key,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Codex turn-flow observability shim")
    parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root or any path inside the current checkout",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    start_parser = subparsers.add_parser(
        "start-turn",
        help="Open or reuse the current Codex project turn",
    )
    start_parser.add_argument("--session-key")
    start_parser.add_argument("--now-rfc3339")
    start_parser.add_argument("--random-suffix")

    stage_parser = subparsers.add_parser(
        "record-stage",
        help="Append one stage event to the current Codex project turn",
    )
    stage_parser.add_argument("--session-key")
    stage_parser.add_argument("--stage", required=True)
    stage_parser.add_argument("--status", required=True)
    stage_parser.add_argument("--timestamp")
    stage_parser.add_argument("--branch")
    stage_parser.add_argument("--issue-number", type=int)
    stage_parser.add_argument("--pr-number", type=int)
    stage_parser.add_argument("--exit-code", type=int)

    finalize_parser = subparsers.add_parser(
        "finalize-turn",
        help="Finalize the current Codex project turn summary",
    )
    finalize_parser.add_argument("--session-key")
    finalize_parser.add_argument("--intent-label", required=True)
    finalize_parser.add_argument("--require-issue", action="store_true")
    finalize_parser.add_argument("--require-worktree", action="store_true")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "start-turn":
        payload = start_turn(
            repo_root=args.repo_root,
            session_key=args.session_key,
            now_rfc3339=args.now_rfc3339,
            random_suffix=args.random_suffix,
        )
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    if args.command == "record-stage":
        payload = record_stage(
            repo_root=args.repo_root,
            stage=args.stage,
            status=args.status,
            timestamp=args.timestamp,
            branch=args.branch,
            issue_number=args.issue_number,
            pr_number=args.pr_number,
            exit_code=args.exit_code,
            session_key=args.session_key,
        )
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    if args.command == "finalize-turn":
        payload = finalize_turn(
            repo_root=args.repo_root,
            intent_label=args.intent_label,
            require_issue=args.require_issue,
            require_worktree=args.require_worktree,
            session_key=args.session_key,
        )
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    raise SystemExit(2)


if __name__ == "__main__":
    raise SystemExit(main())
