"use client";

import RegionAddressInput, {
  type RegionAddressInputSample,
} from "@/features/regions/components/RegionAddressInput";

interface LocalCouncilAddressStepProps {
  onSubmit: (city: string, district: string, dong: string) => void;
  loading?: boolean;
  error?: string | null;
}

const localCouncilSamples: RegionAddressInputSample[] = [
  {
    label: "서울 강동구 천호동",
    city: "서울특별시",
    district: "강동구",
    dong: "천호동",
  },
];

export default function LocalCouncilAddressStep({
  onSubmit,
  loading,
  error,
}: LocalCouncilAddressStepProps) {
  return (
    <RegionAddressInput
      eyebrow="지방의원"
      title="우리동네 지방의원을 확인하세요"
      description="지역을 선택하면 구청장과 구의원의 공식 근거 요약을 확인할 수 있습니다."
      submitLabel="지방의원 확인하기"
      samplesLabel="로컬 미리보기"
      samples={localCouncilSamples}
      footerNote="입력한 지역 정보는 현직자 조회에만 사용됩니다."
      onSubmit={onSubmit}
      loading={loading}
      error={error}
      errorTitle="조회 오류"
    />
  );
}
