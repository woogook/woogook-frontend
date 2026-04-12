export type ObservabilityLevel = "debug" | "info" | "warn" | "error";

export type ObservabilitySignalType =
  | "browser_error"
  | "browser_event"
  | "server_error"
  | "server_request"
  | "analysis_result"
  | "pipeline_event";

export type ObservabilityComponent =
  | "browser"
  | "next-api"
  | "next-ssr"
  | "proxy"
  | "gateway"
  | "llm-analyzer";

export type ObservabilityEnvironment = "local" | "preview" | "production";

export type ObservabilityEvent = {
  timestamp: string;
  level: ObservabilityLevel;
  signalType: ObservabilitySignalType;
  service: "woogook-frontend";
  component: ObservabilityComponent;
  environment: ObservabilityEnvironment;
  release: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
  route?: string;
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
