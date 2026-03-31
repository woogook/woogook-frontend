"use client";

import AssemblyPledgeForm from "@/features/assembly/components/AssemblyPledgeForm";
import { AssemblyAppShell } from "@/features/assembly/components/AssemblyAppShell";

/**
 * 국회 도메인 진입 화면 — 지역·의원 선택 폼.
 */
export function AssemblyLandingPage() {
  return (
    <AssemblyAppShell>
      <AssemblyPledgeForm />
    </AssemblyAppShell>
  );
}
