import { requireAuth } from "./auth-service.js";
import { REPORT_REASON_VALUES, REPORT_TARGET_TYPE_VALUES } from "./constants.js";
import { errorResponse, handleError, isValidId, readJson } from "./http.js";
import { createReport } from "./report-service.js";

/**
 * POST /api/reports : 신고 (로그인 필요)
 * 본문 { targetType: USER|ITEM|MESSAGE, targetId, reason: FRAUD|ABUSE|SPAM|FAKE|OTHER, detail? }
 */
export async function createReportHandler(request) {
  try {
    const user = requireAuth(request);
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    const { targetType, targetId, reason, detail } = body;
    if (!REPORT_TARGET_TYPE_VALUES.includes(targetType)) {
      return errorResponse(400, `targetType은 ${REPORT_TARGET_TYPE_VALUES.join(", ")} 중 하나여야 합니다.`);
    }
    if (!isValidId(targetId)) return errorResponse(400, "targetId는 1 이상의 정수여야 합니다.");
    if (!REPORT_REASON_VALUES.includes(reason)) {
      return errorResponse(400, `reason은 ${REPORT_REASON_VALUES.join(", ")} 중 하나여야 합니다.`);
    }
    if (detail !== undefined && detail !== null && typeof detail !== "string") {
      return errorResponse(400, "detail은 문자열이어야 합니다.");
    }
    if (typeof detail === "string" && detail.length > 1000) return errorResponse(400, "detail은 1000자 이하여야 합니다.");
    const result = await createReport({ reporterId: user.userId, targetType, targetId, reason, detail });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleError(error, "신고 접수 실패");
  }
}
