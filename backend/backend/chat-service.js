import { CHAT_MESSAGE_MAX_LENGTH, SALES_STATUS } from "./constants.js";
import { query, withTransaction } from "./db.js";
import { ApiError } from "./http.js";
import { koreaNow } from "./time.js";
import { completeTrade } from "./trade-service.js";

/*
 * 1:1 채팅 (폴링 방식)
 *
 * "실시간"은 앱이 몇 초마다 `GET /api/chats/{roomId}/messages?after=<마지막으로 받은 메시지 ID>`를
 * 불러서 새 메시지만 받아 가는 방식으로 만듭니다. 메시지 ID는 항상 커지므로,
 * 마지막 ID "이후"만 달라고 하면 중복 없이 새 것만 받습니다.
 */

function isDuplicateError(error) {
  return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062 || /duplicate/i.test(error?.message ?? "");
}

function toIso(dateTime) {
  return dateTime === null || dateTime === undefined ? null : String(dateTime).replace(" ", "T");
}

/** 두 유저 사이에 어느 한쪽이라도 차단한 관계가 있는지 */
export async function isBlockedBetween(userA, userB) {
  const rows = await query(
    `SELECT block_id FROM block_list
      WHERE (blocker_user_id = ? AND blocked_user_id = ?) OR (blocker_user_id = ? AND blocked_user_id = ?)
      LIMIT 1`,
    [userA, userB, userB, userA],
  );
  return rows.length > 0;
}

/**
 * 채팅방 한 건을 읽고, 요청한 유저가 그 방의 참여자(판매자 또는 구매자)인지 확인합니다.
 * 참여자가 아니면 404로 답해, 방이 있는지조차 알 수 없게 합니다.
 */
export async function getRoomForMember(roomId, userId, connection = null) {
  const sql = "SELECT room_id, item_id, seller_id, buyer_id, created_at, last_message_at FROM chat_room WHERE room_id = ?";
  const rows = connection ? (await connection.execute(sql, [roomId]))[0] : await query(sql, [roomId]);
  if (rows.length === 0) throw new ApiError(404, "채팅방을 찾을 수 없습니다.");
  const room = {
    roomId: Number(rows[0].room_id),
    itemId: Number(rows[0].item_id),
    sellerId: Number(rows[0].seller_id),
    buyerId: Number(rows[0].buyer_id),
    createdAt: toIso(rows[0].created_at),
    lastMessageAt: toIso(rows[0].last_message_at),
  };
  if (room.sellerId !== userId && room.buyerId !== userId) {
    throw new ApiError(404, "채팅방을 찾을 수 없습니다.");
  }
  room.partnerId = room.sellerId === userId ? room.buyerId : room.sellerId;
  room.myRole = room.sellerId === userId ? "SELLER" : "BUYER";
  return room;
}

/**
 * 채팅방 열기. 구매 희망자가 물품 ID로 엽니다.
 * 이미 같은 물품에 내가 연 방이 있으면 새로 만들지 않고 그 방을 돌려줍니다.
 */
export async function openRoom({ userId, itemId }) {
  const items = await query("SELECT item_id, seller_id, sales_status FROM item WHERE item_id = ?", [itemId]);
  if (items.length === 0) throw new ApiError(404, "물품을 찾을 수 없습니다.");
  const sellerId = Number(items[0].seller_id);
  if (sellerId === userId) throw new ApiError(400, "내가 등록한 물품에는 채팅방을 열 수 없습니다.");

  // 이미 있는 방이면 그대로 돌려줍니다. (판매 완료 물품이어도 기존 대화는 볼 수 있어야 하므로 먼저 확인)
  const existing = await query("SELECT room_id FROM chat_room WHERE item_id = ? AND buyer_id = ?", [itemId, userId]);
  if (existing.length > 0) {
    return { ...(await getRoomForMember(Number(existing[0].room_id), userId)), created: false };
  }

  if (items[0].sales_status === SALES_STATUS.SOLD) throw new ApiError(409, "판매 완료된 물품입니다.");
  if (await isBlockedBetween(userId, sellerId)) throw new ApiError(403, "차단 관계인 유저와는 채팅할 수 없습니다.");

  try {
    const result = await query(
      "INSERT INTO chat_room (item_id, seller_id, buyer_id, created_at, last_message_at) VALUES (?, ?, ?, ?, NULL)",
      [itemId, sellerId, userId, koreaNow()],
    );
    return { ...(await getRoomForMember(Number(result.insertId), userId)), created: true };
  } catch (error) {
    // 같은 순간 두 번 눌러도 UNIQUE(item_id, buyer_id) 덕분에 한 방만 생깁니다.
    if (isDuplicateError(error)) {
      const again = await query("SELECT room_id FROM chat_room WHERE item_id = ? AND buyer_id = ?", [itemId, userId]);
      return { ...(await getRoomForMember(Number(again[0].room_id), userId)), created: false };
    }
    throw error;
  }
}

/** 내 채팅방 목록: 상대 닉네임, 물품 제목, 마지막 메시지, 안 읽은 개수. 최근 대화 순. */
export async function listMyRooms(userId) {
  const rows = await query(
    `SELECT r.room_id, r.item_id, r.seller_id, r.buyer_id, r.created_at, r.last_message_at,
            i.title AS item_title, i.price AS item_price, i.item_image, i.sales_status,
            su.nickname AS seller_nickname, bu.nickname AS buyer_nickname,
            (SELECT m.content FROM chat_message m WHERE m.room_id = r.room_id ORDER BY m.message_id DESC LIMIT 1) AS last_content,
            (SELECT COUNT(*) FROM chat_message m WHERE m.room_id = r.room_id AND m.sender_id <> ? AND m.read_at IS NULL) AS unread_count
       FROM chat_room r
       JOIN item i ON i.item_id = r.item_id
       JOIN users su ON su.user_id = r.seller_id
       JOIN users bu ON bu.user_id = r.buyer_id
      WHERE r.seller_id = ? OR r.buyer_id = ?
      ORDER BY COALESCE(r.last_message_at, r.created_at) DESC, r.room_id DESC`,
    [userId, userId, userId],
  );
  const rooms = rows.map((row) => {
    const sellerId = Number(row.seller_id);
    const isSeller = sellerId === userId;
    return {
      roomId: Number(row.room_id),
      itemId: Number(row.item_id),
      itemTitle: row.item_title,
      itemPrice: Number(row.item_price),
      itemImage: row.item_image ?? null,
      salesStatus: row.sales_status,
      myRole: isSeller ? "SELLER" : "BUYER",
      partnerId: isSeller ? Number(row.buyer_id) : sellerId,
      partnerNickname: isSeller ? row.buyer_nickname : row.seller_nickname,
      lastMessage: row.last_content ?? null,
      lastMessageAt: toIso(row.last_message_at),
      unreadCount: Number(row.unread_count),
    };
  });
  const totalUnread = rooms.reduce((sum, room) => sum + room.unreadCount, 0);
  return { rooms, totalUnread };
}

/**
 * 메시지 목록. afterId를 주면 그 ID보다 큰(=그 뒤에 온) 메시지만 오래된 순으로 돌려줍니다.
 * afterId가 없으면 최근 limit개를 돌려줍니다. (처음 방에 들어올 때)
 */
export async function getMessages({ userId, roomId, afterId = null, limit = 50 }) {
  const room = await getRoomForMember(roomId, userId);
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  let rows;
  if (afterId !== null) {
    rows = await query(
      `SELECT message_id, sender_id, content, created_at, read_at
         FROM chat_message WHERE room_id = ? AND message_id > ?
        ORDER BY message_id ASC LIMIT ${safeLimit}`,
      [roomId, afterId],
    );
  } else {
    rows = await query(
      `SELECT message_id, sender_id, content, created_at, read_at
         FROM chat_message WHERE room_id = ?
        ORDER BY message_id DESC LIMIT ${safeLimit}`,
      [roomId],
    );
    rows.reverse(); // 화면에는 오래된 것이 위로 가도록
  }
  const messages = rows.map((row) => ({
    messageId: Number(row.message_id),
    senderId: Number(row.sender_id),
    mine: Number(row.sender_id) === userId,
    content: row.content,
    createdAt: toIso(row.created_at),
    readAt: toIso(row.read_at),
  }));
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].messageId : (afterId ?? 0);
  return { room, messages, lastMessageId };
}

/** 메시지 보내기. 차단 관계가 생겼으면 보낼 수 없습니다. */
export async function sendMessage({ userId, roomId, content }) {
  const text = typeof content === "string" ? content.trim() : "";
  if (text.length === 0) throw new ApiError(400, "메시지 내용을 입력하세요.");
  if (text.length > CHAT_MESSAGE_MAX_LENGTH) {
    throw new ApiError(400, `메시지는 ${CHAT_MESSAGE_MAX_LENGTH}자 이하여야 합니다.`);
  }
  const room = await getRoomForMember(roomId, userId);
  if (await isBlockedBetween(userId, room.partnerId)) {
    throw new ApiError(403, "차단 관계인 유저에게는 메시지를 보낼 수 없습니다.");
  }
  const now = koreaNow();
  return withTransaction(async (connection) => {
    const [result] = await connection.execute(
      "INSERT INTO chat_message (room_id, sender_id, content, created_at, read_at) VALUES (?, ?, ?, ?, NULL)",
      [roomId, userId, text, now],
    );
    await connection.execute("UPDATE chat_room SET last_message_at = ? WHERE room_id = ?", [now, roomId]);
    return {
      messageId: Number(result.insertId),
      roomId,
      senderId: userId,
      mine: true,
      content: text,
      createdAt: now.replace(" ", "T"),
      readAt: null,
    };
  });
}

/** 상대가 보낸 안 읽은 메시지를 전부 읽음 처리합니다. (방에 들어왔을 때, 새 메시지를 받았을 때 호출) */
export async function markRoomRead({ userId, roomId }) {
  await getRoomForMember(roomId, userId);
  const result = await query(
    "UPDATE chat_message SET read_at = ? WHERE room_id = ? AND sender_id <> ? AND read_at IS NULL",
    [koreaNow(), roomId, userId],
  );
  return { roomId, markedCount: Number(result.affectedRows ?? 0) };
}

/**
 * 채팅방에서 거래 완료. 판매자가 누르며, 구매자는 방에서 자동으로 정해집니다.
 * 실제 처리(행 잠금, 판매·구매 기록, 상태 변경)는 기존 completeTrade가 그대로 담당합니다.
 */
export async function completeTradeByRoom({ userId, roomId }) {
  const room = await getRoomForMember(roomId, userId);
  if (room.myRole !== "SELLER") throw new ApiError(403, "거래 완료는 판매자만 할 수 있습니다.");
  const result = await completeTrade({ itemId: room.itemId, sellerId: room.sellerId, buyerId: room.buyerId });
  return { ...result, roomId, buyerId: room.buyerId };
}
