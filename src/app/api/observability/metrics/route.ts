import { metricsRegistry } from "@/lib/observability/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return new Response(await metricsRegistry.metrics(), {
    headers: {
      "content-type": metricsRegistry.contentType,
    },
  });
}
