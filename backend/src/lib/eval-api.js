/** 거래 평가 API를 호출하는 화면용 함수. */

/**
 * 거래 평가를 등록합니다. (그 거래의 판매자 또는 구매자만 가능)
 * memberTypeCode: 내가 "SELLER"(판매자)로 평가하는지 "BUYER"(구매자)로 평가하는지
 * 점수 3개는 각각 1~5 사이의 정수입니다.
 * 성공하면 { evalId, itemId, targetUserId, newTrustScore, grantedBadges }를 돌려줍니다.
 */
export async function submitEvaluation({ itemId, memberTypeCode, mannerScore, commScore, timeScore }) {
  let response;
  try {
    response = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, memberTypeCode, mannerScore, commScore, timeScore }),
    });
  } catch {
    throw new Error("서버에 연결할 수 없습니다.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.detail ?? `평가 등록에 실패했습니다. (오류 코드 ${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}
