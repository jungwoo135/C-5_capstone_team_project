import { SALES_STATUS } from "./constants.js";
import { query, withTransaction } from "./db.js";
import { ApiError } from "./http.js";
import { koreaNow } from "./time.js";

function isForeignKeyError(error) {
  return error?.errno === 1452 || /foreign key/i.test(error?.message ?? "");
}

/** DB 행(snake_case) → 응답(camelCase) 변환 */
function mapItemRow(row) {
  return {
    itemId: Number(row.item_id),
    title: row.title,
    price: Number(row.price),
    itemImage: row.item_image ?? null,
    salesStatus: row.sales_status,
    aiPhotoVerified: Number(row.ai_photo_verified) === 1,
    createdAt: String(row.created_at).replace(" ", "T"),
    categoryId: Number(row.category_id),
    categoryName: row.category_name,
    sellerId: Number(row.seller_id),
    sellerNickname: row.seller_nickname,
    sellerTrustScore: Number(row.seller_trust_score),
  };
}

/** 물품 등록. 판매자는 로그인한 사용자로 자동 지정되고, 상태는 ON_SALE로 시작합니다. */
export async function createItem({ sellerId, categoryId, title, price, content, itemImage }) {
  try {
    const result = await query(
      `INSERT INTO item (category_id, seller_id, title, price, content, item_image, sales_status, ai_photo_verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [categoryId, sellerId, title, price, content, itemImage, SALES_STATUS.ON_SALE, koreaNow()],
    );
    return { itemId: Number(result.insertId), salesStatus: SALES_STATUS.ON_SALE };
  } catch (error) {
    if (isForeignKeyError(error)) throw new ApiError(400, "존재하지 않는 카테고리입니다.");
    throw error;
  }
}

/**
 * 물품 목록 조회.
 * - categoryId, salesStatus, sellerId(특정 판매자의 물품)로 거를 수 있습니다.
 * - viewerId(로그인한 사용자)가 있으면, 그 사용자가 차단한 유저의 물품은 뺍니다.
 */
export async function listItems({
  categoryId = null,
  salesStatus = null,
  sellerId = null,
  viewerId = null,
  limit = 50,
}) {
  const conditions = [];
  const params = [];
  if (categoryId !== null) {
    conditions.push("i.category_id = ?");
    params.push(categoryId);
  }
  if (salesStatus !== null) {
    conditions.push("i.sales_status = ?");
    params.push(salesStatus);
  }
  if (sellerId !== null) {
    conditions.push("i.seller_id = ?");
    params.push(sellerId);
  }
  if (viewerId !== null) {
    conditions.push(
      "NOT EXISTS (SELECT 1 FROM block_list b WHERE b.blocker_user_id = ? AND b.blocked_user_id = i.seller_id)",
    );
    params.push(viewerId);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  // LIMIT 숫자는 route에서 1~100 정수로 검사한 뒤에만 들어오므로 그대로 붙여도 안전합니다.
  const rows = await query(
    `SELECT i.item_id, i.title, i.price, i.item_image, i.sales_status, i.ai_photo_verified, i.created_at,
            c.category_id, c.category_name,
            u.user_id AS seller_id, u.nickname AS seller_nickname, u.trust_score AS seller_trust_score
       FROM item i
       JOIN category c ON c.category_id = i.category_id
       JOIN users u ON u.user_id = i.seller_id
       ${where}
      ORDER BY i.item_id DESC
      LIMIT ${limit}`,
    params,
  );
  return rows.map(mapItemRow);
}

/** 물품 상세 조회. 카테고리명, 판매자 닉네임·신뢰점수, AI 인증 내역을 함께 돌려줍니다. */
export async function getItemDetail(itemId) {
  const rows = await query(
    `SELECT i.item_id, i.title, i.price, i.content, i.item_image, i.sales_status, i.ai_photo_verified, i.created_at,
            c.category_id, c.category_name,
            u.user_id AS seller_id, u.nickname AS seller_nickname, u.trust_score AS seller_trust_score
       FROM item i
       JOIN category c ON c.category_id = i.category_id
       JOIN users u ON u.user_id = i.seller_id
      WHERE i.item_id = ?`,
    [itemId],
  );
  if (rows.length === 0) throw new ApiError(404, "물품을 찾을 수 없습니다.");

  const authRows = await query(
    "SELECT auth_id, auth_type, reliability_score FROM item_authentication WHERE item_id = ? ORDER BY auth_id DESC",
    [itemId],
  );
  return {
    ...mapItemRow(rows[0]),
    content: rows[0].content,
    authentications: authRows.map((row) => ({
      authId: Number(row.auth_id),
      authType: row.auth_type,
      reliabilityScore: Number(row.reliability_score),
    })),
  };
}

/** 물품을 잠그고(동시 수정 방지), 등록한 판매자 본인인지 확인합니다. */
async function lockOwnItem(connection, itemId, userId) {
  const [rows] = await connection.execute(
    "SELECT item_id, seller_id, sales_status FROM item WHERE item_id = ? FOR UPDATE",
    [itemId],
  );
  if (rows.length === 0) throw new ApiError(404, "물품을 찾을 수 없습니다.");
  if (Number(rows[0].seller_id) !== userId) {
    throw new ApiError(403, "물품을 등록한 판매자만 할 수 있습니다.");
  }
  return rows[0];
}

/** 수정할 수 있는 항목 → DB 컬럼. 이 목록 밖의 이름은 SQL에 들어가지 않습니다. */
const UPDATABLE_COLUMNS = {
  categoryId: "category_id",
  title: "title",
  price: "price",
  content: "content",
  itemImage: "item_image",
};

/** 물품 수정 (판매자 본인만, 판매 완료 전까지). fields에는 바꿀 항목만 담습니다. */
export async function updateItem({ userId, itemId, fields }) {
  return withTransaction(async (connection) => {
    const item = await lockOwnItem(connection, itemId, userId);
    if (item.sales_status === SALES_STATUS.SOLD) {
      throw new ApiError(409, "판매 완료된 물품은 수정할 수 없습니다.");
    }
    const sets = [];
    const params = [];
    for (const [name, column] of Object.entries(UPDATABLE_COLUMNS)) {
      if (fields[name] !== undefined) {
        sets.push(`${column} = ?`);
        params.push(fields[name]);
      }
    }
    params.push(itemId);
    try {
      await connection.execute(`UPDATE item SET ${sets.join(", ")} WHERE item_id = ?`, params);
    } catch (error) {
      if (isForeignKeyError(error)) throw new ApiError(400, "존재하지 않는 카테고리입니다.");
      throw error;
    }
    return { itemId, updatedFields: Object.keys(fields) };
  });
}

/** 판매 상태 전환 (ON_SALE ↔ RESERVED). SOLD는 거래 완료 API로만 바뀝니다. */
export async function updateItemStatus({ userId, itemId, salesStatus }) {
  return withTransaction(async (connection) => {
    const item = await lockOwnItem(connection, itemId, userId);
    if (item.sales_status === SALES_STATUS.SOLD) {
      throw new ApiError(409, "판매 완료된 물품의 상태는 바꿀 수 없습니다.");
    }
    if (item.sales_status !== salesStatus) {
      await connection.execute("UPDATE item SET sales_status = ? WHERE item_id = ?", [salesStatus, itemId]);
    }
    return { itemId, salesStatus };
  });
}

/** 물품 삭제 (판매자 본인만, 판매 완료 전까지). 딸린 찜·인증 기록도 함께 지웁니다. */
export async function deleteItem({ userId, itemId }) {
  return withTransaction(async (connection) => {
    const item = await lockOwnItem(connection, itemId, userId);
    if (item.sales_status === SALES_STATUS.SOLD) {
      throw new ApiError(409, "판매 완료된 물품은 삭제할 수 없습니다.");
    }
    // 판매 완료 전이면 거래 기록이 없어야 정상이지만, 혹시 있으면 지우지 않고 막습니다.
    const [history] = await connection.execute(
      `SELECT (SELECT COUNT(*) FROM item_sales WHERE item_id = ?)
            + (SELECT COUNT(*) FROM item_purchase WHERE item_id = ?)
            + (SELECT COUNT(*) FROM trading_evaluation WHERE item_id = ?) AS n`,
      [itemId, itemId, itemId],
    );
    if (Number(history[0].n) > 0) throw new ApiError(409, "거래 기록이 있는 물품은 삭제할 수 없습니다.");

    await connection.execute("DELETE FROM wishlist WHERE item_id = ?", [itemId]);
    await connection.execute("DELETE FROM item_authentication WHERE item_id = ?", [itemId]);
    await connection.execute("DELETE FROM item WHERE item_id = ?", [itemId]);
    return { itemId, deleted: true };
  });
}
