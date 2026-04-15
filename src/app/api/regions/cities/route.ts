import { relayLocalElectionToBackend } from "@/app/api/_shared/local-election-relay";
import { buildBackendPath } from "@/lib/local-election-backend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return relayLocalElectionToBackend(
    buildBackendPath("/api/local-election/v1/regions/cities"),
  );
}
