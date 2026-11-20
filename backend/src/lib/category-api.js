/** 카테고리 API를 호출하는 화면용 함수. */

/** 카테고리 전체 목록. 물품 등록 화면의 선택 상자를 채울 때 씁니다. */
export async function getCategories() {
  let response;
  try {
    response = await fetch("/api/categories");
  } catch {
    throw new Error("서버에 연결할 수 없습니다.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.detail ?? `카테고리 조회에 실패했습니다. (오류 코드 ${response.status})`);
  }
  return body.categories;
}
