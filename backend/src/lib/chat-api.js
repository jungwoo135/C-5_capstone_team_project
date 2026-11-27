/** 1:1 채팅 API를 호출하는 화면용 함수 모음. (폴링 방식) */

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

/** 채팅방 열기. 같은 물품에 내가 연 방이 있으면 그 방을 돌려줍니다. (created가 false) */
export async function openChatRoom(itemId) {
  return callApi("/api/chats", jsonPost({ itemId }));
}

/** 내 채팅방 목록 { rooms, totalUnread }. totalUnread는 아이콘 배지에 쓰세요. */
export async function getMyChatRooms() {
  return callApi("/api/chats");
}

/**
 * 메시지 조회.
 *  - 방에 처음 들어올 때: getMessages(roomId) → 최근 50개
 *  - 그 뒤 3초마다:      getMessages(roomId, lastMessageId) → 그 이후 새 메시지만
 * 응답의 lastMessageId를 다음 호출에 넘기면 됩니다.
 */
export async function getMessages(roomId, afterId = null, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (afterId !== null && afterId !== undefined) params.set("after", String(afterId));
  return callApi(`/api/chats/${roomId}/messages?${params}`);
}

/** 메시지 보내기 (1~1000자) */
export async function sendMessage(roomId, content) {
  return callApi(`/api/chats/${roomId}/messages`, jsonPost({ content }));
}

/** 상대가 보낸 메시지 읽음 처리 (방에 들어왔을 때, 새 메시지를 화면에 그린 뒤 호출) */
export async function markRoomRead(roomId) {
  return callApi(`/api/chats/${roomId}/read`, jsonPost());
}

/** 이 채팅방의 거래 완료 (판매자만). 구매자는 방에서 자동으로 정해집니다. */
export async function completeTradeByRoom(roomId) {
  return callApi(`/api/chats/${roomId}/complete`, jsonPost());
}

/**
 * 폴링 시작 도우미. onNewMessages(messages)가 새 메시지가 있을 때만 불립니다.
 * 돌려받은 함수를 부르면 폴링이 멈춥니다. (화면을 나갈 때 꼭 부르세요)
 */
export function startPolling(roomId, lastMessageId, onNewMessages, intervalMs = 3000) {
  let cursor = lastMessageId ?? 0;
  let stopped = false;
  async function tick() {
    if (stopped) return;
    try {
      const result = await getMessages(roomId, cursor);
      if (result.messages.length > 0) {
        cursor = result.lastMessageId;
        onNewMessages(result.messages);
      }
    } catch {
      // 잠깐 연결이 끊겨도 다음 번에 다시 시도합니다.
    }
    if (!stopped) setTimeout(tick, intervalMs);
  }
  setTimeout(tick, intervalMs);
  return () => { stopped = true; };
}
