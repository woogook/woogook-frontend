import { spawn } from "node:child_process";
import process from "node:process";

import {
  getSmokePlaywrightCommandArgs,
  getSmokePlaywrightEnv,
} from "./local-council-harness.mjs";

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

const child = spawn(
  getNpmCommand(),
  getSmokePlaywrightCommandArgs(process.argv.slice(2)),
  {
    stdio: "inherit",
    env: getSmokePlaywrightEnv(process.env),
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("[local-council:smoke] Playwright 실행에 실패했습니다.", error);
  process.exit(1);
});
