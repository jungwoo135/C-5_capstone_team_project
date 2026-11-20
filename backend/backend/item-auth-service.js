import { query, withTransaction } from "./db.js";
import { ApiError } from "./http.js";

/** AI 서버 응답을 기다리는 최대 시간 (밀리초). .env의 AI_SERVER_TIMEOUT_MS로 바꿀 수 있습니다. */
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Python AI 서버에 사진 검토를 요청합니다. (요청·응답 형식: docs/AI_SERVER_SPEC.md)
 * AI 서버가 꺼져 있거나 느려도 우리 서버가 같이 멈추지 않도록,
 * 제한 시간이 지나면 요청을 끊고 502 오류로 처리합니다.
 */
async function callAiServer({ itemId, authType, serialNumber, authImage }) {
  const url = process.env.AI_SERVER_URL;
  if (!url) {
    throw new ApiError(503, "AI 서버 주소(AI_SERVER_URL)가 설정되지 않아 물품 인증을 처리할 수 없습니다.");
  }
  const timeoutMs = Number(process.env.AI_SERVER_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, authType, serialNumber, authImage }),
      // AbortSignal.timeout: 제한 시간이 지나면 fetch를 강제로 중단시킵니다.
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    console.error("AI 서버 호출 실패", error);
    throw new ApiError(502, "AI 서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!response.ok) {
    throw new ApiError(502, `AI 서버가 오류를 돌려주었습니다. (코드 ${response.status})`);
  }

  const result = await response.json().catch(() => null);
  const score = Number(result?.reliabilityScore);
  if (typeof result?.photoVerified !== "boolean" || !Number.isFinite(score) || score < 0 || score > 100) {
    throw new ApiError(502, "AI 서버 응답 형식이 올바르지 않습니다. (docs/AI_SERVER_SPEC.md 참고)");
  }
  return { photoVerified: result.photoVerified, reliabilityScore: score };
}

/**
 * 물품 인증 처리.
 * 순서가 중요합니다: AI 호출은 오래 걸릴 수 있으므로 DB 트랜잭션(잠금) "밖"에서 먼저 하고,
 * 결과 저장만 트랜잭션으로 묶습니다. 저장은 전부 성공하거나 전부 취소됩니다.
 */
export async function authenticateItem({ userId, itemId, authType, serialNumber, authImage }) {
  // 1. AI를 부르기 전에 물품과 권한부터 확인합니다. (헛걸음 방지)
  const items = await query("SELECT seller_id FROM item WHERE item_id = ?", [itemId]);
  if (items.length === 0) throw new ApiError(404, "물품을 찾을 수 없습니다.");
  if (Number(items[0].seller_id) !== userId) {
    throw new ApiError(403, "물품을 등록한 판매자만 인증을 요청할 수 있습니다.");
  }

  // 2. AI 서버 호출 (실패하면 여기서 끝나고, DB에는 아무것도 저장되지 않습니다)
  const ai = await callAiServer({ itemId, authType, serialNumber, authImage });

  // 3. 결과 저장: 인증 기록 추가 + 물품의 AI 검토 여부 갱신
  return withTransaction(async (connection) => {
    const [locked] = await connection.execute(
      "SELECT seller_id FROM item WHERE item_id = ? FOR UPDATE",
      [itemId],
    );
    if (locked.length === 0 || Number(locked[0].seller_id) !== userId) {
      throw new ApiError(409, "물품 정보가 바뀌어 인증 결과를 저장하지 못했습니다.");
    }
    const [insertResult] = await connection.execute(
      `INSERT INTO item_authentication (item_id, auth_type, serial_number, auth_image, reliability_score)
       VALUES (?, ?, ?, ?, ?)`,
      [itemId, authType, serialNumber, authImage, ai.reliabilityScore],
    );
    await connection.execute(
      "UPDATE item SET ai_photo_verified = ? WHERE item_id = ?",
      [ai.photoVerified ? 1 : 0, itemId],
    );
    return {
      authId: Number(insertResult.insertId),
      itemId,
      photoVerified: ai.photoVerified,
      reliabilityScore: ai.reliabilityScore,
    };
  });
}
