import { withTransaction } from "./db.js";

/** 거래가 끝난 물품의 판매 상태 값 */
export const SALES_STATUS_SOLD = "SOLD";

/** 화면에 보여줄 문구와 HTTP 상태 코드를 담는 오류 */
export class TradeError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * AWS 서버의 기본 시간대는 보통 UTC이므로 한국 시간을 직접 만듭니다.
 * 결과 예: "2026-11-06 13:46:00" (DATETIME 형식, 초 단위)
 */
function koreaNow() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date());
}

/**
 * 거래 완료 처리.
 * 아래 저장 작업은 전부 성공하거나 전부 취소됩니다.
 */
export async function completeTrade({ itemId, sellerId, buyerId }) {
  if (sellerId === buyerId) {
    throw new TradeError(400, "판매자와 구매자는 같을 수 없습니다.");
  }

  return withTransaction(async (connection) => {
    // 1. 물품을 잠그고, 이미 팔린 물품인지 확인합니다.
    // FOR UPDATE: 같은 물품에 요청이 동시에 와도 하나씩 차례로 처리되어 이중 판매를 막습니다.
    const [items] = await connection.execute(
      "SELECT item_id, sales_status FROM item WHERE item_id = ? FOR UPDATE",
      [itemId],
    );
    if (items.length === 0) {
      throw new TradeError(404, "물품을 찾을 수 없습니다.");
    }
    if (items[0].sales_status === SALES_STATUS_SOLD) {
      throw new TradeError(409, "이미 판매 완료된 물품입니다.");
    }

    // 2. 판매자와 구매자를 ID가 작은 순서대로 잠급니다.
    // 잠그는 순서를 통일해, 두 거래가 서로의 잠금을 기다리다 멈추는 일(교착 상태)을 줄입니다.
    const [users] = await connection.execute(
      "SELECT user_id FROM users WHERE user_id IN (?, ?) ORDER BY user_id FOR UPDATE",
      [sellerId, buyerId],
    );
    const foundUserIds = users.map((user) => Number(user.user_id));
    if (!foundUserIds.includes(sellerId)) {
      throw new TradeError(404, "판매자를 찾을 수 없습니다.");
    }
    if (!foundUserIds.includes(buyerId)) {
      throw new TradeError(404, "구매자를 찾을 수 없습니다.");
    }

    // 3. 판매 기록과 구매 기록을 만듭니다.
    const now = koreaNow();
    const [salesResult] = await connection.execute(
      "INSERT INTO item_sales (seller_id, item_id, sales_date) VALUES (?, ?, ?)",
      [sellerId, itemId, now],
    );
    const [purchaseResult] = await connection.execute(
      "INSERT INTO item_purchase (buyer_id, item_id, purchase_date) VALUES (?, ?, ?)",
      [buyerId, itemId, now],
    );

    // 4. users.sales_record_id, users.purchase_record_id, item.sales_status를 바꿉니다.
    await connection.execute(
      "UPDATE users SET sales_record_id = ? WHERE user_id = ?",
      [salesResult.insertId, sellerId],
    );
    await connection.execute(
      "UPDATE users SET purchase_record_id = ? WHERE user_id = ?",
      [purchaseResult.insertId, buyerId],
    );
    await connection.execute(
      "UPDATE item SET sales_status = ? WHERE item_id = ?",
      [SALES_STATUS_SOLD, itemId],
    );

    return {
      salesId: salesResult.insertId,
      purchaseId: purchaseResult.insertId,
      itemId,
      salesStatus: SALES_STATUS_SOLD,
      completedAt: now.replace(" ", "T"),
    };
  });
}
