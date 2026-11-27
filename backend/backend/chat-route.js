import { requireAuth } from "./auth-service.js";
import {
  completeTradeByRoom,
  getMessages,
  listMyRooms,
  markRoomRead,
  openRoom,
  sendMessage,
} from "./chat-service.js";
import { errorResponse, handleError, isValidId, readJson } from "./http.js";

/** 주소의 [roomId] 조각을 숫자로 바꿉니다. 잘못되면 null. */
async function readRoomId(context) {
  const { roomId } = await context.params;
  const id = Number(roomId);
  return isValidId(id) ? id : null;
}

/** POST /api/chats : 채팅방 열기 (구매 희망자, 로그인 필요). 본문 { itemId } */
export async function openRoomHandler(request) {
  try {
    const user = requireAuth(request);
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    if (!isValidId(body.itemId)) return errorResponse(400, "itemId는 1 이상의 정수여야 합니다.");
    const room = await openRoom({ userId: user.userId, itemId: body.itemId });
    return Response.json(room, { status: room.created ? 201 : 200 });
  } catch (error) {
    return handleError(error, "채팅방 열기 실패");
  }
}

/** GET /api/chats : 내 채팅방 목록 (로그인 필요) */
export async function listRoomsHandler(request) {
  try {
    const user = requireAuth(request);
    return Response.json(await listMyRooms(user.userId));
  } catch (error) {
    return handleError(error, "채팅방 목록 조회 실패");
  }
}

/**
 * GET /api/chats/[roomId]/messages?after=123&limit=50 : 메시지 조회 (참여자만)
 * after를 주면 그 ID 이후의 새 메시지만 옵니다. (앱은 3초마다 마지막 ID로 이걸 호출)
 */
export async function getMessagesHandler(request, context) {
  try {
    const user = requireAuth(request);
    const roomId = await readRoomId(context);
    if (!roomId) return errorResponse(400, "채팅방 ID가 올바르지 않습니다.");

    const { searchParams } = new URL(request.url);
    let afterId = null;
    if (searchParams.has("after")) {
      afterId = Number(searchParams.get("after"));
      if (!Number.isSafeInteger(afterId) || afterId < 0) return errorResponse(400, "after는 0 이상의 정수여야 합니다.");
    }
    let limit = 50;
    if (searchParams.has("limit")) {
      limit = Number(searchParams.get("limit"));
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) return errorResponse(400, "limit은 1~200 사이여야 합니다.");
    }
    return Response.json(await getMessages({ userId: user.userId, roomId, afterId, limit }));
  } catch (error) {
    return handleError(error, "메시지 조회 실패");
  }
}

/** POST /api/chats/[roomId]/messages : 메시지 보내기 (참여자만). 본문 { content } */
export async function sendMessageHandler(request, context) {
  try {
    const user = requireAuth(request);
    const roomId = await readRoomId(context);
    if (!roomId) return errorResponse(400, "채팅방 ID가 올바르지 않습니다.");
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    if (typeof body.content !== "string") return errorResponse(400, "content는 문자열이어야 합니다.");
    const message = await sendMessage({ userId: user.userId, roomId, content: body.content });
    return Response.json(message, { status: 201 });
  } catch (error) {
    return handleError(error, "메시지 전송 실패");
  }
}

/** POST /api/chats/[roomId]/read : 상대 메시지 읽음 처리 (참여자만) */
export async function markReadHandler(request, context) {
  try {
    const user = requireAuth(request);
    const roomId = await readRoomId(context);
    if (!roomId) return errorResponse(400, "채팅방 ID가 올바르지 않습니다.");
    return Response.json(await markRoomRead({ userId: user.userId, roomId }));
  } catch (error) {
    return handleError(error, "읽음 처리 실패");
  }
}

/** POST /api/chats/[roomId]/complete : 이 채팅방의 거래 완료 (판매자만) */
export async function completeByRoomHandler(request, context) {
  try {
    const user = requireAuth(request);
    const roomId = await readRoomId(context);
    if (!roomId) return errorResponse(400, "채팅방 ID가 올바르지 않습니다.");
    const result = await completeTradeByRoom({ userId: user.userId, roomId });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleError(error, "채팅방 거래 완료 실패");
  }
}
