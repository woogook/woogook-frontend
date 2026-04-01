/**
 * /assembly/pledge 하위 화면에서 공유하는 쿼리 키(city, sigungu, mona_cd).
 * 의원 식별은 백엔드와 동일하게 mona_cd 사용.
 */
export function assemblyPledgeContextParams(
  city: string | null,
  sigungu: string | null,
  monaCd: string | null,
): URLSearchParams {
  const params = new URLSearchParams();
  if (city) {
    params.set("city", city);
  }
  if (sigungu) {
    params.set("sigungu", sigungu);
  }
  if (monaCd) {
    params.set("mona_cd", monaCd);
  }
  return params;
}
