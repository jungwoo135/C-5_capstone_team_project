/** 물품 인증(AI 사진 검토) API를 호출하는 화면용 함수. */

/**
 * 물품 인증을 요청합니다. (그 물품을 등록한 판매자만 가능)
 * AI 처리 때문에 몇 초 걸릴 수 있으니, 화면에서는 버튼을 잠그고 기다려 주세요.
 * 성공하면 { authId, itemId, photoVerified, reliabilityScore }를 돌려줍니다.
 */
export async function authenticateItem({ itemId, authType, serialNumber, authImage }) {
  let response;
  try {
    response = await fetch(`/api/items/${itemId}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authType, serialNumber, authImage }),
    });
  } catch {
    throw new Error("서버에 연결할 수 없습니다.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.detail ?? `물품 인증에 실패했습니다. (오류 코드 ${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}
