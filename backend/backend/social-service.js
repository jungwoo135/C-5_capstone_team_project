import { BADGE_CONDITION_PATTERN } from "./constants.js";
import { query, withTransaction } from "./db.js";
import { ApiError } from "./http.js";
import { koreaNow } from "./time.js";

function isDuplicateError(error) {
  return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062 || /duplicate/i.test(error?.message ?? "");
}

/** 찜 토글: 찜이 없으면 추가하고, 있으면 해제합니다. */
export async function toggleWish({ userId, itemId }) {
  return withTransaction(async (connection) => {
    const [items] = await connection.execute("SELECT item_id FROM item WHERE item_id = ?", [itemId]);
    if (items.length === 0) throw new ApiError(404, "물품을 찾을 수 없습니다.");

    const [wishes] = await connection.execute(
      "SELECT wish_id FROM wishlist WHERE user_id = ? AND item_id = ? FOR UPDATE",
      [userId, itemId],
    );
    if (wishes.length > 0) {
      await connection.execute("DELETE FROM wishlist WHERE wish_id = ?", [wishes[0].wish_id]);
      return { itemId, wished: false };
    }
    try {
      await connection.execute(
        "INSERT INTO wishlist (user_id, item_id, wished_at) VALUES (?, ?, ?)",
        [userId, itemId, koreaNow()],
      );
    } catch (error) {
      // 같은 순간 두 번 눌러도 UNIQUE 제약 덕분에 한 번만 저장됩니다.
      if (isDuplicateError(error)) return { itemId, wished: true };
      throw error;
    }
    return { itemId, wished: true };
  });
}

/** 내가 찜한 물품 목록 */
export async function listMyWishes(userId) {
  const rows = await query(
    `SELECT w.wish_id, w.wished_at, i.item_id, i.title, i.price, i.item_image, i.sales_status
       FROM wishlist w
       JOIN item i ON i.item_id = w.item_id
      WHERE w.user_id = ?
      ORDER BY w.wish_id DESC`,
    [userId],
  );
  return rows.map((row) => ({
    wishId: Number(row.wish_id),
    wishedAt: String(row.wished_at).replace(" ", "T"),
    itemId: Number(row.item_id),
    title: row.title,
    price: Number(row.price),
    itemImage: row.item_image ?? null,
    salesStatus: row.sales_status,
  }));
}

/** 유저 차단 */
export async function blockUser({ userId, targetUserId }) {
  if (userId === targetUserId) throw new ApiError(400, "자기 자신은 차단할 수 없습니다.");
  const targets = await query("SELECT user_id FROM users WHERE user_id = ?", [targetUserId]);
  if (targets.length === 0) throw new ApiError(404, "차단할 유저를 찾을 수 없습니다.");
  try {
    const result = await query(
      "INSERT INTO block_list (blocker_user_id, blocked_user_id, blocked_at) VALUES (?, ?, ?)",
      [userId, targetUserId, koreaNow()],
    );
    return { blockId: Number(result.insertId), targetUserId };
  } catch (error) {
    if (isDuplicateError(error)) throw new ApiError(409, "이미 차단한 유저입니다.");
    throw error;
  }
}

/** 차단 해제 */
export async function unblockUser({ userId, targetUserId }) {
  const result = await query(
    "DELETE FROM block_list WHERE blocker_user_id = ? AND blocked_user_id = ?",
    [userId, targetUserId],
  );
  if (Number(result.affectedRows) === 0) throw new ApiError(404, "차단 내역이 없습니다.");
  return { targetUserId, unblocked: true };
}

/** 내가 차단한 유저 목록 */
export async function listMyBlocks(userId) {
  const rows = await query(
    `SELECT b.block_id, b.blocked_at, u.user_id, u.nickname
       FROM block_list b
       JOIN users u ON u.user_id = b.blocked_user_id
      WHERE b.blocker_user_id = ?
      ORDER BY b.block_id DESC`,
    [userId],
  );
  return rows.map((row) => ({
    blockId: Number(row.block_id),
    blockedAt: String(row.blocked_at).replace(" ", "T"),
    userId: Number(row.user_id),
    nickname: row.nickname,
  }));
}

/** 어떤 유저가 받은 뱃지 목록 (누구나 볼 수 있음) */
export async function getUserBadges(userId) {
  const users = await query("SELECT user_id FROM users WHERE user_id = ?", [userId]);
  if (users.length === 0) throw new ApiError(404, "유저를 찾을 수 없습니다.");
  const rows = await query(
    `SELECT b.badge_id, b.badge_name, b.badge_image, ub.achieved_at
       FROM user_badge ub
       JOIN badge b ON b.badge_id = ub.badge_id
      WHERE ub.user_id = ?
      ORDER BY ub.id DESC`,
    [userId],
  );
  return rows.map((row) => ({
    badgeId: Number(row.badge_id),
    badgeName: row.badge_name,
    badgeImage: row.badge_image ?? null,
    achievedAt: String(row.achieved_at).replace(" ", "T"),
  }));
}

/**
 * [내부 헬퍼] 조건을 채운 뱃지를 자동 부여합니다. 반드시 트랜잭션 안에서 부르세요.
 * badge.achievement_condition이 "TRUST_SCORE>=80" 또는 "TRADE_COUNT>=10" 형식일 때만
 * 자동 부여 대상이고, 다른 문구는 건너뜁니다.
 * @param connection withTransaction이 넘겨준 DB 연결
 * @param userId 뱃지를 받을 유저 ID
 * @returns 새로 부여된 뱃지 목록 [{ badgeId, badgeName }]
 */
export async function grantEligibleBadges(connection, userId) {
  const [users] = await connection.execute("SELECT trust_score FROM users WHERE user_id = ?", [userId]);
  if (users.length === 0) return [];
  const trustScore = Number(users[0].trust_score);

  const [counts] = await connection.execute(
    `SELECT (SELECT COUNT(*) FROM item_sales WHERE seller_id = ?)
          + (SELECT COUNT(*) FROM item_purchase WHERE buyer_id = ?) AS trade_count`,
    [userId, userId],
  );
  const tradeCount = Number(counts[0].trade_count);

  const [badges] = await connection.execute(
    "SELECT badge_id, badge_name, achievement_condition FROM badge",
    [],
  );
  const [earnedRows] = await connection.execute(
    "SELECT badge_id FROM user_badge WHERE user_id = ?",
    [userId],
  );
  const earned = new Set(earnedRows.map((row) => Number(row.badge_id)));

  const granted = [];
  for (const badge of badges) {
    if (earned.has(Number(badge.badge_id))) continue; // 이미 받은 뱃지는 건너뜀
    const match = BADGE_CONDITION_PATTERN.exec(badge.achievement_condition ?? "");
    if (!match) continue; // 기계 판독 형식이 아닌 조건은 자동 부여 대상이 아님
    const currentValue = match[1] === "TRUST_SCORE" ? trustScore : tradeCount;
    if (currentValue < Number(match[2])) continue;
    await connection.execute(
      "INSERT INTO user_badge (user_id, badge_id, achieved_at) VALUES (?, ?, ?)",
      [userId, Number(badge.badge_id), koreaNow()],
    );
    granted.push({ badgeId: Number(badge.badge_id), badgeName: badge.badge_name });
  }
  return granted;
}
