import type { Metadata } from "next";
import { Suspense } from "react";

import { AssemblyPledgeRatePage } from "@/features/assembly/AssemblyPledgeRatePage";

export const metadata: Metadata = {
  title: "공약 이행률",
  description: "국회의원별 공약 이행률 및 카테고리별 요약",
};

function PledgeFallback() {
  return (
    <div
      className="flex min-h-[40dvh] items-center justify-center px-5 text-center text-sm"
      style={{ color: "var(--text-secondary)" }}
    >
      불러오는 중…
    </div>
  );
}

export default function AssemblyPledgePage() {
  return (
    <Suspense fallback={<PledgeFallback />}>
      <AssemblyPledgeRatePage />
    </Suspense>
  );
}
