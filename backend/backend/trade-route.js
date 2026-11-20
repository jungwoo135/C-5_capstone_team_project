import { requireAuth } from "./auth-service.js";
import { errorResponse, handleError, isValidId, readJson } from "./http.js";
import { completeTrade } from "./trade-service.js";

/**
 * POST /api/trades/complete : 거래 완료 처리 (로그인 필요)
 * 판매자는 로그인한 사용자로 자동 판별되므로, 요청에는 물품과 구매자만 담습니다.
 */
export async function POST(request) {
  try {
    const user = requireAuth(request);
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");

    const { itemId, buyerId } = body;
    if (![itemId, buyerId].every(isValidId)) {
      return errorResponse(400, "itemId, buyerId는 1 이상의 정수여야 합니다.");
    }

    const result = await completeTrade({ itemId, sellerId: user.userId, buyerId });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleError(error, "거래 완료 처리 실패");
  }
}
