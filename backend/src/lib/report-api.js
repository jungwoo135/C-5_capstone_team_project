/** 신고 API를 호출하는 화면용 함수 모음. */

async function callApi(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error("서버에 연결할 수 없습니다.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.detail ?? `요청에 실패했습니다. (오류 코드 ${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

const jsonPost = (data) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data ?? {}),
});

/**
 * 신고. targetType: "USER" | "ITEM" | "MESSAGE", reason: "FRAUD" | "ABUSE" | "SPAM" | "FAKE" | "OTHER"
 * 같은 대상을 두 번 신고하면 409가 옵니다.
 */
export async function report({ targetType, targetId, reason, detail }) {
  return callApi("/api/reports", jsonPost({ targetType, targetId, reason, detail }));
}
