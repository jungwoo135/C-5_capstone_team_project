import { requireAuth, resolveUserId } from "./auth-service.js";
import { errorResponse, handleError, isValidId, readJson } from "./http.js";
import {
  blockUser,
  getUserBadges,
  listMyBlocks,
  listMyWishes,
  toggleWish,
  unblockUser,
} from "./social-service.js";

/** POST /api/wishlist : 찜 토글 (추가/해제, 로그인 필요) */
export async function toggleWishHandler(request) {
  try {
    const user = requireAuth(request);
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    if (!isValidId(body.itemId)) return errorResponse(400, "itemId는 1 이상의 정수여야 합니다.");
    return Response.json(await toggleWish({ userId: user.userId, itemId: body.itemId }));
  } catch (error) {
    return handleError(error, "찜 처리 실패");
  }
}

/** GET /api/wishlist : 내가 찜한 물품 목록 (로그인 필요) */
export async function myWishlistHandler(request) {
  try {
    const user = requireAuth(request);
    return Response.json({ wishes: await listMyWishes(user.userId) });
  } catch (error) {
    return handleError(error, "찜 목록 조회 실패");
  }
}

/** POST /api/blocks : 유저 차단 (로그인 필요) */
export async function blockUserHandler(request) {
  try {
    const user = requireAuth(request);
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    if (!isValidId(body.targetUserId)) return errorResponse(400, "targetUserId는 1 이상의 정수여야 합니다.");
    const result = await blockUser({ userId: user.userId, targetUserId: body.targetUserId });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleError(error, "유저 차단 실패");
  }
}

/** DELETE /api/blocks/[userId] : 차단 해제 (로그인 필요) */
export async function unblockUserHandler(request, context) {
  try {
    const user = requireAuth(request);
    const { userId } = await context.params;
    const targetUserId = Number(userId);
    if (!isValidId(targetUserId)) return errorResponse(400, "유저 ID가 올바르지 않습니다.");
    return Response.json(await unblockUser({ userId: user.userId, targetUserId }));
  } catch (error) {
    return handleError(error, "차단 해제 실패");
  }
}

/** GET /api/blocks : 내가 차단한 유저 목록 (로그인 필요) */
export async function myBlocksHandler(request) {
  try {
    const user = requireAuth(request);
    return Response.json({ blocks: await listMyBlocks(user.userId) });
  } catch (error) {
    return handleError(error, "차단 목록 조회 실패");
  }
}

/** GET /api/users/[userId]/badges : 유저가 받은 뱃지 목록 (누구나 조회 가능, "me"는 본인) */
export async function userBadgesHandler(request, context) {
  try {
    const { userId } = await context.params;
    return Response.json({ badges: await getUserBadges(resolveUserId(request, userId)) });
  } catch (error) {
    return handleError(error, "뱃지 목록 조회 실패");
  }
}
