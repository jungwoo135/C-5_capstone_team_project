/**
 * 거래 완료 API를 호출합니다.
 * 성공하면 { salesId, purchaseId, itemId, salesStatus, completedAt }을 돌려주고,
 * 실패하면 화면에 보여줄 문구가 담긴 Error를 던집니다.
 */
export async function completeTrade({ itemId, sellerId, buyerId }) {
  let response;
  try {
    // 화면과 API가 같은 Next.js 서버에 있으므로 서버 주소 없이 경로만 적습니다.
    response = await fetch("/api/trades/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, sellerId, buyerId }),
    });
  } catch {
    throw new Error("서버에 연결할 수 없습니다.");
  }

  // 오류 응답이 JSON이 아닐 수도 있으므로, 읽기에 실패하면 null로 둡니다.
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.detail ?? `거래 완료 처리에 실패했습니다. (오류 코드 ${response.status})`);
  }
  return body;
}
