"""Validate required sections in a generated PR body markdown file."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


REQUIRED_SECTIONS = [
    "## 배경",
    "## 목표",
    "## 주요 변경 사항",
    "## 문서 영향",
    "## 검증",
]


def main() -> None:
    """Fail when the PR body misses required sections."""

    parser = argparse.ArgumentParser()
    parser.add_argument("path")
    args = parser.parse_args()

    content = Path(args.path).read_text(encoding="utf-8")
    missing = [section for section in REQUIRED_SECTIONS if section not in content]
    if missing:
        print(f"missing sections: {', '.join(missing)}", file=sys.stderr)
        raise SystemExit(1)

    print("workflow validation passed")


if __name__ == "__main__":
    main()
