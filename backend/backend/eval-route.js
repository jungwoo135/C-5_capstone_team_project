import { requireAuth } from "./auth-service.js";
import { MEMBER_TYPE_VALUES } from "./constants.js";
import { errorResponse, handleError, isValidId, isValidScore, readJson } from "./http.js";
import { submitEvaluation } from "./eval-service.js";

/** POST /api/evaluations : 거래 평가 등록 (거래 당사자만, 로그인 필요) */
export async function submitEvaluationHandler(request) {
  try {
    const user = requireAuth(request);
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");

    const { itemId, memberTypeCode, mannerScore, commScore, timeScore } = body;
    if (!isValidId(itemId)) return errorResponse(400, "itemId는 1 이상의 정수여야 합니다.");
    if (!MEMBER_TYPE_VALUES.includes(memberTypeCode)) {
      return errorResponse(400, `memberTypeCode는 ${MEMBER_TYPE_VALUES.join(", ")} 중 하나여야 합니다.`);
    }
    if (![mannerScore, commScore, timeScore].every(isValidScore)) {
      return errorResponse(400, "mannerScore, commScore, timeScore는 1~5 사이의 정수여야 합니다.");
    }

    const result = await submitEvaluation({
      writerId: user.userId,
      itemId,
      memberTypeCode,
      mannerScore,
      commScore,
      timeScore,
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleError(error, "거래 평가 실패");
  }
}
