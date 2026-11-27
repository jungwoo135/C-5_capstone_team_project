import { requireAuth } from "./auth-service.js";
import { errorResponse, handleError, isValidId, readJson } from "./http.js";
import { recommendPlaces, submitLocation } from "./place-service.js";

async function readRoomId(context) {
  const { roomId } = await context.params;
  const id = Number(roomId);
  return isValidId(id) ? id : null;
}

/** POST /api/chats/[roomId]/location : 내 위치 제출 (참여자만). 본문 { latitude, longitude } */
export async function submitLocationHandler(request, context) {
  try {
    const user = requireAuth(request);
    const roomId = await readRoomId(context);
    if (!roomId) return errorResponse(400, "채팅방 ID가 올바르지 않습니다.");
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    const { latitude, longitude } = body;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return errorResponse(400, "latitude, longitude는 숫자여야 합니다.");
    }
    return Response.json(await submitLocation({ userId: user.userId, roomId, latitude, longitude }));
  } catch (error) {
    return handleError(error, "위치 제출 실패");
  }
}

/** GET /api/chats/[roomId]/places?radius=1000 : 두 사람 중간 지점 주변 안전 장소 추천 (참여자만) */
export async function recommendPlacesHandler(request, context) {
  try {
    const user = requireAuth(request);
    const roomId = await readRoomId(context);
    if (!roomId) return errorResponse(400, "채팅방 ID가 올바르지 않습니다.");
    const { searchParams } = new URL(request.url);
    let radiusM;
    if (searchParams.has("radius")) {
      radiusM = Number(searchParams.get("radius"));
      if (!Number.isFinite(radiusM) || radiusM <= 0) return errorResponse(400, "radius는 양수여야 합니다.");
    }
    return Response.json(await recommendPlaces({ userId: user.userId, roomId, radiusM }));
  } catch (error) {
    return handleError(error, "안전 장소 추천 실패");
  }
}
