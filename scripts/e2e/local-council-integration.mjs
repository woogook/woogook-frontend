import { once } from "node:events";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { spawn } from "node:child_process";

import pg from "pg";
import {
  assertPortAvailable,
  getBackendConfig,
  getDatabaseConfig,
  getHealthRetryConfig,
} from "./local-council-harness.mjs";

const { Client } = pg;

const LOG_PREFIX = "[local-council:e2e]";
const POSTGRES_SERVICE = "postgres";

const FIXTURE = {
  contestId: "e2e-local-council-gangdong-basic",
  guCode: "11740",
  guName: "강동구",
  guSlug: "gangdong-gu",
  districtSlug: "seoul-gangdong",
  districtName: "서울특별시 강동구",
  cityName: "서울특별시",
  sigunguName: "강동구",
  emdName: "천호동",
  districtHeadPersonKey: "e2e:local-council:district-head",
  councilMemberPersonKey: "e2e:local-council:council-member:1",
  districtHeadName: "통합테스트 구청장",
  councilMemberName: "통합테스트 구의원",
  partyName: "통합테스트당",
  builtAt: "2026-04-14T09:00:00+09:00",
  basisTimestamp: "2026-04-14T09:00:00+09:00",
};

function log(message) {
  console.log(`${LOG_PREFIX} ${message}`);
}

function toAbsolutePath(pathLike) {
  return resolve(process.cwd(), pathLike);
}

function resolveBackendRoot() {
  const override = process.env.PLAYWRIGHT_LOCAL_COUNCIL_BACKEND_REPO?.trim();
  const candidates = [
    override,
    "../woogook-backend",
    "../../woogook-backend",
    "../../../woogook-backend",
  ]
    .filter(Boolean)
    .map((candidate) => toAbsolutePath(candidate));

  for (const candidate of candidates) {
    if (
      existsSync(join(candidate, "pyproject.toml")) &&
      existsSync(join(candidate, "docker-compose.yml"))
    ) {
      return candidate;
    }
  }

  throw new Error(
    [
      "woogook-backend 저장소를 찾지 못했습니다.",
      "기본 탐색 경로:",
      ...candidates.map((candidate) => `- ${candidate}`),
      "필요하면 PLAYWRIGHT_LOCAL_COUNCIL_BACKEND_REPO로 경로를 직접 지정하세요.",
    ].join("\n"),
  );
}

function createEnv(overrides) {
  return {
    ...process.env,
    ...overrides,
  };
}

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function getClientConfig(databaseConfig, databaseName = databaseConfig.database) {
  return {
    host: databaseConfig.host,
    port: databaseConfig.port,
    database: databaseName,
    user: databaseConfig.user,
    password: databaseConfig.password,
  };
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function runCommand(command, args, options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    captureOutput = false,
    allowFailure = false,
  } = options;

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    if (captureOutput) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    const settle = (callback) => {
      if (settled) {
        return;
      }
      settled = true;
      callback();
    };

    child.on("error", (error) => {
      settle(() => {
        rejectPromise(
          new Error(
            [
              `명령 실행에 실패했습니다: ${command} ${args.join(" ")}`,
              `cwd: ${cwd}`,
              `spawn error: ${error.message}`,
              captureOutput && stdout ? `stdout:\n${stdout.trim()}` : null,
              captureOutput && stderr ? `stderr:\n${stderr.trim()}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
            { cause: error },
          ),
        );
      });
    });

    child.on("close", (code, signal) => {
      settle(() => {
        if (code === 0 || allowFailure) {
          resolvePromise({
            code,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
          });
          return;
        }

        rejectPromise(
          new Error(
            [
              `명령 실행에 실패했습니다: ${command} ${args.join(" ")}`,
              `cwd: ${cwd}`,
              signal ? `signal: ${signal}` : null,
              captureOutput && stdout ? `stdout:\n${stdout.trim()}` : null,
              captureOutput && stderr ? `stderr:\n${stderr.trim()}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
        );
      });
    });
  });
}

async function isComposeServiceRunning(backendRoot, serviceName) {
  const result = await runCommand(
    "docker",
    ["compose", "ps", "--services", "--status", "running"],
    {
      cwd: backendRoot,
      captureOutput: true,
      allowFailure: true,
    },
  );

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .includes(serviceName);
}

async function waitForOk(url, label, options = {}) {
  const { attempts, delayMs } = {
    ...getHealthRetryConfig(),
    ...options,
  };

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    options.beforeAttempt?.();
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        return response;
      }
    } catch {}

    await delay(delayMs);
  }

  throw new Error(`${label} 확인에 실패했습니다: ${url}`);
}

async function recreateIsolatedDatabase(databaseConfig) {
  const adminClient = new Client(
    getClientConfig(databaseConfig, databaseConfig.adminDatabase),
  );
  const quotedDatabaseName = quoteIdentifier(databaseConfig.database);

  await adminClient.connect();

  try {
    await adminClient.query(
      `
        select pg_terminate_backend(pid)
        from pg_stat_activity
        where datname = $1
          and pid <> pg_backend_pid();
      `,
      [databaseConfig.database],
    );
    await adminClient.query(`drop database if exists ${quotedDatabaseName}`);
    await adminClient.query(
      `create database ${quotedDatabaseName} template template0`,
    );
  } finally {
    await adminClient.end();
  }
}

async function dropIsolatedDatabase(databaseConfig) {
  const adminClient = new Client(
    getClientConfig(databaseConfig, databaseConfig.adminDatabase),
  );
  const quotedDatabaseName = quoteIdentifier(databaseConfig.database);

  await adminClient.connect();

  try {
    await adminClient.query(
      `
        select pg_terminate_backend(pid)
        from pg_stat_activity
        where datname = $1
          and pid <> pg_backend_pid();
      `,
      [databaseConfig.database],
    );
    await adminClient.query(`drop database if exists ${quotedDatabaseName}`);
  } finally {
    await adminClient.end();
  }
}

async function waitForDatabase(databaseConfig, options = {}) {
  const { attempts, delayMs } = {
    ...getHealthRetryConfig(),
    ...options,
  };

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const client = new Client(getClientConfig(databaseConfig));

    try {
      await client.connect();
      await client.query("select 1");
      return;
    } catch {
      await delay(delayMs);
    } finally {
      await client.end().catch(() => {});
    }
  }

  throw new Error("postgres 연결 확인에 실패했습니다.");
}

async function seedIntegrationFixture(databaseConfig) {
  const client = new Client(getClientConfig(databaseConfig));

  await client.connect();

  const districtHeadPayload = {
    person_key: FIXTURE.districtHeadPersonKey,
    office_type: "basic_head",
    person_name: FIXTURE.districtHeadName,
    party_name: FIXTURE.partyName,
    profile_image_url: null,
  };

  const councilMemberPayload = {
    person_key: FIXTURE.councilMemberPersonKey,
    office_type: "basic_council",
    person_name: FIXTURE.councilMemberName,
    party_name: FIXTURE.partyName,
    profile_image_url: null,
  };

  const sourceCoveragePayload = {
    district_head_official_profile: "present",
    district_head_official_activity: "present",
    district_head_finance_activity: "present",
    council_member_elected_basis: "present",
    council_member_official_activity: "present",
  };

  const freshnessPayload = {
    basis_kind: "source_fetched_at",
    basis_timestamp: FIXTURE.basisTimestamp,
    generated_at: FIXTURE.basisTimestamp,
    source_mode: "stored_projection_only",
    is_snapshot_based: false,
    publish_status: "publishable",
    final_publish_status: "publishable",
    agentic_review_status: "pass",
    agentic_enrichment_status: "success",
  };

  const districtHeadSummaryPayload = {
    headline: `${FIXTURE.districtHeadName} 공식 근거 요약`,
    grounded_summary: "통합 테스트용 공식 근거 요약입니다.",
    summary_mode: "agentic",
    summary_basis: {
      source_kinds: ["nec_current_holder", "gangdong_district_head_official_profile"],
    },
    evidence_digest: ["공식 프로필 1건", "회의 활동 1건", "재정 활동 1건"],
  };

  const councilMemberSummaryPayload = {
    headline: `${FIXTURE.councilMemberName} 공식 근거 요약`,
    grounded_summary: "통합 테스트용 구의원 요약입니다.",
    summary_mode: "fallback",
    summary_basis: {
      source_kinds: ["local_council_portal_members", "gangdong_council_official_activity"],
    },
    evidence_digest: ["상임위 1건", "의안 1건", "회의 활동 1건"],
    fallback_reason: "integration_fixture",
  };

  const districtHeadSourceRefs = [
    {
      source_kind: "nec_current_holder",
      role: "elected_basis",
      source_title: "중앙선거관리위원회 당선인정보",
    },
    {
      source_kind: "gangdong_district_head_official_profile",
      role: "official_profile",
      source_title: "강동구청장실",
      source_url: "https://www.gangdong.go.kr",
    },
    {
      source_kind: "local_finance_365",
      role: "finance_activity",
      source_title: "지방재정365",
    },
  ];

  const councilMemberSourceRefs = [
    {
      source_kind: "local_council_portal_members",
      role: "official_profile",
      source_title: "지방의정포털",
    },
    {
      source_kind: "gangdong_council_official_activity",
      role: "official_activity",
      source_title: "강동구의회 의안검색",
    },
    {
      source_kind: "nec_council_elected_basis",
      role: "elected_basis",
      source_title: "중앙선거관리위원회 당선인정보",
    },
  ];

  const districtHeadDossier = {
    personKey: FIXTURE.districtHeadPersonKey,
    officeType: "basic_head",
    personName: FIXTURE.districtHeadName,
    partyName: FIXTURE.partyName,
    summaryPayload: districtHeadSummaryPayload,
    officialProfilePayload: {
      office_label: "강동구청장",
      official_profile_sections: [
        {
          section_title: "소개",
          headline: "통합 테스트용 구청장 프로필",
        },
      ],
    },
    committeesPayload: [],
    billsPayload: [],
    meetingPayload: [
      {
        session_label: "통합 테스트 회의",
        meeting_date: "2026-04-14",
        status: "confirmed",
        confidence: "high",
        severity: "info",
      },
    ],
    financeActivityPayload: [
      {
        title: "통합 테스트 재정 활동",
        amount: 1250000,
        status: "confirmed",
        confidence: "high",
        severity: "info",
      },
    ],
    electedBasisPayload: {
      election_id: "0020220601",
      huboid: "integration-district-head",
    },
    sourceRefsPayload: districtHeadSourceRefs,
    freshnessPayload,
  };

  const councilMemberDossier = {
    personKey: FIXTURE.councilMemberPersonKey,
    officeType: "basic_council",
    personName: FIXTURE.councilMemberName,
    partyName: FIXTURE.partyName,
    summaryPayload: councilMemberSummaryPayload,
    officialProfilePayload: {
      office_label: "강동구의원",
      official_profile_sections: [
        {
          section_title: "프로필",
          headline: "통합 테스트용 구의원 프로필",
        },
      ],
    },
    committeesPayload: [
      {
        committee_name: "행정복지위원회",
        status: "confirmed",
        confidence: "high",
        severity: "info",
      },
    ],
    billsPayload: [
      {
        bill_title: "통합 테스트 조례안",
        proposed_at: "2026-04-14",
        status: "confirmed",
        confidence: "high",
        severity: "info",
      },
    ],
    meetingPayload: [
      {
        session_label: "통합 테스트 임시회",
        meeting_date: "2026-04-14",
        status: "confirmed",
        confidence: "high",
        severity: "info",
      },
    ],
    financeActivityPayload: [],
    electedBasisPayload: {
      election_id: "0020220601",
      huboid: "integration-council-member",
    },
    sourceRefsPayload: councilMemberSourceRefs,
    freshnessPayload,
  };

  try {
    await client.query("BEGIN");

    await client.query(
      `
        insert into gu (gu_code, gu_name, gu_slug)
        values ($1, $2, $3)
        on conflict (gu_code)
        do update
        set gu_name = excluded.gu_name,
            gu_slug = excluded.gu_slug;
      `,
      [FIXTURE.guCode, FIXTURE.guName, FIXTURE.guSlug],
    );

    await client.query(
      `
        insert into local_election_contest (
          contest_id,
          election_id,
          election_code,
          election_name,
          ballot_subject_type,
          office_level,
          representation_type,
          special_region_type,
          geographic_scope,
          city_code,
          city_name_official,
          city_name_canonical,
          city_name_canonical_normalized,
          sigungu_name,
          sigungu_name_normalized,
          display_name,
          parent_area_name,
          seats,
          multi_member,
          source_kind,
          derived_from_rule,
          payload
        )
        values (
          $1,
          '0020220601',
          '0502',
          '제8회 전국동시지방선거',
          'local_council',
          'basic_council',
          'district',
          'none',
          'sigungu',
          11,
          $2,
          $2,
          $2,
          $3,
          $3,
          $4,
          $2,
          1,
          false,
          'integration_e2e_fixture',
          'playwright_local_council_fixture',
          $5::jsonb
        )
        on conflict (contest_id)
        do update
        set election_id = excluded.election_id,
            election_code = excluded.election_code,
            election_name = excluded.election_name,
            ballot_subject_type = excluded.ballot_subject_type,
            office_level = excluded.office_level,
            representation_type = excluded.representation_type,
            special_region_type = excluded.special_region_type,
            geographic_scope = excluded.geographic_scope,
            city_code = excluded.city_code,
            city_name_official = excluded.city_name_official,
            city_name_canonical = excluded.city_name_canonical,
            city_name_canonical_normalized = excluded.city_name_canonical_normalized,
            sigungu_name = excluded.sigungu_name,
            sigungu_name_normalized = excluded.sigungu_name_normalized,
            display_name = excluded.display_name,
            parent_area_name = excluded.parent_area_name,
            seats = excluded.seats,
            multi_member = excluded.multi_member,
            source_kind = excluded.source_kind,
            derived_from_rule = excluded.derived_from_rule,
            payload = excluded.payload;
      `,
      [
        FIXTURE.contestId,
        FIXTURE.cityName,
        FIXTURE.sigunguName,
        FIXTURE.districtName,
        JSON.stringify({ fixture: "playwright-local-council-integration" }),
      ],
    );

    await client.query("delete from local_election_contest_emd where contest_id = $1", [
      FIXTURE.contestId,
    ]);

    await client.query(
      `
        insert into local_election_contest_emd (
          contest_id,
          emd_name,
          emd_name_normalized
        )
        values ($1, $2, $3);
      `,
      [FIXTURE.contestId, FIXTURE.emdName, FIXTURE.emdName],
    );

    await client.query(
      `
        insert into local_council_district_roster (
          gu_code,
          district_slug,
          district_name,
          district_head_person_key,
          district_head_payload,
          council_members_payload,
          source_coverage_payload,
          freshness_payload,
          basis_payload,
          built_at
        )
        values (
          $1,
          $2,
          $3,
          $4,
          $5::jsonb,
          $6::jsonb,
          $7::jsonb,
          $8::jsonb,
          $9::jsonb,
          $10::timestamptz
        )
        on conflict (gu_code)
        do update
        set district_slug = excluded.district_slug,
            district_name = excluded.district_name,
            district_head_person_key = excluded.district_head_person_key,
            district_head_payload = excluded.district_head_payload,
            council_members_payload = excluded.council_members_payload,
            source_coverage_payload = excluded.source_coverage_payload,
            freshness_payload = excluded.freshness_payload,
            basis_payload = excluded.basis_payload,
            built_at = excluded.built_at;
      `,
      [
        FIXTURE.guCode,
        FIXTURE.districtSlug,
        FIXTURE.districtName,
        FIXTURE.districtHeadPersonKey,
        JSON.stringify(districtHeadPayload),
        JSON.stringify([councilMemberPayload]),
        JSON.stringify(sourceCoveragePayload),
        JSON.stringify(freshnessPayload),
        JSON.stringify({
          district_head: { basis_kind: "nec_current_holder" },
          council_members: { source_kind: "local_council_portal_members" },
        }),
        FIXTURE.builtAt,
      ],
    );

    await client.query(
      "delete from local_council_person_dossier where person_key in ($1, $2)",
      [FIXTURE.districtHeadPersonKey, FIXTURE.councilMemberPersonKey],
    );

    for (const dossier of [districtHeadDossier, councilMemberDossier]) {
      await client.query(
        `
          insert into local_council_person_dossier (
            person_key,
            gu_code,
            district_slug,
            office_type,
            member_id,
            person_name,
            party_name,
            profile_image_url,
            summary_payload,
            official_profile_payload,
            committees_payload,
            bills_payload,
            meeting_payload,
            finance_activity_payload,
            elected_basis_payload,
            source_refs_payload,
            freshness_payload,
            data_gap_flags,
            built_at
          )
          values (
            $1,
            $2,
            $3,
            $4,
            null,
            $5,
            $6,
            null,
            $7::jsonb,
            $8::jsonb,
            $9::jsonb,
            $10::jsonb,
            $11::jsonb,
            $12::jsonb,
            $13::jsonb,
            $14::jsonb,
            $15::jsonb,
            $16::jsonb,
            $17::timestamptz
          );
        `,
        [
          dossier.personKey,
          FIXTURE.guCode,
          FIXTURE.districtSlug,
          dossier.officeType,
          dossier.personName,
          dossier.partyName,
          JSON.stringify(dossier.summaryPayload),
          JSON.stringify(dossier.officialProfilePayload),
          JSON.stringify(dossier.committeesPayload),
          JSON.stringify(dossier.billsPayload),
          JSON.stringify(dossier.meetingPayload),
          JSON.stringify(dossier.financeActivityPayload),
          JSON.stringify(dossier.electedBasisPayload),
          JSON.stringify(dossier.sourceRefsPayload),
          JSON.stringify(dossier.freshnessPayload),
          JSON.stringify([]),
          FIXTURE.builtAt,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

function startBackendServer(backendRoot, backendConfig, databaseConfig) {
  const env = createEnv({
    WOOGOOK_DATABASE_URL: databaseConfig.databaseUrl,
  });

  return spawn(
    "uv",
    [
      "run",
      "uvicorn",
      "app.main:app",
      "--host",
      backendConfig.host,
      "--port",
      String(backendConfig.port),
    ],
    {
      cwd: backendRoot,
      env,
      stdio: "inherit",
    },
  );
}

async function terminateProcess(child, label) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");

  try {
    await Promise.race([
      once(child, "exit"),
      delay(5000).then(() => {
        throw new Error("process-exit-timeout");
      }),
    ]);
  } catch {
    child.kill("SIGKILL");
    await once(child, "exit").catch(() => {});
  }

  log(`${label} 종료`);
}

async function main() {
  const backendRoot = resolveBackendRoot();
  const backendConfig = getBackendConfig();
  const databaseConfig = getDatabaseConfig();
  const healthConfig = getHealthRetryConfig();
  const backendHealthUrl = `${backendConfig.baseUrl}/health`;
  const postgresWasRunning = await isComposeServiceRunning(
    backendRoot,
    POSTGRES_SERVICE,
  );

  let backendProcess = null;
  let backendProcessFailure = null;

  log(`backend root: ${backendRoot}`);
  log(
    `database: ${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database}`,
  );
  log(`backend base url: ${backendConfig.baseUrl}`);

  try {
    if (!postgresWasRunning) {
      log("postgres 시작");
    } else {
      log("postgres 재사용");
    }

    await runCommand("docker", ["compose", "up", "-d", POSTGRES_SERVICE], {
      cwd: backendRoot,
    });

    await waitForDatabase(
      {
        ...databaseConfig,
        database: databaseConfig.adminDatabase,
      },
      healthConfig,
    );

    log("격리 integration database 재생성");
    await recreateIsolatedDatabase(databaseConfig);
    await waitForDatabase(databaseConfig, healthConfig);

    log("alembic upgrade head");
    await runCommand("uv", ["run", "alembic", "upgrade", "head"], {
      cwd: backendRoot,
      env: createEnv({
        WOOGOOK_DATABASE_URL: databaseConfig.databaseUrl,
      }),
    });

    log("integration fixture seed");
    await seedIntegrationFixture(databaseConfig);

    await assertPortAvailable({
      host: backendConfig.host,
      port: backendConfig.port,
      label: "backend",
    });

    log("backend 시작");
    backendProcess = startBackendServer(backendRoot, backendConfig, databaseConfig);
    backendProcess.on("error", (error) => {
      backendProcessFailure = new Error(
        `${LOG_PREFIX} backend 시작에 실패했습니다: ${error.message}`,
        { cause: error },
      );
      console.error(backendProcessFailure.message);
    });
    backendProcess.on("exit", (code, signal) => {
      if (signal === "SIGTERM" || signal === "SIGKILL" || code === 143) {
        return;
      }

      if (code !== 0 && code !== null) {
        backendProcessFailure = new Error(
          `${LOG_PREFIX} backend가 비정상 종료했습니다. exit code=${code}, signal=${signal ?? "none"}`,
        );
        console.error(
          `${LOG_PREFIX} backend가 비정상 종료했습니다. exit code=${code}, signal=${signal ?? "none"}`,
        );
      }
    });

    await waitForOk(backendHealthUrl, "backend health", {
      ...healthConfig,
      beforeAttempt: () => {
        if (backendProcessFailure) {
          throw backendProcessFailure;
        }
      },
    });
    if (backendProcessFailure) {
      throw backendProcessFailure;
    }

    log("Playwright integration spec 실행");
    await runCommand(getNpmCommand(), ["run", "e2e:integration:spec"], {
      cwd: process.cwd(),
      env: createEnv({
        PLAYWRIGHT_LOCAL_COUNCIL_INTEGRATION: "1",
        WOOGOOK_BACKEND_BASE_URL: backendConfig.baseUrl,
        PGHOST: databaseConfig.host,
        PGPORT: String(databaseConfig.port),
        PGDATABASE: databaseConfig.database,
        PGUSER: databaseConfig.user,
        PGPASSWORD: databaseConfig.password,
      }),
    });
  } finally {
    await terminateProcess(backendProcess, "backend");

    if (!databaseConfig.preserveDatabase) {
      log("격리 integration database 정리");
      await dropIsolatedDatabase(databaseConfig).catch((error) => {
        console.error(`${LOG_PREFIX} integration database 정리에 실패했습니다.`, error);
      });
    }

    if (!postgresWasRunning) {
      log("postgres 종료");
      await runCommand("docker", ["compose", "stop", POSTGRES_SERVICE], {
        cwd: backendRoot,
        allowFailure: true,
      });
    }
  }
}

main().catch((error) => {
  console.error(`${LOG_PREFIX} 실패`, error);
  process.exitCode = 1;
});
