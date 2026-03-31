import type { Metadata } from "next";

import LocalElectionPage from "@/features/local-election/LocalElectionPage";

export const metadata: Metadata = {
  title: "내 선거 안내서",
  description: "주소 기반 지방선거 투표지와 후보 비교 흐름",
};

export default function LocalElectionRoutePage() {
  return <LocalElectionPage />;
}
