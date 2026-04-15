import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { ESLint } from "eslint";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE_PATTERNS = ["*.js", "*.cjs", "*.mjs", "*.jsx", "*.ts", "*.tsx"];

function listLintTargets() {
  const stdout = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...FILE_PATTERNS],
    {
      cwd: ROOT_DIR,
      encoding: "utf8",
    },
  );

  return [...new Set(stdout.split("\0").filter(Boolean))].filter((file) =>
    fs.existsSync(path.join(ROOT_DIR, file)),
  );
}

const files = listLintTargets();

if (files.length === 0) {
  process.exit(0);
}

const eslint = new ESLint({ cwd: ROOT_DIR });
const results = await eslint.lintFiles(files);
const formatter = await eslint.loadFormatter("stylish");
const output = formatter.format(results);

if (output) {
  process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
}

const errorCount = results.reduce(
  (sum, result) => sum + result.errorCount + result.fatalErrorCount,
  0,
);

process.exit(errorCount === 0 ? 0 : 1);
