import {
  arriveAppointment,
  cancelAppointment,
  confirmAppointment,
  getRoomAppointment,
  proposeAppointment,
} from "./appointment-service.js";
import { requireAuth } from "./auth-service.js";
import { errorResponse, handleError, isValidId, readJson } from "./http.js";

async function readParamId(context, key, label) {
  const params = await context.params;
  const id = Number(params[key]);
  if (!isValidId(id)) throw new ValidationError(`${label} ID가 올바르지 않습니다.`);
  return id;
}

class ValidationError extends Error {}

function handle(error, label) {
  if (error instanceof ValidationError) return errorResponse(400, error.message);
  return handleError(error, label);
}

/** GET /api/chats/[roomId]/appointment : 이 채팅방의 현재 약속 (참여자만) */
export async function getRoomAppointmentHandler(request, context) {
  try {
    const user = requireAuth(request);
    const roomId = await readParamId(context, "roomId", "채팅방");
    return Response.json(await getRoomAppointment({ userId: user.userId, roomId }));
  } catch (error) {
    return handle(error, "약속 조회 실패");
  }
}

/**
 * POST /api/chats/[roomId]/appointment : 약속 제안 (참여자만)
 * 본문 { placeName, latitude, longitude, scheduledAt: "2026-11-28 14:00" }
 */
export async function proposeAppointmentHandler(request, context) {
  try {
    const user = requireAuth(request);
    const roomId = await readParamId(context, "roomId", "채팅방");
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    const { placeName, latitude, longitude, scheduledAt } = body;
    if (typeof placeName !== "string") return errorResponse(400, "placeName은 문자열이어야 합니다.");
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return errorResponse(400, "latitude, longitude는 숫자여야 합니다.");
    }
    if (typeof scheduledAt !== "string") return errorResponse(400, "scheduledAt은 'YYYY-MM-DD HH:MM' 형식 문자열이어야 합니다.");
    const result = await proposeAppointment({ userId: user.userId, roomId, placeName, latitude, longitude, scheduledAt });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handle(error, "약속 제안 실패");
  }
}

/** POST /api/appointments/[appointmentId]/confirm : 약속 확정 (제안받은 상대만) */
export async function confirmAppointmentHandler(request, context) {
  try {
    const user = requireAuth(request);
    const appointmentId = await readParamId(context, "appointmentId", "약속");
    return Response.json(await confirmAppointment({ userId: user.userId, appointmentId }));
  } catch (error) {
    return handle(error, "약속 확정 실패");
  }
}

/** POST /api/appointments/[appointmentId]/cancel : 약속 취소 (당사자 누구나) */
export async function cancelAppointmentHandler(request, context) {
  try {
    const user = requireAuth(request);
    const appointmentId = await readParamId(context, "appointmentId", "약속");
    return Response.json(await cancelAppointment({ userId: user.userId, appointmentId }));
  } catch (error) {
    return handle(error, "약속 취소 실패");
  }
}

/** POST /api/appointments/[appointmentId]/arrive : 도착 확인 (당사자). 본문 { latitude, longitude } */
export async function arriveAppointmentHandler(request, context) {
  try {
    const user = requireAuth(request);
    const appointmentId = await readParamId(context, "appointmentId", "약속");
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    const { latitude, longitude } = body;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return errorResponse(400, "latitude, longitude는 숫자여야 합니다.");
    }
    return Response.json(await arriveAppointment({ userId: user.userId, appointmentId, latitude, longitude }));
  } catch (error) {
    return handle(error, "도착 확인 실패");
  }
}
