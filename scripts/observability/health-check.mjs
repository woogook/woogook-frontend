import {
  getGrafanaBaseUrl,
  getFrontendBaseUrl,
  getHealthcheckRetryAttempts,
  getHealthcheckRetryDelayMs,
  getLokiBaseUrl,
  getPrometheusBaseUrl,
  waitForOk,
} from "./runtime.mjs";

async function main() {
  const frontendBaseUrl = getFrontendBaseUrl();
  const grafanaBaseUrl = getGrafanaBaseUrl();
  const lokiBaseUrl = getLokiBaseUrl();
  const prometheusBaseUrl = getPrometheusBaseUrl();
  const attempts = getHealthcheckRetryAttempts();
  const delayMs = getHealthcheckRetryDelayMs();

  await waitForOk(new URL("/ready", lokiBaseUrl), "Loki readiness", {
    attempts,
    delayMs,
  });
  await waitForOk(new URL("/-/ready", prometheusBaseUrl), "Prometheus readiness", {
    attempts,
    delayMs,
  });
  await waitForOk(new URL("/api/health", grafanaBaseUrl), "Grafana health", {
    attempts,
    delayMs,
  });
  const metricsResponse = await waitForOk(
    new URL("/api/observability/metrics", frontendBaseUrl),
    "Frontend metrics endpoint",
    {
      attempts,
      delayMs,
    },
  );
  const metricsText = await metricsResponse.text();
  if (!metricsText.includes("woogook_frontend_request_total")) {
    throw new Error("Frontend metrics endpoint did not expose expected metrics");
  }

  console.log("observability health check ok");
  console.log(`- frontend: ${frontendBaseUrl}`);
  console.log(`- grafana: ${grafanaBaseUrl}`);
  console.log(`- loki: ${lokiBaseUrl}`);
  console.log(`- prometheus: ${prometheusBaseUrl}`);
}

main().catch((error) => {
  console.error("[observability:health-check]", error);
  process.exitCode = 1;
});
