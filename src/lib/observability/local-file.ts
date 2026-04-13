import fs from "node:fs/promises";
import path from "node:path";
import { gzip } from "node:zlib";
import { promisify } from "node:util";

import type { ObservabilityEvent } from "@/lib/observability/types";

const gzipAsync = promisify(gzip);
const MAINTENANCE_INTERVAL_MS = 5 * 60 * 1000;
const READ_CHUNK_BYTES = 64 * 1024;

export type ObservabilityChannel = "browser" | "server" | "analyzer";

type AppendObservabilityEventParams = {
  rootDir: string;
  channel: ObservabilityChannel;
  event: ObservabilityEvent;
  rotateBytes: number;
  retentionDays: number;
  now?: Date;
};

type MaintenanceState = {
  lastCompletedAt?: number;
  inFlight?: Promise<void>;
};

type ActiveFileState = {
  filePath: string;
  size: number;
};

const maintenanceStateByRoot = new Map<string, MaintenanceState>();
const activeFileStateByKey = new Map<string, ActiveFileState>();
const appendQueueByKey = new Map<string, Promise<void>>();

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
  const cacheKey = `${params.dirPath}:${params.channel}`;
  const cached = activeFileStateByKey.get(cacheKey);
  if (cached) {
    if (cached.size + params.nextLineBytes <= params.rotateBytes) {
      return cached;
    }

    const match = path.basename(cached.filePath).match(
      new RegExp(`^${params.channel}(?:\\.(\\d{3}))?\\.ndjson$`),
    );
    const nextIndex = (match?.[1] ? Number.parseInt(match[1], 10) : 0) + 1;
    return {
      filePath: path.join(
        params.dirPath,
        `${params.channel}.${String(nextIndex).padStart(3, "0")}.ndjson`,
      ),
      size: 0,
    };
  }

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
    return {
      filePath: path.join(params.dirPath, `${params.channel}.ndjson`),
      size: 0,
    };
  }

  const current = candidates.at(-1)!;
  const currentPath = path.join(params.dirPath, current.fileName);
  const currentStat = await fs.stat(currentPath);
  if (currentStat.size + params.nextLineBytes <= params.rotateBytes) {
    return {
      filePath: currentPath,
      size: currentStat.size,
    };
  }

  const nextIndex = current.index + 1;
  return {
    filePath: path.join(
      params.dirPath,
      `${params.channel}.${String(nextIndex).padStart(3, "0")}.ndjson`,
    ),
    size: 0,
  };
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

async function maybeRunMaintenance(
  rootDir: string,
  retentionDays: number,
  now: Date,
) {
  const nowMs = now.getTime();
  const existingState = maintenanceStateByRoot.get(rootDir);
  if (existingState?.inFlight) {
    await existingState.inFlight;
    return;
  }
  if (
    existingState?.lastCompletedAt != null &&
    nowMs - existingState.lastCompletedAt < MAINTENANCE_INTERVAL_MS
  ) {
    return;
  }

  const inFlight = runMaintenance(rootDir, retentionDays, now);
  maintenanceStateByRoot.set(rootDir, {
    lastCompletedAt: existingState?.lastCompletedAt,
    inFlight,
  });

  try {
    await inFlight;
    maintenanceStateByRoot.set(rootDir, {
      lastCompletedAt: nowMs,
    });
  } catch (error) {
    maintenanceStateByRoot.delete(rootDir);
    throw error;
  }
}

async function withAppendQueue<T>(key: string, task: () => Promise<T>) {
  const previous = appendQueueByKey.get(key) ?? Promise.resolve();
  const current = previous.then(task, task);
  const settled = current.then(
    () => undefined,
    () => undefined,
  );
  appendQueueByKey.set(key, settled);

  try {
    return await current;
  } finally {
    if (appendQueueByKey.get(key) === settled) {
      appendQueueByKey.delete(key);
    }
  }
}

async function readRecentLines(filePath: string, maxLines: number) {
  const handle = await fs.open(filePath, "r");

  try {
    const { size } = await handle.stat();
    let cursor = size;
    let remainder = "";
    const lines: string[] = [];

    while (cursor > 0 && lines.length < maxLines) {
      const bytesToRead = Math.min(READ_CHUNK_BYTES, cursor);
      const nextCursor = cursor - bytesToRead;
      const buffer = Buffer.alloc(bytesToRead);
      const { bytesRead } = await handle.read(buffer, 0, bytesToRead, nextCursor);
      const chunk = buffer.toString("utf8", 0, bytesRead);
      const parts = `${chunk}${remainder}`.split(/\r?\n/);
      remainder = parts.shift() ?? "";

      for (let index = parts.length - 1; index >= 0; index -= 1) {
        const line = parts[index]?.trim();
        if (!line) {
          continue;
        }

        lines.push(line);
        if (lines.length >= maxLines) {
          return lines;
        }
      }

      cursor = nextCursor;
    }

    const trailingLine = remainder.trim();
    if (trailingLine) {
      lines.push(trailingLine);
    }

    return lines;
  } finally {
    await handle.close();
  }
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
  const lineBytes = Buffer.byteLength(line);
  const cacheKey = `${dirPath}:${channel}`;

  await withAppendQueue(cacheKey, async () => {
    const target = await pickTargetFilePath({
      dirPath,
      channel,
      rotateBytes,
      nextLineBytes: lineBytes,
    });

    await fs.appendFile(target.filePath, line, "utf8");
    activeFileStateByKey.set(cacheKey, {
      filePath: target.filePath,
      size: target.size + lineBytes,
    });
  });
  await maybeRunMaintenance(rootDir, retentionDays, now);
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
      const lines = await readRecentLines(
        path.join(dirPath, fileName),
        params.maxEvents - collected.length,
      );

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
