import { listCategories } from "./category-service.js";
import { handleError } from "./http.js";

/** GET /api/categories : 카테고리 목록 (누구나 조회 가능) */
export async function listCategoriesHandler() {
  try {
    return Response.json({ categories: await listCategories() });
  } catch (error) {
    return handleError(error, "카테고리 목록 조회 실패");
  }
}
