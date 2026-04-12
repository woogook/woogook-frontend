import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

type GlobalWithObservabilityMetrics = typeof globalThis & {
  observabilityMetricsRegistry?: Registry;
  observabilityRequestTotal?: Counter<string>;
  observabilityRequestDuration?: Histogram<string>;
  observabilityBrowserEventTotal?: Counter<string>;
};

const globalForMetrics = globalThis as GlobalWithObservabilityMetrics;

export const metricsRegistry =
  globalForMetrics.observabilityMetricsRegistry ?? new Registry();

if (!globalForMetrics.observabilityMetricsRegistry) {
  collectDefaultMetrics({ register: metricsRegistry });
  globalForMetrics.observabilityMetricsRegistry = metricsRegistry;
}

export const requestTotal =
  globalForMetrics.observabilityRequestTotal ??
  new Counter({
    name: "woogook_frontend_request_total",
    help: "Count of observed frontend API requests",
    labelNames: ["route", "method", "status"] as const,
    registers: [metricsRegistry],
  });

export const requestDuration =
  globalForMetrics.observabilityRequestDuration ??
  new Histogram({
    name: "woogook_frontend_request_duration_seconds",
    help: "Observed request duration for frontend API routes",
    labelNames: ["route", "method", "status"] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [metricsRegistry],
  });

export const browserEventTotal =
  globalForMetrics.observabilityBrowserEventTotal ??
  new Counter({
    name: "woogook_frontend_browser_event_total",
    help: "Count of browser observability events accepted by the frontend ingest route",
    labelNames: ["signal_type", "level"] as const,
    registers: [metricsRegistry],
  });

globalForMetrics.observabilityRequestTotal = requestTotal;
globalForMetrics.observabilityRequestDuration = requestDuration;
globalForMetrics.observabilityBrowserEventTotal = browserEventTotal;

export function recordRequestMetric(params: {
  route: string;
  method: string;
  status: number;
  durationMs: number;
}) {
  const labels = {
    route: params.route,
    method: params.method,
    status: String(params.status),
  };

  requestTotal.inc(labels);
  requestDuration.observe(labels, params.durationMs / 1000);
}

export function recordBrowserEventMetric(params: {
  signalType: "browser_error" | "browser_event";
  level: "debug" | "info" | "warn" | "error";
}) {
  browserEventTotal.inc({
    signal_type: params.signalType,
    level: params.level,
  });
}
