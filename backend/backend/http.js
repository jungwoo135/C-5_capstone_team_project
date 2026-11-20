/**
 * 여러 *-route.js 파일이 함께 쓰는 HTTP 도우미 모음.
 */

/** 화면에 보여줄 문구와 HTTP 상태 코드를 담는 오류 */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** { status, detail } 형식의 JSON 오류 응답을 만듭니다. */
export function errorResponse(status, detail) {
  return Response.json({ status, detail }, { status });
}

/** 요청 본문을 JSON으로 읽습니다. 깨진 JSON이면 null을 돌려줍니다. */
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * service가 던진 오류를 HTTP 응답으로 바꿉니다.
 * ApiError가 아닌 오류(DB 접속 실패 등)는 내부 정보가 화면에 나가지 않도록
 * 자세한 내용을 서버 기록에만 남기고 500으로 답합니다.
 */
export function handleError(error, logLabel) {
  if (error instanceof ApiError) {
    return errorResponse(error.status, error.message);
  }
  console.error(logLabel, error);
  return errorResponse(500, "서버 오류로 처리에 실패했습니다.");
}

/** 1 이상의 정수인지 검사합니다. (ID 검사용) */
export function isValidId(value) {
  return Number.isSafeInteger(value) && value > 0;
}

/** 1~5 사이의 정수인지 검사합니다. (평가 점수 검사용) */
export function isValidScore(value) {
  return Number.isSafeInteger(value) && value >= 1 && value <= 5;
}
