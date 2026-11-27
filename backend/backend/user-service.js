import { query } from "./db.js";
import { ApiError } from "./http.js";
import { getUserBadges } from "./social-service.js";

/**
 * 이 유저가 "받은" 한 줄 후기 최근 5개.
 * 구매자(BUYER)가 쓴 평가는 물품 판매자가 받은 것, 판매자(SELLER)가 쓴 평가는 그 물품 구매자가 받은 것입니다.
 */
async function getRecentReviews(userId) {
  const rows = await query(
    `SELECT e.eval_id, e.review_text, e.manner_score, e.comm_score, e.time_score, e.member_type_code,
            u.nickname AS writer_nickname, i.item_id, i.title
       FROM trading_evaluation e
       JOIN item i ON i.item_id = e.item_id
       JOIN users u ON u.user_id = e.user_id
      WHERE e.review_text IS NOT NULL
        AND (
          (e.member_type_code = 'BUYER' AND i.seller_id = ?)
          OR (e.member_type_code = 'SELLER'
              AND EXISTS (SELECT 1 FROM item_purchase p WHERE p.item_id = e.item_id AND p.buyer_id = ?))
        )
      ORDER BY e.eval_id DESC
      LIMIT 5`,
    [userId, userId],
  );
  return rows.map((row) => ({
    evalId: Number(row.eval_id),
    itemId: Number(row.item_id),
    itemTitle: row.title,
    writerNickname: row.writer_nickname,
    writerRole: row.member_type_code,
    reviewText: row.review_text,
    averageScore: Math.round(((Number(row.manner_score) + Number(row.comm_score) + Number(row.time_score)) / 3) * 10) / 10,
  }));
}

/** 유저 프로필: 기본 정보 + 등록 물품 수 + 거래 횟수 + 뱃지 + 받은 후기 (누구나 볼 수 있는 정보만) */
export async function getUserProfile(userId) {
  const rows = await query(
    `SELECT u.user_id, u.nickname, u.region_code, u.trust_score,
            (SELECT COUNT(*) FROM item i WHERE i.seller_id = u.user_id) AS item_count,
            (SELECT COUNT(*) FROM item_sales s WHERE s.seller_id = u.user_id) AS sales_count,
            (SELECT COUNT(*) FROM item_purchase p WHERE p.buyer_id = u.user_id) AS purchase_count
       FROM users u
      WHERE u.user_id = ?`,
    [userId],
  );
  if (rows.length === 0) throw new ApiError(404, "유저를 찾을 수 없습니다.");
  const row = rows[0];
  const salesCount = Number(row.sales_count);
  const purchaseCount = Number(row.purchase_count);
  return {
    userId: Number(row.user_id),
    nickname: row.nickname,
    regionCode: String(row.region_code),
    trustScore: Number(row.trust_score),
    itemCount: Number(row.item_count),
    salesCount,
    purchaseCount,
    tradeCount: salesCount + purchaseCount,
    badges: await getUserBadges(userId),
    recentReviews: await getRecentReviews(userId),
  };
}

function mapTradeRow(row, counterpartKey) {
  return {
    itemId: Number(row.item_id),
    title: row.title,
    price: Number(row.price),
    itemImage: row.item_image ?? null,
    tradedAt: String(row.traded_at).replace(" ", "T"),
    [`${counterpartKey}Id`]: row.counterpart_id === null ? null : Number(row.counterpart_id),
    [`${counterpartKey}Nickname`]: row.counterpart_nickname ?? null,
    // 내가 이 거래에 평가를 남겼는지 (화면에서 "평가하기" 버튼을 보여줄지 결정할 때 사용)
    evaluated: Number(row.evaluated) === 1,
  };
}

/** 내 거래 내역: 내가 판매한 것과 구매한 것 (본인만 조회 가능) */
export async function getMyTrades(userId) {
  const sales = await query(
    `SELECT s.sales_id, s.sales_date AS traded_at, i.item_id, i.title, i.price, i.item_image,
            p.buyer_id AS counterpart_id, bu.nickname AS counterpart_nickname,
            EXISTS (SELECT 1 FROM trading_evaluation e WHERE e.item_id = i.item_id AND e.user_id = ?) AS evaluated
       FROM item_sales s
       JOIN item i ON i.item_id = s.item_id
       LEFT JOIN item_purchase p ON p.purchase_id = (SELECT MAX(purchase_id) FROM item_purchase WHERE item_id = s.item_id)
       LEFT JOIN users bu ON bu.user_id = p.buyer_id
      WHERE s.seller_id = ?
      ORDER BY s.sales_id DESC`,
    [userId, userId],
  );
  const purchases = await query(
    `SELECT p.purchase_id, p.purchase_date AS traded_at, i.item_id, i.title, i.price, i.item_image,
            s.seller_id AS counterpart_id, su.nickname AS counterpart_nickname,
            EXISTS (SELECT 1 FROM trading_evaluation e WHERE e.item_id = i.item_id AND e.user_id = ?) AS evaluated
       FROM item_purchase p
       JOIN item i ON i.item_id = p.item_id
       LEFT JOIN item_sales s ON s.sales_id = (SELECT MAX(sales_id) FROM item_sales WHERE item_id = p.item_id)
       LEFT JOIN users su ON su.user_id = s.seller_id
      WHERE p.buyer_id = ?
      ORDER BY p.purchase_id DESC`,
    [userId, userId],
  );
  return {
    sales: sales.map((row) => ({ salesId: Number(row.sales_id), ...mapTradeRow(row, "buyer") })),
    purchases: purchases.map((row) => ({ purchaseId: Number(row.purchase_id), ...mapTradeRow(row, "seller") })),
  };
}
