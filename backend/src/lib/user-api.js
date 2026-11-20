/**
 * 유저 프로필·마이페이지 API를 호출하는 화면용 함수 모음.
 * userId 자리에 "me"를 넣으면 로그인한 본인을 뜻합니다.
 */

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

/** 유저 프로필: 닉네임, 지역, 신뢰점수, 등록 물품 수, 거래 횟수, 뱃지 */
export async function getUserProfile(userId = "me") {
  return callApi(`/api/users/${userId}`);
}

/** 그 유저가 등록한 물품 목록. 예: getUserItems("me", { salesStatus: "ON_SALE" }) */
export async function getUserItems(userId = "me", { salesStatus, limit } = {}) {
  const params = new URLSearchParams();
  if (salesStatus != null) params.set("salesStatus", salesStatus);
  if (limit != null) params.set("limit", String(limit));
  const queryString = params.toString();
  const body = await callApi(`/api/users/${userId}/items${queryString ? `?${queryString}` : ""}`);
  return body.items;
}

/**
 * 내 거래 내역 { sales: [...], purchases: [...] } (로그인 필요)
 * 각 항목의 evaluated가 false면 아직 평가하지 않은 거래입니다.
 */
export async function getMyTrades() {
  return callApi("/api/users/me/trades");
}
