import type { Metadata } from "next";

import { AssemblyLandingPage } from "@/features/assembly/AssemblyLandingPage";

export const metadata: Metadata = {
  title: "우리동네 국회의원 안내서",
  description: "국회 도메인 화면과 문서 기준을 분리한 서비스 진입점",
};

export default function AssemblyPage() {
  return <AssemblyLandingPage />;
}
