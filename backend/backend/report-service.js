import { REPORT_TARGET_TYPE } from "./constants.js";
import { query } from "./db.js";
import { ApiError } from "./http.js";
import { koreaNow } from "./time.js";

function isDuplicateError(error) {
  return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062 || /duplicate/i.test(error?.message ?? "");
}

/**
 * 신고 접수. 대상(유저/물품/메시지)이 실제로 있는지 확인하고 저장합니다.
 * 관리자 화면은 아직 없으므로, 기록만 남기고 DB에서 확인합니다.
 * 같은 사람이 같은 대상을 두 번 신고하면 409.
 */
export async function createReport({ reporterId, targetType, targetId, reason, detail }) {
  if (targetType === REPORT_TARGET_TYPE.USER) {
    if (targetId === reporterId) throw new ApiError(400, "자기 자신은 신고할 수 없습니다.");
    const rows = await query("SELECT user_id FROM users WHERE user_id = ?", [targetId]);
    if (rows.length === 0) throw new ApiError(404, "신고할 유저를 찾을 수 없습니다.");
  } else if (targetType === REPORT_TARGET_TYPE.ITEM) {
    const rows = await query("SELECT seller_id FROM item WHERE item_id = ?", [targetId]);
    if (rows.length === 0) throw new ApiError(404, "신고할 물품을 찾을 수 없습니다.");
    if (Number(rows[0].seller_id) === reporterId) throw new ApiError(400, "내가 등록한 물품은 신고할 수 없습니다.");
  } else if (targetType === REPORT_TARGET_TYPE.MESSAGE) {
    // 메시지는 내가 참여한 방의, 상대가 보낸 것만 신고할 수 있습니다.
    const rows = await query(
      `SELECT m.sender_id, r.seller_id, r.buyer_id
         FROM chat_message m JOIN chat_room r ON r.room_id = m.room_id
        WHERE m.message_id = ?`,
      [targetId],
    );
    if (rows.length === 0) throw new ApiError(404, "신고할 메시지를 찾을 수 없습니다.");
    const { sender_id, seller_id, buyer_id } = rows[0];
    if (Number(seller_id) !== reporterId && Number(buyer_id) !== reporterId) {
      throw new ApiError(404, "신고할 메시지를 찾을 수 없습니다.");
    }
    if (Number(sender_id) === reporterId) throw new ApiError(400, "내가 보낸 메시지는 신고할 수 없습니다.");
  }

  const text = typeof detail === "string" && detail.trim().length > 0 ? detail.trim().slice(0, 1000) : null;
  try {
    const result = await query(
      "INSERT INTO report (reporter_id, target_type, target_id, reason, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [reporterId, targetType, targetId, reason, text, koreaNow()],
    );
    return { reportId: Number(result.insertId), targetType, targetId, reason, received: true };
  } catch (error) {
    if (isDuplicateError(error)) throw new ApiError(409, "이미 신고한 대상입니다.");
    throw error;
  }
}
