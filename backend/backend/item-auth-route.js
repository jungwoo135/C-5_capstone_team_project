import { requireAuth } from "./auth-service.js";
import { errorResponse, handleError, isValidId, readJson } from "./http.js";
import { authenticateItem } from "./item-auth-service.js";

/** POST /api/items/[itemId]/authenticate : 물품 인증 (판매자 본인만, 로그인 필요) */
export async function authenticateItemHandler(request, context) {
  try {
    const user = requireAuth(request);
    const { itemId } = await context.params;
    const id = Number(itemId);
    if (!isValidId(id)) return errorResponse(400, "물품 ID가 올바르지 않습니다.");

    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    const authType = typeof body.authType === "string" ? body.authType.trim() : "";
    if (authType.length < 1 || authType.length > 50) {
      return errorResponse(400, "authType은 1~50자여야 합니다.");
    }
    const { serialNumber, authImage } = body;
    if (serialNumber != null && (typeof serialNumber !== "string" || serialNumber.length > 200)) {
      return errorResponse(400, "serialNumber는 200자 이하여야 합니다.");
    }
    if (authImage != null && (typeof authImage !== "string" || authImage.length > 500)) {
      return errorResponse(400, "authImage는 500자 이하의 주소여야 합니다.");
    }

    const result = await authenticateItem({
      userId: user.userId,
      itemId: id,
      authType,
      serialNumber: serialNumber ?? null,
      authImage: authImage ?? null,
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleError(error, "물품 인증 실패");
  }
}
