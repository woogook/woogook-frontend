import { z } from "zod";

export const browserEventSchema = z.object({
  timestamp: z.string(),
  level: z.enum(["debug", "info", "warn", "error"]),
  signalType: z.enum(["browser_error", "browser_event"]),
  route: z.string().optional(),
  userAction: z.string().optional(),
  errorName: z.string().optional(),
  errorMessage: z.string().optional(),
  stack: z.string().optional(),
  httpMethod: z.string().optional(),
  httpStatus: z.number().int().optional(),
  latencyMs: z.number().optional(),
  correlationId: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const browserEventBatchSchema = z.object({
  sessionId: z.string().min(1).max(128),
  events: z.array(browserEventSchema).min(1).max(50),
});

export const grafanaAlertPayloadSchema = z.object({
  title: z.string(),
  status: z.enum(["firing", "resolved"]),
  labels: z.record(z.string(), z.string()),
  annotations: z.record(z.string(), z.string()).optional(),
});

export type BrowserEventBatch = z.infer<typeof browserEventBatchSchema>;
export type GrafanaAlertPayloadInput = z.infer<typeof grafanaAlertPayloadSchema>;
