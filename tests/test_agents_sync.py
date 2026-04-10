from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AgentSyncTests(unittest.TestCase):
    def test_agents_sync_supports_expected_commands(self) -> None:
        for command in ["issue", "pull-request", "post-merge-report"]:
            with self.subTest(command=command):
                result = subprocess.run(
                    [sys.executable, "scripts/agents_sync.py", command],
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )

                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn(command, result.stdout)


if __name__ == "__main__":
    unittest.main()
