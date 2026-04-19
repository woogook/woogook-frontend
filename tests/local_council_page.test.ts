import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function resolveWorkspaceAlias(request: string) {
  const candidateBase = path.join(process.cwd(), "src", request.slice(2));
  const candidates = [
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}.js`,
    `${candidateBase}.jsx`,
    path.join(candidateBase, "index.ts"),
    path.join(candidateBase, "index.tsx"),
    path.join(candidateBase, "index.js"),
    path.join(candidateBase, "index.jsx"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

function loadLocalCouncilPageModule() {
  const runtimeRequire = createRequire(__filename);
  const moduleLoader = Module as typeof Module & {
    _resolveFilename: (
      request: string,
      parent: unknown,
      isMain: boolean,
      options: unknown,
    ) => string;
    _load: (request: string, parent: unknown, isMain: boolean) => unknown;
  };
  const originalResolveFilename = moduleLoader._resolveFilename;
  const originalLoad = moduleLoader._load;

  moduleLoader._resolveFilename = (request, parent, isMain, options) => {
    if (request.startsWith("@/")) {
      return resolveWorkspaceAlias(request);
    }

    return originalResolveFilename(request, parent, isMain, options);
  };
  moduleLoader._load = (request, parent, isMain) => {
    if (request === "next/link") {
      return ({ children }: { children?: unknown }) => children ?? null;
    }
    if (request === "@/lib/api-client") {
      return {
        buildLocalCouncilRosterScreenResult: () => null,
        fetchLocalCouncilPerson: async () => null,
        fetchLocalCouncilResolve: async () => null,
        mergeLocalCouncilDataSources: () => "backend",
      };
    }
    if (
      request === "@/features/local-council/components/LocalCouncilAddressStep" ||
      request === "@/features/local-council/components/LocalCouncilPersonDetailView" ||
      request === "@/features/local-council/components/LocalCouncilRosterView"
    ) {
      return () => null;
    }

    return originalLoad(request, parent, isMain);
  };

  try {
    const modulePath = runtimeRequire.resolve("../src/features/local-council/LocalCouncilPage");
    delete runtimeRequire.cache[modulePath];
    return runtimeRequire(modulePath) as typeof import("../src/features/local-council/LocalCouncilPage");
  } finally {
    moduleLoader._resolveFilename = originalResolveFilename;
    moduleLoader._load = originalLoad;
  }
}

test("canUseLocalCouncilHistoryBack only returns true for prior in-app local-council entries", () => {
  const { canUseLocalCouncilHistoryBack } = loadLocalCouncilPageModule();

  assert.equal(
    canUseLocalCouncilHistoryBack({ view: "detail", localCouncilHistoryDepth: 0 }, 2),
    false,
  );
  assert.equal(
    canUseLocalCouncilHistoryBack({ view: "detail", localCouncilHistoryDepth: 1 }, 2),
    true,
  );
  assert.equal(
    canUseLocalCouncilHistoryBack({ view: "detail", localCouncilHistoryDepth: 1 }, 1),
    false,
  );
  assert.equal(
    canUseLocalCouncilHistoryBack({ localCouncilHistoryDepth: 1 }, 2),
    false,
  );
});
