import { completeTrade, TradeError } from "./trade-service.js";

function errorResponse(status, detail) {
  return Response.json({ status, detail }, { status });
}

function isValidId(value) {
  return Number.isSafeInteger(value) && value > 0;
}

/** POST /api/trades/complete : 거래 완료 처리 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
  }

  const { itemId, sellerId, buyerId } = body ?? {};
  if (![itemId, sellerId, buyerId].every(isValidId)) {
    return errorResponse(400, "itemId, sellerId, buyerId는 1 이상의 정수여야 합니다.");
  }

  try {
    const result = await completeTrade({ itemId, sellerId, buyerId });
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof TradeError) {
      return errorResponse(error.status, error.message);
    }
    // DB 주소 같은 내부 정보가 화면에 나가지 않도록 자세한 내용은 서버 기록에만 남깁니다.
    console.error("거래 완료 처리 실패", error);
    return errorResponse(500, "서버 오류로 거래 완료 처리에 실패했습니다.");
  }
}
