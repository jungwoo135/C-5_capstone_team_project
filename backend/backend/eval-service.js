import { MEMBER_TYPE, SALES_STATUS } from "./constants.js";
import { withTransaction } from "./db.js";
import { ApiError } from "./http.js";
import { grantEligibleBadges } from "./social-service.js";

function isDuplicateError(error) {
  return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062 || /duplicate/i.test(error?.message ?? "");
}

/**
 * 신뢰점수 계산 공식 (기본값 50, 항상 0~100 사이로 자름)
 *
 *   평가점수백분율 = ((매너+소통+시간)/3 - 1) / 4 * 100   ← 1~5점 평균을 0~100으로 변환
 *   반영값       = 물품에 AI 인증이 없으면: 평가점수백분율
 *                 있으면: 0.8 * 평가점수백분율 + 0.2 * (그 물품 인증들의 reliability_score 평균)
 *   새 신뢰점수   = 반올림(0.7 * 기존 점수 + 0.3 * 반영값)
 *
 * 기존 점수를 70% 유지하므로, 평가 한 번에 점수가 급격히 출렁이지 않습니다.
 */
export function computeNewTrustScore(currentScore, mannerScore, commScore, timeScore, reliabilityAvg) {
  const average = (mannerScore + commScore + timeScore) / 3; // 1~5
  const evalPercent = ((average - 1) / 4) * 100; // 0~100
  const blended = reliabilityAvg === null ? evalPercent : 0.8 * evalPercent + 0.2 * reliabilityAvg;
  const next = Math.round(0.7 * currentScore + 0.3 * blended);
  return Math.min(100, Math.max(0, next));
}

/**
 * 거래 평가 등록.
 * 확인 → 저장 → 신뢰점수 갱신 → 뱃지 부여까지 하나의 트랜잭션입니다.
 * 중간에 하나라도 실패하면 전부 취소됩니다.
 */
export async function submitEvaluation({ writerId, itemId, memberTypeCode, mannerScore, commScore, timeScore, reviewText = null }) {
  return withTransaction(async (connection) => {
    // 1. 물품을 잠그고(동시 요청 직렬화) 판매 완료 상태인지 확인합니다.
    const [items] = await connection.execute(
      "SELECT sales_status FROM item WHERE item_id = ? FOR UPDATE",
      [itemId],
    );
    if (items.length === 0) throw new ApiError(404, "물품을 찾을 수 없습니다.");
    if (items[0].sales_status !== SALES_STATUS.SOLD) {
      throw new ApiError(409, "판매 완료된 물품만 평가할 수 있습니다.");
    }

    // 2. 가장 최근 거래 기록으로 실제 당사자(판매자·구매자)를 확인합니다.
    const [sales] = await connection.execute(
      "SELECT seller_id FROM item_sales WHERE item_id = ? ORDER BY sales_id DESC LIMIT 1",
      [itemId],
    );
    const [purchases] = await connection.execute(
      "SELECT buyer_id FROM item_purchase WHERE item_id = ? ORDER BY purchase_id DESC LIMIT 1",
      [itemId],
    );
    if (sales.length === 0 || purchases.length === 0) {
      throw new ApiError(409, "이 물품의 거래 기록을 찾을 수 없습니다.");
    }
    const sellerId = Number(sales[0].seller_id);
    const buyerId = Number(purchases[0].buyer_id);

    // 작성자가 주장한 역할(SELLER/BUYER)과 실제 거래 기록이 일치해야 합니다.
    const expectedWriterId = memberTypeCode === MEMBER_TYPE.SELLER ? sellerId : buyerId;
    if (writerId !== expectedWriterId) {
      throw new ApiError(403, "이 거래의 당사자만 해당 역할로 평가를 작성할 수 있습니다.");
    }
    // 평가를 받는 사람은 거래 상대방입니다.
    const targetUserId = memberTypeCode === MEMBER_TYPE.SELLER ? buyerId : sellerId;

    // 3. 같은 물품에 같은 작성자가 이미 평가했는지 확인합니다.
    const [duplicates] = await connection.execute(
      "SELECT eval_id FROM trading_evaluation WHERE item_id = ? AND user_id = ?",
      [itemId, writerId],
    );
    if (duplicates.length > 0) throw new ApiError(409, "이미 이 거래에 평가를 남겼습니다.");

    // 4. 평가 저장 (UNIQUE 제약이 있어, 동시에 두 번 보내도 한 건만 저장됩니다)
    let evalResult;
    try {
      [evalResult] = await connection.execute(
        `INSERT INTO trading_evaluation (item_id, user_id, member_type_code, manner_score, comm_score, time_score, review_text)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemId, writerId, memberTypeCode, mannerScore, commScore, timeScore, reviewText],
      );
    } catch (error) {
      if (isDuplicateError(error)) throw new ApiError(409, "이미 이 거래에 평가를 남겼습니다.");
      throw error;
    }

    // 5. 상대방을 잠그고 신뢰점수를 다시 계산합니다.
    const [targets] = await connection.execute(
      "SELECT trust_score FROM users WHERE user_id = ? FOR UPDATE",
      [targetUserId],
    );
    if (targets.length === 0) throw new ApiError(409, "평가 대상 유저를 찾을 수 없습니다.");
    const [reliabilityRows] = await connection.execute(
      "SELECT AVG(reliability_score) AS avg_score FROM item_authentication WHERE item_id = ?",
      [itemId],
    );
    const reliabilityAvg =
      reliabilityRows[0].avg_score === null ? null : Number(reliabilityRows[0].avg_score);
    const newTrustScore = computeNewTrustScore(
      Number(targets[0].trust_score),
      mannerScore,
      commScore,
      timeScore,
      reliabilityAvg,
    );
    await connection.execute("UPDATE users SET trust_score = ? WHERE user_id = ?", [
      newTrustScore,
      targetUserId,
    ]);

    // 6. 새 점수·거래 횟수로 조건을 채운 뱃지를 자동 부여합니다.
    const grantedBadges = await grantEligibleBadges(connection, targetUserId);

    return {
      evalId: Number(evalResult.insertId),
      itemId,
      targetUserId,
      newTrustScore,
      grantedBadges,
      reviewText,
    };
  });
}
