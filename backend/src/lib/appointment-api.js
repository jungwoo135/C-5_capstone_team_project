/** 거래 약속(장소·시간·도착 확인) API를 호출하는 화면용 함수 모음. */

async function callApi(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error("서버에 연결할 수 없습니다.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.detail ?? `요청에 실패했습니다. (오류 코드 ${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

const jsonPost = (data) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data ?? {}),
});

/** 이 채팅방의 현재 약속. appointment가 null이면 아직 없음. */
export async function getRoomAppointment(roomId) {
  return callApi(`/api/chats/${roomId}/appointment`);
}

/**
 * 약속 제안. scheduledAt은 "2026-11-28 14:00" 형식(한국 시간).
 * 안전 장소 추천 결과의 placeName/latitude/longitude를 그대로 넘기면 됩니다.
 */
export async function proposeAppointment(roomId, { placeName, latitude, longitude, scheduledAt }) {
  return callApi(`/api/chats/${roomId}/appointment`, jsonPost({ placeName, latitude, longitude, scheduledAt }));
}

/** 약속 확정 (제안받은 쪽만). 확정되면 물품이 예약 중(RESERVED)이 됩니다. */
export async function confirmAppointment(appointmentId) {
  return callApi(`/api/appointments/${appointmentId}/confirm`, jsonPost());
}

/** 약속 취소 (당사자 누구나). 예약 중이던 물품은 판매 중으로 돌아갑니다. */
export async function cancelAppointment(appointmentId) {
  return callApi(`/api/appointments/${appointmentId}/cancel`, jsonPost());
}

/**
 * 도착 확인. 현재 GPS 좌표를 보냅니다.
 * 약속 장소 100m 안 + 약속 시각 앞뒤 1시간 안이면 도착으로 기록되고, 아니면 409와 함께 남은 거리 안내가 옵니다.
 * 응답의 bothArrived가 true면 두 사람 다 도착한 것입니다. (거래 완료 버튼을 보여 주세요)
 */
export async function arriveAppointment(appointmentId, latitude, longitude) {
  return callApi(`/api/appointments/${appointmentId}/arrive`, jsonPost({ latitude, longitude }));
}
