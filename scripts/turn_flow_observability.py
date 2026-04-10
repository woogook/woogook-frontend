#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence
from uuid import uuid4


DEFAULT_ROOT_RELATIVE = Path("tmp/turn-flow-observability")
DEFAULT_TURN_ID_SUFFIX_LENGTH = 4
STAGE_VOCABULARY = frozenset(
    {
        "issue",
        "worktree",
        "implementation",
        "review",
        "commit",
        "push",
        "pull-request",
        "pre-merge",
        "post-merge",
    }
)
EVENT_STATUSES = frozenset(
    {
        "stage_entered",
        "stage_completed",
        "stage_failed",
        "stage_skipped",
        "completed",
    }
)
SUMMARY_LINE_FIELDS = (
    "turn_id",
    "intent_label",
    "expected_flow",
    "observed_flow",
    "missing_stages",
    "unexpected_stages",
    "rule_violations",
)
INTENT_TO_FLOW: dict[str, list[str]] = {
    "issue_only": ["issue"],
    "review_only": ["review"],
    "implementation_only": ["implementation"],
    "implementation_to_commit": ["implementation", "review", "commit"],
    "implementation_to_push": ["implementation", "review", "commit", "push"],
    "implementation_to_pull_request": [
        "implementation",
        "review",
        "commit",
        "push",
        "pull-request",
    ],
    "pre_merge_only": ["pre-merge"],
    "post_merge_only": ["post-merge"],
}
COMPLETED_EVENT_STATUSES = frozenset({"completed", "stage_completed"})


class AtomicWriteError(OSError):
    def __init__(self, write_error: OSError, cleanup_error: OSError | None = None) -> None:
        super().__init__(str(write_error))
        self.cleanup_error = cleanup_error


def normalize_repo_root(raw: str | Path) -> Path:
    return Path(raw).expanduser().resolve()


def validate_session_key(session_key: str) -> None:
    if not session_key.strip():
        raise ValueError("session_key must not be blank")


def hash_session_key(session_key: str) -> str:
    validate_session_key(session_key)
    return hashlib.sha256(session_key.encode("utf-8")).hexdigest()


def utc_now_rfc3339() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def build_turn_id(
    now_rfc3339: str | None = None,
    random_suffix: str | None = None,
) -> str:
    timestamp = (now_rfc3339 or utc_now_rfc3339()).replace(":", "-")
    suffix = random_suffix or uuid4().hex[:DEFAULT_TURN_ID_SUFFIX_LENGTH]
    return f"{timestamp}-{suffix}"


def _ensure_turn_path_is_within_root(path: Path, root: Path, *, turn_id: str) -> None:
    resolved_root = root.resolve()
    resolved_path = path.resolve()
    try:
        resolved_path.relative_to(resolved_root)
    except ValueError as exc:
        raise ValueError(
            f"turn_id would escape artifact root: {turn_id!r}"
        ) from exc


def validate_turn_id(turn_id: str) -> None:
    if "/" in turn_id or "\\" in turn_id:
        raise ValueError(f"invalid turn_id contains path separator: {turn_id!r}")


def validate_stage_event(*, stage: str, status: str) -> None:
    if stage not in STAGE_VOCABULARY:
        raise ValueError(f"unsupported stage: {stage}")
    if status not in EVENT_STATUSES:
        raise ValueError(f"unsupported status: {status}")


def resolve_canonical_project_root(repo_root: Path) -> Path:
    dot_git = repo_root / ".git"
    if dot_git.is_dir():
        return repo_root.resolve()
    if dot_git.is_file():
        gitdir_line = dot_git.read_text(encoding="utf-8").strip()
        if not gitdir_line.startswith("gitdir:"):
            raise FileNotFoundError(f"missing .git metadata for {repo_root}")
        git_dir = gitdir_line.split(":", 1)[1].strip()
        admin_dir = (repo_root / git_dir).resolve()
        commondir = admin_dir / "commondir"
        if not commondir.is_file():
            raise FileNotFoundError(f"missing .git metadata for {repo_root}")
        common_git_dir = (admin_dir / commondir.read_text(encoding="utf-8").strip()).resolve()
        return common_git_dir.parent.resolve()
    raise FileNotFoundError(f"missing .git metadata for {repo_root}")


def artifact_root_for(repo_root: Path) -> Path:
    return resolve_canonical_project_root(repo_root) / DEFAULT_ROOT_RELATIVE


def lookup_session_registry_path(*, repo_root: Path, session_key: str) -> Path:
    session_key_hash = hash_session_key(session_key)
    artifact_root = artifact_root_for(repo_root)
    path = artifact_root / "active-sessions" / f"{session_key_hash}.json"
    _ensure_turn_path_is_within_root(
        path,
        artifact_root,
        turn_id=f"session-key:{session_key_hash}",
    )
    return path


def lookup_turn_paths(*, turn_id: str, repo_root: Path) -> dict[str, Path]:
    validate_turn_id(turn_id)
    turn_day = turn_id[:10]
    artifact_root = artifact_root_for(repo_root)
    turn_dir = artifact_root / "turns" / turn_day / turn_id
    _ensure_turn_path_is_within_root(
        turn_dir,
        artifact_root,
        turn_id=turn_id,
    )
    return {
        "turn_dir": turn_dir,
        "events_path": turn_dir / "events.jsonl",
        "summary_path": turn_dir / "summary.json",
    }


def resolve_started_turn_paths(*, turn_id: str, repo_root: Path) -> dict[str, Path]:
    paths = lookup_turn_paths(turn_id=turn_id, repo_root=repo_root)
    if not paths["turn_dir"].is_dir():
        raise FileNotFoundError(f"turn was not started: {turn_id}")
    return paths


def write_json_atomically(path: Path, payload: dict[str, object]) -> None:
    temp_path: Path | None = None
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            delete=False,
            dir=path.parent,
        ) as stream:
            temp_path = Path(stream.name)
            json.dump(payload, stream, ensure_ascii=False, indent=2)
        temp_path.replace(path)
    except OSError as exc:
        cleanup_error: OSError | None = None
        if temp_path is not None:
            try:
                temp_path.unlink(missing_ok=True)
            except OSError as cleanup_exc:
                cleanup_error = cleanup_exc
        raise AtomicWriteError(exc, cleanup_error) from exc


def read_session_registry(*, repo_root: Path, session_key: str) -> dict[str, object] | None:
    path = lookup_session_registry_path(repo_root=repo_root, session_key=session_key)
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    return payload


def write_session_registry(
    *,
    repo_root: Path,
    session_key: str,
    turn_id: str,
    timestamp: str,
    created_at: str | None = None,
) -> None:
    write_json_atomically(
        lookup_session_registry_path(repo_root=repo_root, session_key=session_key),
        {
            "session_key": session_key,
            "turn_id": turn_id,
            "created_at": created_at or timestamp,
            "updated_at": timestamp,
        },
    )


def resolve_active_session_turn(
    *,
    repo_root: Path,
    session_key: str,
) -> dict[str, object] | None:
    registry = read_session_registry(repo_root=repo_root, session_key=session_key)
    if registry is None:
        return None
    turn_id = registry.get("turn_id")
    if not isinstance(turn_id, str):
        return None
    try:
        paths = lookup_turn_paths(turn_id=turn_id, repo_root=repo_root)
    except ValueError:
        return None
    if not paths["turn_dir"].is_dir():
        return None
    if paths["summary_path"].exists():
        return None
    created_at = registry.get("created_at")
    return {
        "turn_id": turn_id,
        "paths": paths,
        "created_at": created_at if isinstance(created_at, str) else None,
    }


def cleanup_session_registry(
    *,
    repo_root: Path,
    session_key: str,
    turn_id: str | None = None,
) -> None:
    path = lookup_session_registry_path(repo_root=repo_root, session_key=session_key)
    if not path.exists():
        return
    if turn_id is not None:
        registry = read_session_registry(repo_root=repo_root, session_key=session_key)
        if registry is not None and registry.get("turn_id") not in {turn_id, None}:
            return
    path.unlink(missing_ok=True)


def resolve_turn_id_for_write(
    *,
    repo_root: Path,
    turn_id: str | None,
    session_key: str | None,
) -> str:
    if turn_id is not None:
        return turn_id
    if session_key is None:
        raise ValueError("turn_id or session_key is required")
    active_turn = resolve_active_session_turn(
        repo_root=repo_root,
        session_key=session_key,
    )
    if active_turn is None:
        raise FileNotFoundError(
            f"active turn was not started for session_key: {session_key}"
        )
    return active_turn["turn_id"]


def start_turn(
    repo_root: Path,
    now_rfc3339: str | None = None,
    random_suffix: str | None = None,
    session_key: str | None = None,
) -> dict[str, object]:
    timestamp = now_rfc3339 or utc_now_rfc3339()
    if session_key is not None:
        try:
            active_turn = resolve_active_session_turn(
                repo_root=repo_root,
                session_key=session_key,
            )
            if active_turn is not None:
                write_session_registry(
                    repo_root=repo_root,
                    session_key=session_key,
                    turn_id=active_turn["turn_id"],
                    timestamp=timestamp,
                    created_at=active_turn["created_at"],
                )
                paths = active_turn["paths"]
                return {
                    "turn_id": active_turn["turn_id"],
                    "recording_status": "reused",
                    "events_path": str(paths["events_path"]),
                    "summary_path": str(paths["summary_path"]),
                    "warning": None,
                }
        except (OSError, ValueError) as exc:
            return {
                "turn_id": None,
                "recording_status": "skipped",
                "events_path": None,
                "summary_path": None,
                "warning": str(exc),
            }

    turn_id = build_turn_id(now_rfc3339=timestamp, random_suffix=random_suffix)
    try:
        paths = lookup_turn_paths(turn_id=turn_id, repo_root=repo_root)
        paths["turn_dir"].mkdir(parents=True, exist_ok=False)
        if session_key is not None:
            write_session_registry(
                repo_root=repo_root,
                session_key=session_key,
                turn_id=turn_id,
                timestamp=timestamp,
            )
    except (OSError, ValueError) as exc:
        return {
            "turn_id": turn_id,
            "recording_status": "skipped",
            "events_path": None,
            "summary_path": None,
            "warning": str(exc),
        }

    return {
        "turn_id": turn_id,
        "recording_status": "started",
        "events_path": str(paths["events_path"]),
        "summary_path": str(paths["summary_path"]),
        "warning": None,
    }


def build_expected_flow(
    intent_label: str,
    *,
    require_issue: bool,
    require_worktree: bool,
) -> list[str]:
    flow = list(INTENT_TO_FLOW[intent_label])
    if require_worktree:
        if "worktree" in flow:
            flow.remove("worktree")
        flow.insert(0, "worktree")
    if require_issue:
        if "issue" in flow:
            flow.remove("issue")
        flow.insert(0, "issue")
    return flow


def append_jsonl(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(payload, ensure_ascii=False) + "\n")


def read_events(path: Path) -> tuple[list[dict[str, object]], list[str]]:
    if not path.exists():
        return [], []

    events: list[dict[str, object]] = []
    warnings: list[str] = []
    for line_number, raw_line in enumerate(path.read_bytes().splitlines(), start=1):
        if not raw_line.strip():
            continue
        try:
            line = raw_line.decode("utf-8")
        except UnicodeDecodeError:
            warnings.append(f"ignored undecodable event line {line_number}")
            continue
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            warnings.append(f"ignored malformed event line {line_number}")
            continue
        if not isinstance(parsed, dict):
            warnings.append(f"ignored malformed event line {line_number}")
            continue
        events.append(parsed)
    return events, warnings


def record_stage(
    *,
    turn_id: str | None = None,
    repo_root: Path,
    stage: str,
    status: str,
    timestamp: str,
    command_family: str,
    branch: str,
    issue_number: int | None,
    pr_number: int | None,
    exit_code: int | None,
    session_key: str | None = None,
) -> dict[str, object]:
    try:
        validate_stage_event(stage=stage, status=status)
        resolved_turn_id = resolve_turn_id_for_write(
            repo_root=repo_root,
            turn_id=turn_id,
            session_key=session_key,
        )
        paths = resolve_started_turn_paths(turn_id=resolved_turn_id, repo_root=repo_root)
        append_jsonl(
            paths["events_path"],
            {
                "turn_id": resolved_turn_id,
                "stage": stage,
                "status": status,
                "timestamp": timestamp,
                "command_family": command_family,
                "branch": branch,
                "issue_number": issue_number,
                "pr_number": pr_number,
                "exit_code": exit_code,
            },
        )
        if session_key is not None:
            registry = read_session_registry(repo_root=repo_root, session_key=session_key)
            created_at = registry.get("created_at") if isinstance(registry, dict) else None
            write_session_registry(
                repo_root=repo_root,
                session_key=session_key,
                turn_id=resolved_turn_id,
                timestamp=timestamp,
                created_at=created_at if isinstance(created_at, str) else None,
            )
    except (OSError, ValueError) as exc:
        return {"recorded": False, "warning": str(exc)}

    return {"recorded": True, "warning": None}


def compute_rule_violations(
    *,
    expected_flow: list[str],
    observed_flow: list[str],
) -> list[str]:
    violations: list[str] = []
    if "review" in expected_flow and "commit" in observed_flow:
        if "review" not in observed_flow or observed_flow.index("review") > observed_flow.index("commit"):
            violations.append("review_before_commit")
    if "push" in observed_flow:
        if "commit" not in observed_flow or observed_flow.index("commit") > observed_flow.index("push"):
            violations.append("commit_before_push")
    if "pull-request" in observed_flow:
        if "push" not in observed_flow or observed_flow.index("push") > observed_flow.index(
            "pull-request"
        ):
            violations.append("push_before_pull_request")
    return violations


def finalize_turn(
    *,
    turn_id: str | None = None,
    repo_root: Path,
    intent_label: str,
    require_issue: bool,
    require_worktree: bool,
    session_key: str | None = None,
) -> dict[str, object]:
    try:
        resolved_turn_id = resolve_turn_id_for_write(
            repo_root=repo_root,
            turn_id=turn_id,
            session_key=session_key,
        )
    except (OSError, ValueError) as exc:
        return {
            "turn_id": turn_id,
            "intent_label": intent_label,
            "recording_status": "skipped",
            "expected_flow": [],
            "observed_flow": [],
            "missing_stages": [],
            "unexpected_stages": [],
            "rule_violations": [],
            "summary_warnings": [str(exc)],
        }

    if intent_label not in INTENT_TO_FLOW:
        payload = {
            "turn_id": resolved_turn_id,
            "intent_label": intent_label,
            "recording_status": "skipped",
            "expected_flow": [],
            "observed_flow": [],
            "missing_stages": [],
            "unexpected_stages": [],
            "rule_violations": [],
            "summary_warnings": [f"unsupported intent_label: {intent_label}"],
        }
        if session_key is not None and resolved_turn_id is not None:
            try:
                cleanup_session_registry(
                    repo_root=repo_root,
                    session_key=session_key,
                    turn_id=resolved_turn_id,
                )
            except OSError as exc:
                payload["summary_warnings"] = [
                    *payload["summary_warnings"],
                    f"session cleanup failed: {exc}",
                ]
        return payload

    expected_flow = build_expected_flow(
        intent_label,
        require_issue=require_issue,
        require_worktree=require_worktree,
    )

    try:
        paths = resolve_started_turn_paths(turn_id=resolved_turn_id, repo_root=repo_root)
        events, warnings = read_events(paths["events_path"])
    except (OSError, ValueError) as exc:
        payload = {
            "turn_id": resolved_turn_id,
            "intent_label": intent_label,
            "recording_status": "skipped",
            "expected_flow": expected_flow,
            "observed_flow": [],
            "missing_stages": [],
            "unexpected_stages": [],
            "rule_violations": [],
            "summary_warnings": [str(exc)],
        }
        if session_key is not None and resolved_turn_id is not None:
            try:
                cleanup_session_registry(
                    repo_root=repo_root,
                    session_key=session_key,
                    turn_id=resolved_turn_id,
                )
            except OSError as cleanup_exc:
                payload["summary_warnings"] = [
                    *payload["summary_warnings"],
                    f"session cleanup failed: {cleanup_exc}",
                ]
        return payload

    observed_flow = [
        stage
        for event in events
        if event.get("status") in COMPLETED_EVENT_STATUSES
        and isinstance(stage := event.get("stage"), str)
    ]
    summary = {
        "turn_id": resolved_turn_id,
        "intent_label": intent_label,
        "recording_status": "complete",
        "expected_flow": expected_flow,
        "observed_flow": observed_flow,
        "missing_stages": [stage for stage in expected_flow if stage not in observed_flow],
        "unexpected_stages": [stage for stage in observed_flow if stage not in expected_flow],
        "rule_violations": compute_rule_violations(
            expected_flow=expected_flow,
            observed_flow=observed_flow,
        ),
        "summary_warnings": warnings,
    }

    try:
        write_json_atomically(paths["summary_path"], summary)
    except OSError as exc:
        summary["recording_status"] = "warning"
        summary["summary_warnings"] = [
            *summary["summary_warnings"],
            f"summary finalize failed: {exc}",
        ]
        cleanup_error = getattr(exc, "cleanup_error", None)
        if isinstance(cleanup_error, OSError):
            summary["summary_warnings"] = [
                *summary["summary_warnings"],
                f"summary cleanup failed: {cleanup_error}",
            ]
    if session_key is not None:
        try:
            cleanup_session_registry(
                repo_root=repo_root,
                session_key=session_key,
                turn_id=resolved_turn_id,
            )
        except OSError as cleanup_exc:
            summary["recording_status"] = "warning"
            summary["summary_warnings"] = [
                *summary["summary_warnings"],
                f"session cleanup failed: {cleanup_exc}",
            ]

    return summary


def command_show(repo_root: Path, turn_id: str) -> int:
    try:
        paths = resolve_started_turn_paths(turn_id=turn_id, repo_root=repo_root)
        summary_text = paths["summary_path"].read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError, ValueError) as exc:
        payload = {
            "turn_id": turn_id,
            "recording_status": "skipped",
            "summary_warnings": [f"summary is not available for turn: {turn_id}"],
        }
        if not isinstance(exc, FileNotFoundError):
            payload["summary_warnings"] = [
                *payload["summary_warnings"],
                str(exc),
            ]
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    try:
        summary_payload = json.loads(summary_text)
    except json.JSONDecodeError:
        print(
            json.dumps(
                {
                    "turn_id": turn_id,
                    "recording_status": "skipped",
                    "summary_warnings": [
                        f"summary is not available for turn: {turn_id}",
                        "ignored malformed summary payload",
                    ],
                },
                ensure_ascii=False,
            )
        )
        return 0
    if not isinstance(summary_payload, dict):
        print(
            json.dumps(
                {
                    "turn_id": turn_id,
                    "recording_status": "skipped",
                    "summary_warnings": [
                        f"summary is not available for turn: {turn_id}",
                        "ignored malformed summary payload",
                    ],
                },
                ensure_ascii=False,
            )
        )
        return 0

    print(summary_text)
    return 0


def normalize_summary_date(raw: str) -> str | None:
    try:
        parsed = datetime.strptime(raw, "%Y-%m-%d")
    except ValueError:
        return None
    normalized = parsed.strftime("%Y-%m-%d")
    if normalized != raw:
        return None
    return normalized


def command_summarize(repo_root: Path, date: str) -> int:
    normalized_date = normalize_summary_date(date)
    if normalized_date is None:
        return 0

    try:
        turns_root = artifact_root_for(repo_root) / "turns"
    except OSError:
        return 0
    date_dir = turns_root / normalized_date
    if not date_dir.exists():
        return 0

    for summary_path in sorted(date_dir.glob("*/summary.json")):
        try:
            summary = json.loads(summary_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            continue
        if not isinstance(summary, dict):
            continue
        compact = {field: summary.get(field) for field in SUMMARY_LINE_FIELDS}
        print(json.dumps(compact, ensure_ascii=False))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Turn-flow observability helper")
    parser.add_argument(
        "--repo-root",
        default=Path(__file__).resolve().parents[1],
        type=Path,
        help="Repository root to use when resolving canonical artifact paths",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    start_turn_parser = subparsers.add_parser(
        "start-turn",
        help="Create a turn directory and emit its local artifact paths",
    )
    start_turn_parser.add_argument("--now-rfc3339")
    start_turn_parser.add_argument("--random-suffix")
    start_turn_parser.add_argument("--session-key")

    record_stage_parser = subparsers.add_parser(
        "record-stage",
        help="Append a stage event for an existing turn",
    )
    record_stage_parser.add_argument("turn_id", nargs="?")
    record_stage_parser.add_argument("--stage", required=True)
    record_stage_parser.add_argument("--status", required=True)
    record_stage_parser.add_argument("--timestamp", required=True)
    record_stage_parser.add_argument("--command-family", required=True)
    record_stage_parser.add_argument("--branch", required=True)
    record_stage_parser.add_argument("--session-key")
    record_stage_parser.add_argument("--issue-number", type=int)
    record_stage_parser.add_argument("--pr-number", type=int)
    record_stage_parser.add_argument("--exit-code", type=int)

    finalize_turn_parser = subparsers.add_parser(
        "finalize-turn",
        help="Compute and persist a summary for a turn",
    )
    finalize_turn_parser.add_argument("turn_id", nargs="?")
    finalize_turn_parser.add_argument("--intent-label", required=True)
    finalize_turn_parser.add_argument("--session-key")
    finalize_turn_parser.add_argument("--require-issue", action="store_true")
    finalize_turn_parser.add_argument("--require-worktree", action="store_true")

    show_parser = subparsers.add_parser(
        "show",
        help="Print one turn summary.json payload",
    )
    show_parser.add_argument("turn_id")

    summarize_parser = subparsers.add_parser(
        "summarize",
        help="Print compact JSON lines for one date directory",
    )
    summarize_parser.add_argument("--date", required=True)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    repo_root = normalize_repo_root(args.repo_root)

    if args.command == "start-turn":
        payload = start_turn(
            repo_root=repo_root,
            now_rfc3339=args.now_rfc3339,
            random_suffix=args.random_suffix,
            session_key=args.session_key,
        )
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    if args.command == "record-stage":
        payload = record_stage(
            turn_id=args.turn_id,
            repo_root=repo_root,
            stage=args.stage,
            status=args.status,
            timestamp=args.timestamp,
            command_family=args.command_family,
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
            turn_id=args.turn_id,
            repo_root=repo_root,
            intent_label=args.intent_label,
            require_issue=args.require_issue,
            require_worktree=args.require_worktree,
            session_key=args.session_key,
        )
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    if args.command == "show":
        return command_show(repo_root, args.turn_id)

    if args.command == "summarize":
        return command_summarize(repo_root, args.date)

    raise SystemExit(2)


if __name__ == "__main__":
    raise SystemExit(main())
