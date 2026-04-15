import type {
  GrafanaAlertPayload,
  IncidentSummary,
} from "@/lib/observability/analyzer";
import type { ObservabilityConfig } from "@/lib/observability/config";
import type { ObservabilityEvent } from "@/lib/observability/types";

export type LlmEnhancementParams = {
  alert: GrafanaAlertPayload;
  baselineSummary: IncidentSummary;
  config: ObservabilityConfig;
  recentEvents: ObservabilityEvent[];
};
