import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  appendObservabilityEvent,
  readRecentObservabilityEvents,
} from "@/lib/observability/local-file";
import type { ObservabilityEvent } from "@/lib/observability/types";

const tempDirs: string[] = [];

function buildEvent(message: string): ObservabilityEvent {
  return {
    timestamp: "2026-04-12T12:00:00.000Z",
    level: "error",
    signalType: "server_error",
    service: "woogook-frontend",
    component: "next-api",
    environment: "local",
    release: "test-release",
    errorMessage: message,
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("appendObservabilityEvent", () => {
  it("rolls over to the next suffix when the file exceeds rotateBytes", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "observability-"));
    tempDirs.push(rootDir);

    await appendObservabilityEvent({
      rootDir,
      channel: "server",
      event: buildEvent("a".repeat(200)),
      rotateBytes: 180,
      retentionDays: 14,
      now: new Date("2026-04-12T12:00:00.000Z"),
    });

    await appendObservabilityEvent({
      rootDir,
      channel: "server",
      event: buildEvent("b".repeat(200)),
      rotateBytes: 180,
      retentionDays: 14,
      now: new Date("2026-04-12T12:01:00.000Z"),
    });

    const files = await fs.readdir(path.join(rootDir, "2026-04-12"));
    expect(files.sort()).toEqual(["server.001.ndjson", "server.ndjson"]);
  });

  it("does not rerun maintenance on every append inside the same maintenance window", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "observability-"));
    tempDirs.push(rootDir);

    await fs.mkdir(path.join(rootDir, "2026-04-11"), { recursive: true });
    await fs.writeFile(
      path.join(rootDir, "2026-04-11", "server.ndjson"),
      `${JSON.stringify(buildEvent("stale-before-first-append"))}\n`,
      "utf8",
    );

    await appendObservabilityEvent({
      rootDir,
      channel: "server",
      event: buildEvent("first append"),
      rotateBytes: 1_024,
      retentionDays: 14,
      now: new Date("2026-04-12T12:00:00.000Z"),
    });

    await fs.mkdir(path.join(rootDir, "2026-04-10"), { recursive: true });
    await fs.writeFile(
      path.join(rootDir, "2026-04-10", "server.ndjson"),
      `${JSON.stringify(buildEvent("stale-after-first-append"))}\n`,
      "utf8",
    );

    await appendObservabilityEvent({
      rootDir,
      channel: "server",
      event: buildEvent("second append"),
      rotateBytes: 1_024,
      retentionDays: 14,
      now: new Date("2026-04-12T12:01:00.000Z"),
    });

    await expect(
      fs.access(path.join(rootDir, "2026-04-10", "server.ndjson")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(rootDir, "2026-04-10", "server.ndjson.gz")),
    ).rejects.toThrow();
  });

  it("runs maintenance again after the maintenance window elapses", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "observability-"));
    tempDirs.push(rootDir);

    await appendObservabilityEvent({
      rootDir,
      channel: "server",
      event: buildEvent("first append"),
      rotateBytes: 1_024,
      retentionDays: 14,
      now: new Date("2026-04-12T12:00:00.000Z"),
    });

    await fs.mkdir(path.join(rootDir, "2026-04-10"), { recursive: true });
    await fs.writeFile(
      path.join(rootDir, "2026-04-10", "server.ndjson"),
      `${JSON.stringify(buildEvent("stale-after-window"))}\n`,
      "utf8",
    );

    await appendObservabilityEvent({
      rootDir,
      channel: "server",
      event: buildEvent("second append"),
      rotateBytes: 1_024,
      retentionDays: 14,
      now: new Date("2026-04-12T12:10:00.000Z"),
    });

    await expect(
      fs.access(path.join(rootDir, "2026-04-10", "server.ndjson.gz")),
    ).resolves.toBeUndefined();
  });

  it("reuses the active file metadata for repeated appends in the same day", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "observability-"));
    tempDirs.push(rootDir);
    const dayDir = path.join(rootDir, "2026-04-12");
    const activeFile = path.join(dayDir, "server.ndjson");
    const readdirSpy = vi.spyOn(fs, "readdir");
    const statSpy = vi.spyOn(fs, "stat");

    await appendObservabilityEvent({
      rootDir,
      channel: "server",
      event: buildEvent("first append"),
      rotateBytes: 1_024,
      retentionDays: 14,
      now: new Date("2026-04-12T12:00:00.000Z"),
    });

    await appendObservabilityEvent({
      rootDir,
      channel: "server",
      event: buildEvent("second append"),
      rotateBytes: 1_024,
      retentionDays: 14,
      now: new Date("2026-04-12T12:00:30.000Z"),
    });

    expect(
      readdirSpy.mock.calls.filter(([target]) => target === dayDir),
    ).toHaveLength(1);
    expect(
      statSpy.mock.calls.filter(([target]) => target === activeFile),
    ).toHaveLength(0);
  });
});

describe("readRecentObservabilityEvents", () => {
  it("returns the newest events without loading the whole file through fs.readFile", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "observability-"));
    tempDirs.push(rootDir);
    const dayDir = path.join(rootDir, "2026-04-12");
    const targetFile = path.join(dayDir, "server.ndjson");
    await fs.mkdir(dayDir, { recursive: true });
    await fs.writeFile(
      targetFile,
      Array.from({ length: 120 }, (_, index) =>
        JSON.stringify(buildEvent(`event-${index}`)),
      ).join("\n"),
      "utf8",
    );

    const originalReadFile = fs.readFile.bind(fs);
    vi.spyOn(fs, "readFile").mockImplementation(
      (async (file, options) => {
        if (file === targetFile) {
          throw new Error("full file read is not allowed");
        }
        return originalReadFile(file, options as BufferEncoding | undefined);
      }) as typeof fs.readFile,
    );

    const events = await readRecentObservabilityEvents({
      rootDir,
      maxEvents: 3,
    });

    expect(events.map((event) => event.errorMessage)).toEqual([
      "event-119",
      "event-118",
      "event-117",
    ]);
  });
});
