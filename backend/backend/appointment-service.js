import {
  APPOINTMENT_MAX_DAYS_AHEAD,
  APPOINTMENT_STATUS,
  ARRIVAL_RADIUS_M,
  ARRIVAL_WINDOW_MINUTES,
  SALES_STATUS,
} from "./constants.js";
import { getRoomForMember } from "./chat-service.js";
import { query, withTransaction } from "./db.js";
import { distanceMeters, isValidLatLng } from "./geo.js";
import { ApiError } from "./http.js";
import { koreaDateTimeToMs, koreaNow, koreaNowMs, msToKoreaDateTime } from "./time.js";

/*
 * 거래 약속: 장소·시간 저장과 도착 판별
 *
 * 흐름: 한쪽이 제안(PROPOSED) → 상대가 확정(CONFIRMED, 물품은 RESERVED로)
 *      → 약속 시각 앞뒤 1시간 안에 각자 도착 확인(arrive) → 둘 다 도착하면 DONE
 *      → 취소(CANCELLED)하면 물품은 ON_SALE로 되돌림(판매 완료 전일 때만)
 * 한 채팅방에는 "진행 중인 약속"(PROPOSED/CONFIRMED)이 하나만 있을 수 있습니다.
 */

const ACTIVE = [APPOINTMENT_STATUS.PROPOSED, APPOINTMENT_STATUS.CONFIRMED];

function toIso(dateTime) {
  return dateTime === null || dateTime === undefined ? null : String(dateTime).replace(" ", "T");
}

function mapRow(row, viewerId) {
  const sellerId = Number(row.seller_id);
  const buyerId = Number(row.buyer_id);
  return {
    appointmentId: Number(row.appointment_id),
    roomId: Number(row.room_id),
    itemId: Number(row.item_id),
    sellerId,
    buyerId,
    proposedBy: Number(row.proposed_by),
    proposedByMe: Number(row.proposed_by) === viewerId,
    placeName: row.place_name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    scheduledAt: toIso(row.scheduled_at),
    status: row.status,
    sellerArrivedAt: toIso(row.seller_arrived_at),
    buyerArrivedAt: toIso(row.buyer_arrived_at),
    myArrivedAt: toIso(viewerId === sellerId ? row.seller_arrived_at : row.buyer_arrived_at),
    partnerArrivedAt: toIso(viewerId === sellerId ? row.buyer_arrived_at : row.seller_arrived_at),
    createdAt: toIso(row.created_at),
    arrivalRadiusM: ARRIVAL_RADIUS_M,
  };
}

/** 약속 한 건을 잠그고 읽습니다. 당사자가 아니면 404. (트랜잭션 안에서 사용) */
async function lockAppointment(connection, appointmentId, userId) {
  const [rows] = await connection.execute("SELECT * FROM appointment WHERE appointment_id = ? FOR UPDATE", [appointmentId]);
  if (rows.length === 0) throw new ApiError(404, "약속을 찾을 수 없습니다.");
  const row = rows[0];
  if (Number(row.seller_id) !== userId && Number(row.buyer_id) !== userId) {
    throw new ApiError(404, "약속을 찾을 수 없습니다.");
  }
  return row;
}

/** 입력한 약속 시각을 검사하고 DB 저장 형식으로 바꿉니다. */
function normalizeScheduledAt(value) {
  const ms = koreaDateTimeToMs(value);
  if (ms === null) throw new ApiError(400, "scheduledAt은 'YYYY-MM-DD HH:MM' 형식(한국 시간)이어야 합니다.");
  const now = koreaNowMs();
  if (ms <= now) throw new ApiError(400, "약속 시각은 지금보다 뒤여야 합니다.");
  if (ms > now + APPOINTMENT_MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
    throw new ApiError(400, `약속은 ${APPOINTMENT_MAX_DAYS_AHEAD}일 이내로만 잡을 수 있습니다.`);
  }
  return msToKoreaDateTime(ms);
}

/** 채팅방의 현재 약속(진행 중인 것이 있으면 그것, 없으면 가장 최근 것) */
export async function getRoomAppointment({ userId, roomId }) {
  await getRoomForMember(roomId, userId);
  const rows = await query(
    `SELECT * FROM appointment WHERE room_id = ?
      ORDER BY CASE WHEN status IN ('PROPOSED', 'CONFIRMED') THEN 0 ELSE 1 END, appointment_id DESC
      LIMIT 1`,
    [roomId],
  );
  return { roomId, appointment: rows.length > 0 ? mapRow(rows[0], userId) : null };
}

/** 약속 제안. 방 참여자 누구나 할 수 있고, 진행 중인 약속이 이미 있으면 409. */
export async function proposeAppointment({ userId, roomId, placeName, latitude, longitude, scheduledAt }) {
  const name = typeof placeName === "string" ? placeName.trim() : "";
  if (name.length === 0 || name.length > 200) throw new ApiError(400, "placeName은 1~200자여야 합니다.");
  if (!isValidLatLng(latitude, longitude)) throw new ApiError(400, "latitude, longitude가 올바르지 않습니다.");
  const scheduled = normalizeScheduledAt(scheduledAt);
  const room = await getRoomForMember(roomId, userId);

  return withTransaction(async (connection) => {
    // 물품을 잠가 두고 상태를 확인합니다. (판매 완료면 약속 불가)
    const [items] = await connection.execute("SELECT sales_status FROM item WHERE item_id = ? FOR UPDATE", [room.itemId]);
    if (items.length === 0) throw new ApiError(404, "물품을 찾을 수 없습니다.");
    if (items[0].sales_status === SALES_STATUS.SOLD) throw new ApiError(409, "판매 완료된 물품입니다.");

    const [active] = await connection.execute(
      "SELECT appointment_id FROM appointment WHERE room_id = ? AND status IN (?, ?)",
      [roomId, APPOINTMENT_STATUS.PROPOSED, APPOINTMENT_STATUS.CONFIRMED],
    );
    if (active.length > 0) throw new ApiError(409, "이미 진행 중인 약속이 있습니다. 먼저 취소하세요.");

    const [result] = await connection.execute(
      `INSERT INTO appointment
         (room_id, item_id, seller_id, buyer_id, proposed_by, place_name, latitude, longitude, scheduled_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [roomId, room.itemId, room.sellerId, room.buyerId, userId, name, latitude, longitude, scheduled, APPOINTMENT_STATUS.PROPOSED, koreaNow()],
    );
    const [rows] = await connection.execute("SELECT * FROM appointment WHERE appointment_id = ?", [result.insertId]);
    return mapRow(rows[0], userId);
  });
}

/** 약속 확정. 제안한 사람이 아닌 상대만 할 수 있고, 확정되면 물품이 RESERVED가 됩니다. */
export async function confirmAppointment({ userId, appointmentId }) {
  return withTransaction(async (connection) => {
    const row = await lockAppointment(connection, appointmentId, userId);
    if (row.status !== APPOINTMENT_STATUS.PROPOSED) throw new ApiError(409, "제안 상태인 약속만 확정할 수 있습니다.");
    if (Number(row.proposed_by) === userId) throw new ApiError(403, "약속은 제안을 받은 상대가 확정합니다.");

    const [items] = await connection.execute("SELECT sales_status FROM item WHERE item_id = ? FOR UPDATE", [row.item_id]);
    if (items[0]?.sales_status === SALES_STATUS.SOLD) throw new ApiError(409, "판매 완료된 물품입니다.");

    await connection.execute("UPDATE appointment SET status = ? WHERE appointment_id = ?", [APPOINTMENT_STATUS.CONFIRMED, appointmentId]);
    if (items[0]?.sales_status === SALES_STATUS.ON_SALE) {
      await connection.execute("UPDATE item SET sales_status = ? WHERE item_id = ?", [SALES_STATUS.RESERVED, row.item_id]);
    }
    const [rows] = await connection.execute("SELECT * FROM appointment WHERE appointment_id = ?", [appointmentId]);
    return { ...mapRow(rows[0], userId), itemSalesStatus: SALES_STATUS.RESERVED };
  });
}

/** 약속 취소. 당사자 누구나. 확정으로 RESERVED가 된 물품은 ON_SALE로 되돌립니다. */
export async function cancelAppointment({ userId, appointmentId }) {
  return withTransaction(async (connection) => {
    const row = await lockAppointment(connection, appointmentId, userId);
    if (!ACTIVE.includes(row.status)) throw new ApiError(409, "진행 중인 약속만 취소할 수 있습니다.");

    const [items] = await connection.execute("SELECT sales_status FROM item WHERE item_id = ? FOR UPDATE", [row.item_id]);
    await connection.execute("UPDATE appointment SET status = ? WHERE appointment_id = ?", [APPOINTMENT_STATUS.CANCELLED, appointmentId]);

    let itemSalesStatus = items[0]?.sales_status ?? null;
    if (row.status === APPOINTMENT_STATUS.CONFIRMED && itemSalesStatus === SALES_STATUS.RESERVED) {
      await connection.execute("UPDATE item SET sales_status = ? WHERE item_id = ?", [SALES_STATUS.ON_SALE, row.item_id]);
      itemSalesStatus = SALES_STATUS.ON_SALE;
    }
    const [rows] = await connection.execute("SELECT * FROM appointment WHERE appointment_id = ?", [appointmentId]);
    return { ...mapRow(rows[0], userId), itemSalesStatus };
  });
}

/**
 * 도착 확인. 앱이 보낸 현재 위치가 약속 장소에서 ARRIVAL_RADIUS_M 안이고,
 * 지금이 약속 시각 앞뒤 ARRIVAL_WINDOW_MINUTES 안이면 도착으로 기록합니다.
 * 둘 다 도착하면 약속 상태가 DONE이 됩니다.
 * (GPS 좌표는 앱이 보내는 값이라 위조를 막을 수는 없습니다. 거래 완료 자체는 여전히 판매자의 확인으로만 됩니다.)
 */
export async function arriveAppointment({ userId, appointmentId, latitude, longitude }) {
  if (!isValidLatLng(latitude, longitude)) throw new ApiError(400, "latitude, longitude가 올바르지 않습니다.");
  return withTransaction(async (connection) => {
    const row = await lockAppointment(connection, appointmentId, userId);
    if (row.status !== APPOINTMENT_STATUS.CONFIRMED) throw new ApiError(409, "확정된 약속에서만 도착 확인을 할 수 있습니다.");

    const nowMs = koreaNowMs();
    const scheduledMs = koreaDateTimeToMs(String(row.scheduled_at));
    const windowMs = ARRIVAL_WINDOW_MINUTES * 60 * 1000;
    if (nowMs < scheduledMs - windowMs) {
      throw new ApiError(409, `도착 확인은 약속 시각 ${ARRIVAL_WINDOW_MINUTES}분 전부터 할 수 있습니다.`);
    }
    if (nowMs > scheduledMs + windowMs) {
      throw new ApiError(409, `약속 시각에서 ${ARRIVAL_WINDOW_MINUTES}분이 지나 도착 확인이 마감되었습니다.`);
    }

    const distance = distanceMeters(latitude, longitude, Number(row.latitude), Number(row.longitude));
    if (distance > ARRIVAL_RADIUS_M) {
      throw new ApiError(409, `약속 장소까지 ${distance}m 남았습니다. (${ARRIVAL_RADIUS_M}m 안에서 확인됩니다)`);
    }

    const isSeller = Number(row.seller_id) === userId;
    const column = isSeller ? "seller_arrived_at" : "buyer_arrived_at";
    const alreadyMine = isSeller ? row.seller_arrived_at : row.buyer_arrived_at;
    const now = koreaNow();
    if (!alreadyMine) {
      await connection.execute(`UPDATE appointment SET ${column} = ? WHERE appointment_id = ?`, [now, appointmentId]);
    }
    const otherArrived = isSeller ? row.buyer_arrived_at : row.seller_arrived_at;
    const bothArrived = Boolean(otherArrived);
    if (bothArrived) {
      await connection.execute("UPDATE appointment SET status = ? WHERE appointment_id = ?", [APPOINTMENT_STATUS.DONE, appointmentId]);
    }
    const [rows] = await connection.execute("SELECT * FROM appointment WHERE appointment_id = ?", [appointmentId]);
    return { ...mapRow(rows[0], userId), distanceM: distance, bothArrived };
  });
}
