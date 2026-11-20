/** 찜·차단·뱃지 API를 호출하는 화면용 함수 모음. */

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
  body: JSON.stringify(data),
});

/** 찜 토글. 돌려받은 wished가 true면 찜 추가, false면 해제된 것입니다. */
export async function toggleWish(itemId) {
  return callApi("/api/wishlist", jsonPost({ itemId }));
}

/** 내가 찜한 물품 목록 */
export async function getMyWishlist() {
  const body = await callApi("/api/wishlist");
  return body.wishes;
}

/** 유저 차단 */
export async function blockUser(targetUserId) {
  return callApi("/api/blocks", jsonPost({ targetUserId }));
}

/** 차단 해제 */
export async function unblockUser(targetUserId) {
  return callApi(`/api/blocks/${targetUserId}`, { method: "DELETE" });
}

/** 내가 차단한 유저 목록 */
export async function getMyBlocks() {
  const body = await callApi("/api/blocks");
  return body.blocks;
}

/** 어떤 유저가 받은 뱃지 목록 */
export async function getUserBadges(userId) {
  const body = await callApi(`/api/users/${userId}/badges`);
  return body.badges;
}
