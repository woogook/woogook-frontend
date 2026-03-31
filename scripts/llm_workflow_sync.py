"""GitHub Issue 조회와 work-log 생성을 돕는 최소 helper."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str]) -> str:
    """Run a subprocess command and return stdout."""

    completed = subprocess.run(cmd, check=True, text=True, capture_output=True)
    return completed.stdout.strip()


def find_open_issues() -> None:
    """Print open issues for quick triage."""

    print(run(["gh", "issue", "list", "--state", "open", "--limit", "20"]))


def render_work_log(issue_number: str, summary: str) -> None:
    """Render a work-log markdown file under tmp/ for later posting."""

    body = "\n".join(
        [
            f"## work-log #{issue_number}",
            "",
            "### 진행 요약",
            f"- {summary}",
            "",
            "### 검증",
            "- 아직 검증 전",
        ]
    )
    Path("tmp").mkdir(exist_ok=True)
    path = Path("tmp") / f"work-log-issue-{issue_number}.md"
    path.write_text(body, encoding="utf-8")
    print(path.as_posix())


def comment_work_log(issue_number: str, path: str) -> None:
    """Post a rendered work-log comment to the issue."""

    subprocess.run(
        ["gh", "issue", "comment", issue_number, "--body-file", path],
        check=True,
        text=True,
    )


def main() -> None:
    """Dispatch CLI commands."""

    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("find-open-issues")

    render_parser = sub.add_parser("render-work-log")
    render_parser.add_argument("--issue", required=True)
    render_parser.add_argument("--summary", required=True)

    comment_parser = sub.add_parser("comment-work-log")
    comment_parser.add_argument("--issue", required=True)
    comment_parser.add_argument("--path", required=True)

    args = parser.parse_args()
    try:
        if args.command == "find-open-issues":
            find_open_issues()
        elif args.command == "render-work-log":
            render_work_log(args.issue, args.summary)
        elif args.command == "comment-work-log":
            comment_work_log(args.issue, args.path)
        else:
            raise ValueError(f"unknown command: {args.command}")
    except subprocess.CalledProcessError as error:
        print(error.stderr or str(error), file=sys.stderr)
        raise SystemExit(error.returncode) from error


if __name__ == "__main__":
    main()
