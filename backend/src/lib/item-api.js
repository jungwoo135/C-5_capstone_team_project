/** 물품 API를 호출하는 화면용 함수 모음. */

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

/** 물품 등록 (로그인 필요). itemImage는 선택입니다. */
export async function createItem({ categoryId, title, price, content, itemImage }) {
  return callApi("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryId, title, price, content, itemImage }),
  });
}

/**
 * 물품 목록 조회. 필터는 모두 선택입니다.
 * 예: getItems({ categoryId: 1, salesStatus: "ON_SALE", limit: 20 })
 */
export async function getItems({ categoryId, salesStatus, limit } = {}) {
  const params = new URLSearchParams();
  if (categoryId != null) params.set("categoryId", String(categoryId));
  if (salesStatus != null) params.set("salesStatus", salesStatus);
  if (limit != null) params.set("limit", String(limit));
  const queryString = params.toString();
  const body = await callApi(`/api/items${queryString ? `?${queryString}` : ""}`);
  return body.items;
}

/** 물품 상세 조회 */
export async function getItem(itemId) {
  return callApi(`/api/items/${itemId}`);
}

/**
 * 물품 수정 (등록한 판매자만, 판매 완료 전까지). 바꿀 항목만 넣으면 됩니다.
 * 예: updateItem(7, { price: 45000 }), updateItem(7, { itemImage: null }) → 사진 제거
 */
export async function updateItem(itemId, fields) {
  return callApi(`/api/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
}

/** 판매 상태 전환. salesStatus는 "ON_SALE" 또는 "RESERVED" (판매 완료는 거래 완료 API로) */
export async function updateItemStatus(itemId, salesStatus) {
  return callApi(`/api/items/${itemId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ salesStatus }),
  });
}

/** 물품 삭제 (등록한 판매자만, 판매 완료 전까지) */
export async function deleteItem(itemId) {
  return callApi(`/api/items/${itemId}`, { method: "DELETE" });
}
