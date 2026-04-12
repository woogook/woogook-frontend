import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { appendObservabilityEvent } from "@/lib/observability/local-file";
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
});
