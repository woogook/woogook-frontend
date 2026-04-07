/**
 * 제22대 국회의원선거 선거공보 PDF 공개 URL (S3, CloudFront 등 로그인 없이 열 수 있는 주소).
 *
 * `.env.local` 예:
 * NEXT_PUBLIC_ASSEMBLY22_CAMPAIGN_BOOKLET_PDF_URL=https://도메인/.../file.pdf
 *
 * 값이 비어 있으면 AssemblyPledgeRatePage에서 동일 문구 링크는 보이되, 클릭 시
 * 「등록된 선거공보 PDF가 없습니다.」 알림만 띄웁니다.
 */
export function getAssembly22CampaignBookletPublicPdfUrl(): string {
  return (process.env.NEXT_PUBLIC_ASSEMBLY22_CAMPAIGN_BOOKLET_PDF_URL ?? "").trim();
}
