import {
  assertOk,
  buildBrowserErrorBatch,
  formatCorrelationIdLine,
  getFrontendBaseUrl,
  getSyntheticEmitAttempts,
  getSyntheticEmitDelayMs,
  postJson,
  sleep,
} from "./runtime.mjs";

async function main() {
  const frontendBaseUrl = getFrontendBaseUrl();
  const url = new URL("/api/observability/browser-events", frontendBaseUrl);
  const attempts = getSyntheticEmitAttempts();
  const delayMs = getSyntheticEmitDelayMs();
  let responsePayload = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const payload = buildBrowserErrorBatch({
      correlationId: `synthetic-browser-correlation-${attempt}`,
      userAction: `synthetic-browser-error-${attempt}`,
      errorMessage: `Synthetic browser error for alert verification (${attempt}/${attempts})`,
    });
    const { response, payload: currentPayload } = await postJson(url, payload);
    assertOk(response, "Browser event ingest");
    responsePayload = currentPayload;

    if (attempt < attempts) {
      await sleep(delayMs);
    }
  }

  console.log("synthetic browser error emitted");
  console.log(`- target: ${url.toString()}`);
  console.log(`- attempts: ${attempts}`);
  console.log(`- accepted: ${responsePayload?.accepted ?? "unknown"}`);
  console.log(formatCorrelationIdLine(responsePayload?.correlation_id));
  console.log(
    "- 사용 시점: 같은 event를 Grafana, Loki, local log file에서 추적할 때만 사용",
  );
}

main().catch((error) => {
  console.error("[observability:emit-browser-error]", error);
  process.exitCode = 1;
});
