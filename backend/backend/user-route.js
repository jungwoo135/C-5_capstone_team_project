import { requireAuth, resolveUserId } from "./auth-service.js";
import { SALES_STATUS_VALUES } from "./constants.js";
import { errorResponse, handleError } from "./http.js";
import { listItems } from "./item-service.js";
import { getMyTrades, getUserProfile } from "./user-service.js";

/** GET /api/users/[userId] : 유저 프로필 (누구나 조회 가능, "me"는 본인) */
export async function userProfileHandler(request, context) {
  try {
    const { userId } = await context.params;
    return Response.json(await getUserProfile(resolveUserId(request, userId)));
  } catch (error) {
    return handleError(error, "유저 프로필 조회 실패");
  }
}

/** GET /api/users/[userId]/items : 그 유저가 등록한 물품 목록 (누구나 조회 가능, "me"는 본인) */
export async function userItemsHandler(request, context) {
  try {
    const { userId } = await context.params;
    const filters = { sellerId: resolveUserId(request, userId) };
    const params = new URL(request.url).searchParams;
    if (params.get("salesStatus") !== null) {
      const salesStatus = params.get("salesStatus");
      if (!SALES_STATUS_VALUES.includes(salesStatus)) {
        return errorResponse(400, `salesStatus는 ${SALES_STATUS_VALUES.join(", ")} 중 하나여야 합니다.`);
      }
      filters.salesStatus = salesStatus;
    }
    if (params.get("limit") !== null) {
      const limit = Number(params.get("limit"));
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        return errorResponse(400, "limit는 1~100 사이의 정수여야 합니다.");
      }
      filters.limit = limit;
    }
    return Response.json({ items: await listItems(filters) });
  } catch (error) {
    return handleError(error, "유저 물품 목록 조회 실패");
  }
}

/** GET /api/users/[userId]/trades : 거래 내역 (본인만 조회 가능) */
export async function myTradesHandler(request, context) {
  try {
    const user = requireAuth(request);
    const { userId } = await context.params;
    if (resolveUserId(request, userId) !== user.userId) {
      return errorResponse(403, "본인의 거래 내역만 볼 수 있습니다.");
    }
    return Response.json(await getMyTrades(user.userId));
  } catch (error) {
    return handleError(error, "거래 내역 조회 실패");
  }
}
