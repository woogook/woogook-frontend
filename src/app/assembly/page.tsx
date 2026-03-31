import type { Metadata } from "next";

import { AssemblyLandingPage } from "@/features/assembly/AssemblyLandingPage";

export const metadata: Metadata = {
  title: "우리동네 국회의원 공약 이행률 확인",
  description: "시·도·구군시와 국회의원을 선택해 공약 이행률을 확인합니다.",
};

export default function AssemblyPage() {
  return <AssemblyLandingPage />;
}
