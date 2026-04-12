import fs from "node:fs/promises";
import path from "node:path";
import { gzip } from "node:zlib";
import { promisify } from "node:util";

import type { ObservabilityEvent } from "@/lib/observability/types";

const gzipAsync = promisify(gzip);

export type ObservabilityChannel = "browser" | "server" | "analyzer";

type AppendObservabilityEventParams = {
  rootDir: string;
  channel: ObservabilityChannel;
  event: ObservabilityEvent;
  rotateBytes: number;
  retentionDays: number;
  now?: Date;
};

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function pickTargetFilePath(params: {
  dirPath: string;
  channel: ObservabilityChannel;
  rotateBytes: number;
  nextLineBytes: number;
}) {
  const files = await fs.readdir(params.dirPath).catch(() => []);
  const candidates = files
    .map((fileName) => {
      const match = fileName.match(
        new RegExp(`^${params.channel}(?:\\.(\\d{3}))?\\.ndjson$`),
      );
      if (!match) return null;
      return {
        fileName,
        index: match[1] ? Number.parseInt(match[1], 10) : 0,
      };
    })
    .filter(Boolean)
    .sort((left, right) => (left?.index ?? 0) - (right?.index ?? 0));

  if (candidates.length === 0) {
    return path.join(params.dirPath, `${params.channel}.ndjson`);
  }

  const current = candidates.at(-1)!;
  const currentPath = path.join(params.dirPath, current.fileName);
  const currentStat = await fs.stat(currentPath);
  if (currentStat.size + params.nextLineBytes <= params.rotateBytes) {
    return currentPath;
  }

  const nextIndex = current.index + 1;
  return path.join(
    params.dirPath,
    `${params.channel}.${String(nextIndex).padStart(3, "0")}.ndjson`,
  );
}

async function compressExpiredDay(dirPath: string) {
  const files = await fs.readdir(dirPath);
  await Promise.all(
    files
      .filter((fileName) => fileName.endsWith(".ndjson"))
      .map(async (fileName) => {
        const sourcePath = path.join(dirPath, fileName);
        const targetPath = `${sourcePath}.gz`;
        if (await pathExists(targetPath)) {
          await fs.rm(sourcePath, { force: true });
          return;
        }
        const compressed = await gzipAsync(await fs.readFile(sourcePath));
        await fs.writeFile(targetPath, compressed);
        await fs.rm(sourcePath, { force: true });
      }),
  );
}

async function runMaintenance(rootDir: string, retentionDays: number, now: Date) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true }).catch(() => []);
  const todayKey = getDateKey(now);
  const retentionThreshold = new Date(now);
  retentionThreshold.setDate(retentionThreshold.getDate() - retentionDays);
  const retentionKey = getDateKey(retentionThreshold);

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const dirName = entry.name;
        const dirPath = path.join(rootDir, dirName);
        if (dirName < retentionKey) {
          await fs.rm(dirPath, { recursive: true, force: true });
          return;
        }
        if (dirName !== todayKey) {
          await compressExpiredDay(dirPath);
        }
      }),
  );
}

export async function appendObservabilityEvent({
  rootDir,
  channel,
  event,
  rotateBytes,
  retentionDays,
  now = new Date(),
}: AppendObservabilityEventParams) {
  const dateKey = getDateKey(now);
  const dirPath = path.join(rootDir, dateKey);
  await fs.mkdir(dirPath, { recursive: true });
  const line = `${JSON.stringify(event)}\n`;
  const targetPath = await pickTargetFilePath({
    dirPath,
    channel,
    rotateBytes,
    nextLineBytes: Buffer.byteLength(line),
  });

  await fs.appendFile(targetPath, line, "utf8");
  await runMaintenance(rootDir, retentionDays, now);
}

export async function readRecentObservabilityEvents(params: {
  rootDir: string;
  maxEvents: number;
}) {
  const entries = await fs.readdir(params.rootDir, { withFileTypes: true }).catch(() => []);
  const dayDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  const collected: ObservabilityEvent[] = [];

  for (const dayDir of dayDirs) {
    const dirPath = path.join(params.rootDir, dayDir);
    const files = (await fs.readdir(dirPath))
      .filter((fileName) => fileName.endsWith(".ndjson"))
      .sort()
      .reverse();

    for (const fileName of files) {
      const raw = await fs.readFile(path.join(dirPath, fileName), "utf8");
      const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .reverse();

      for (const line of lines) {
        try {
          collected.push(JSON.parse(line) as ObservabilityEvent);
        } catch {
          continue;
        }

        if (collected.length >= params.maxEvents) {
          return collected;
        }
      }
    }
  }

  return collected;
}
