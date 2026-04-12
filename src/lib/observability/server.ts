import { NextResponse } from "next/server";

import {
  appendObservabilityEvent,
  type ObservabilityChannel,
} from "@/lib/observability/local-file";
import {
  parseObservabilityConfig,
  type ObservabilityConfig,
} from "@/lib/observability/config";
import { getOrCreateCorrelationId } from "@/lib/observability/correlation";
import { applyBasicAuth, fetchWithTimeout } from "@/lib/observability/http";
import { recordRequestMetric } from "@/lib/observability/metrics";
import type {
  ObservabilityComponent,
  ObservabilityEvent,
  ObservabilityLevel,
  ObservabilitySignalType,
} from "@/lib/observability/types";

type LokiPayload = {
  streams: Array<{
    stream: Record<string, string>;
    values: [[string, string]];
  }>;
};

function toNanoTimestamp(isoTimestamp: string) {
  return `${Date.parse(isoTimestamp) * 1_000_000}`;
}

export function buildLokiPayload(event: ObservabilityEvent): LokiPayload {
  return {
    streams: [
      {
        stream: {
          service: event.service,
          component: event.component,
          environment: event.environment,
          level: event.level,
          signal_type: event.signalType,
        },
        values: [[toNanoTimestamp(event.timestamp), JSON.stringify(event)]],
      },
    ],
  };
}

export function shouldSendEventToCloud(
  config: ObservabilityConfig,
  event: ObservabilityEvent,
) {
  if (!config.lokiPushUrl) return false;
  if (config.environment === "local" && !config.mirrorToCloudInLocal) return false;
  if (event.level === "debug") return false;
  if (event.level === "info" && event.signalType === "server_request") return false;
  if (event.level === "info" && event.signalType === "browser_event") return false;
  return true;
}

export async function sendEventToLoki(
  config: ObservabilityConfig,
  event: ObservabilityEvent,
) {
  if (!shouldSendEventToCloud(config, event)) {
    return;
  }

  const headers = new Headers({
    "Content-Type": "application/json",
  });

  applyBasicAuth(headers, config.lokiUsername, config.lokiPassword);

  await fetchWithTimeout(config.lokiPushUrl!, {
    method: "POST",
    headers,
    body: JSON.stringify(buildLokiPayload(event)),
    cache: "no-store",
  }, config.outboundTimeoutMs);
}

type LogServerEventParams = {
  channel?: ObservabilityChannel;
  config?: ObservabilityConfig;
  timestamp?: string;
  level: ObservabilityLevel;
  signalType: ObservabilitySignalType;
  component: ObservabilityComponent;
  route?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
  userAction?: string;
  errorName?: string;
  errorMessage?: string;
  stack?: string;
  httpMethod?: string;
  httpStatus?: number;
  latencyMs?: number;
  tags?: string[];
  context?: Record<string, unknown>;
};

export async function logServerEvent({
  channel = "server",
  config = parseObservabilityConfig(),
  timestamp,
  ...params
}: LogServerEventParams) {
  const event: ObservabilityEvent = {
    timestamp: timestamp ?? new Date().toISOString(),
    service: "woogook-frontend",
    environment: config.environment,
    release: config.release,
    ...params,
  };

  if (config.writeLocalFiles) {
    await appendObservabilityEvent({
      rootDir: config.localRootDir,
      channel,
      event,
      rotateBytes: config.rotateBytes,
      retentionDays: config.retentionDays,
    });
  }

  try {
    await sendEventToLoki(config, event);
  } catch (error) {
    console.error("[observability/loki] failed to send event", error);
  }

  return event;
}

export type ObservedRouteContext = {
  config: ObservabilityConfig;
  requestId: string;
  correlationId: string;
  routeName: string;
};

export async function observeRoute(
  request: Request,
  routeName: string,
  handler: (context: ObservedRouteContext) => Promise<Response>,
) {
  const config = parseObservabilityConfig();
  const requestId = crypto.randomUUID();
  const correlationId = getOrCreateCorrelationId(new Headers(request.headers));
  const startedAt = Date.now();

  try {
    const response = await handler({
      config,
      requestId,
      correlationId,
      routeName,
    });
    const status = response.status;
    const durationMs = Date.now() - startedAt;

    recordRequestMetric({
      route: routeName,
      method: request.method,
      status,
      durationMs,
    });
    await logServerEvent({
      config,
      level: "info",
      signalType: "server_request",
      component: "next-api",
      route: routeName,
      requestId,
      correlationId,
      httpMethod: request.method,
      httpStatus: status,
      latencyMs: durationMs,
      tags: ["route-observed"],
    });

    response.headers.set("x-correlation-id", correlationId);
    return response;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    recordRequestMetric({
      route: routeName,
      method: request.method,
      status: 500,
      durationMs,
    });
    await logServerEvent({
      config,
      level: "error",
      signalType: "server_error",
      component: "next-api",
      route: routeName,
      requestId,
      correlationId,
      httpMethod: request.method,
      httpStatus: 500,
      latencyMs: durationMs,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage:
        error instanceof Error ? error.message : "Unexpected route failure",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Unhandled frontend observability route error",
        message: "요청을 처리하는 중 예상하지 못한 오류가 발생했습니다.",
      },
      {
        status: 500,
        headers: { "x-correlation-id": correlationId },
      },
    );
  }
}
