import {
  buildSyntheticFailUrl,
  formatCorrelationIdLine,
  getFrontendBaseUrl,
  getSyntheticEmitAttempts,
  getSyntheticEmitDelayMs,
  sleep,
} from "./runtime.mjs";

async function main() {
  const frontendBaseUrl = getFrontendBaseUrl();
  const attempts = getSyntheticEmitAttempts();
  const delayMs = getSyntheticEmitDelayMs();
  let lastTarget = "";
  let lastStatus = 0;
  let lastPayload = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const target = buildSyntheticFailUrl(frontendBaseUrl, 503, {
      reason: `synthetic-api-5xx-alert-test-${attempt}`,
    });
    const response = await fetch(target, { cache: "no-store" });
    const payload = await response.json().catch(() => null);

    if (response.status < 500 || response.status > 599) {
      throw new Error(
        `Synthetic fail route returned ${response.status}, expected a 5xx response`,
      );
    }

    lastTarget = target;
    lastStatus = response.status;
    lastPayload = payload;

    if (attempt < attempts) {
      await sleep(delayMs);
    }
  }

  console.log("synthetic api 5xx emitted");
  console.log(`- target: ${lastTarget}`);
  console.log(`- attempts: ${attempts}`);
  console.log(`- status: ${lastStatus}`);
  console.log(formatCorrelationIdLine(lastPayload?.correlation_id));
  console.log(
    "- 사용 시점: 같은 event를 Grafana, Loki, local log file에서 추적할 때만 사용",
  );
}

main().catch((error) => {
  console.error("[observability:emit-api-5xx]", error);
  process.exitCode = 1;
});
