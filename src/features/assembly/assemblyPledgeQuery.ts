/**
 * /assembly/pledge 하위 화면에서 공유하는 쿼리 키(city, sigungu, member).
 */
export function assemblyPledgeContextParams(
  city: string | null,
  sigungu: string | null,
  member: string | null,
): URLSearchParams {
  const params = new URLSearchParams();
  if (city) {
    params.set("city", city);
  }
  if (sigungu) {
    params.set("sigungu", sigungu);
  }
  if (member) {
    params.set("member", member);
  }
  return params;
}
