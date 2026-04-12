"""v2 agent control-plane용 최소 sync 명령 surface."""

from __future__ import annotations

import argparse
from typing import Sequence


MESSAGES = {
    "issue": "issue sync surface is ready",
    "pull-request": "pull-request sync surface is ready",
    "post-merge-report": "post-merge-report sync surface is ready",
}


def build_parser() -> argparse.ArgumentParser:
    """지원하는 명령만 노출하는 parser를 만든다."""

    parser = argparse.ArgumentParser(description="v2 agent control-plane sync")
    parser.add_argument("command", choices=sorted(MESSAGES))
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """선택한 명령에 대응하는 최소 응답을 출력한다."""

    parser = build_parser()
    args = parser.parse_args(argv)
    print(MESSAGES[args.command])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
