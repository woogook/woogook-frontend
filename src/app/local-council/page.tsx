import type { Metadata } from "next";

import LocalCouncilPage from "@/features/local-council/LocalCouncilPage";

export const metadata: Metadata = {
  title: "우리동네 지방의원",
  description: "주소 기반 현직 지방의원 명단과 공식 근거 요약",
};

export default function LocalCouncilRoutePage() {
  return <LocalCouncilPage />;
}
