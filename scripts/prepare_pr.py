"""Prepare a PR body markdown file from the current branch context."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str]) -> str:
    """Run a subprocess command and return stdout."""

    completed = subprocess.run(cmd, check=True, text=True, capture_output=True)
    return completed.stdout.strip()


def main() -> None:
    """Create a PR body file under tmp/ for manual review or gh usage."""

    parser = argparse.ArgumentParser()
    parser.add_argument("--issue", required=True)
    parser.add_argument("--base", default="main")
    args = parser.parse_args()

    try:
        current_branch = run(["git", "branch", "--show-current"])
        recent_commits = run(["git", "log", "--oneline", f"{args.base}..HEAD"])
    except subprocess.CalledProcessError as error:
        print(error.stderr or str(error), file=sys.stderr)
        raise SystemExit(error.returncode) from error

    body = "\n".join(
        [
            "## 배경",
            f"- 관련 Issue: #{args.issue}",
            "",
            "## 목표",
            "- 프론트 도메인 라우팅과 workflow 정리",
            "",
            "## 주요 변경 사항",
            recent_commits or "- 변경 커밋 없음",
            "",
            "## 문서 영향",
            "- `docs/**`, `AGENTS.md`, `README.md` 변경 여부 확인",
            "",
            "## 검증",
            "- npm run lint",
            "- npm run build",
            "",
            "## 남은 위험 / 후속 메모",
            f"- 현재 브랜치: `{current_branch}`",
        ]
    )

    Path("tmp").mkdir(exist_ok=True)
    path = Path("tmp/pr-body.md")
    path.write_text(body, encoding="utf-8")
    print(path.as_posix())


if __name__ == "__main__":
    main()
