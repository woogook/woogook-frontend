import type { Metadata } from "next";
import { Suspense } from "react";

import { AssemblyPledgeCategoryTopPage } from "@/features/assembly/AssemblyPledgeCategoryTopPage";

export const metadata: Metadata = {
  title: "카테고리별 이행 우수 공약",
  description: "카테고리별 공약 이행 평가 상위 항목(목업)",
};

function CategoryFallback() {
  return (
    <div
      className="flex min-h-[40dvh] items-center justify-center px-5 text-center text-sm"
      style={{ color: "var(--text-secondary)" }}
    >
      불러오는 중…
    </div>
  );
}

export default function AssemblyPledgeCategoryPage() {
  return (
    <Suspense fallback={<CategoryFallback />}>
      <AssemblyPledgeCategoryTopPage />
    </Suspense>
  );
}
