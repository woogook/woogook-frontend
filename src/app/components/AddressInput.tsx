"use client";

import RegionAddressInput, {
  type RegionAddressInputSample,
} from "@/features/regions/components/RegionAddressInput";

interface Props {
  onSubmit: (city: string, district: string, dong: string) => void;
  loading?: boolean;
  error?: string | null;
}

const localElectionSamples: RegionAddressInputSample[] = [
  {
    label: "서울 강남구 개포1동",
    city: "서울특별시",
    district: "강남구",
    dong: "개포1동",
  },
  {
    label: "제주 제주시 노형동",
    city: "제주특별자치도",
    district: "제주시",
    dong: "노형동",
  },
];

export default function AddressInput({ onSubmit, loading, error }: Props) {
  return (
    <RegionAddressInput
      eyebrow="2026 지방선거"
      title="내 선거 안내서"
      description={
        <>
          지역을 선택하면, 이번 선거에서 받게 되는
          <br />
          투표용지와 후보자 정보를 확인할 수 있습니다.
        </>
      }
      submitLabel="내 선거 확인하기"
      samplesLabel="샘플 데이터로 미리보기"
      samples={localElectionSamples}
      footerNote={
        <>
          입력한 주소 정보는 선거구 매핑에만 사용됩니다.
          <br />
          출처: 중앙선거관리위원회 (2026.05.15 기준)
        </>
      }
      onSubmit={onSubmit}
      loading={loading}
      error={error}
      errorTitle="조회 오류"
    />
  );
}
