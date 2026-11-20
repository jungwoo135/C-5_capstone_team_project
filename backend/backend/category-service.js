import { query } from "./db.js";

/** 카테고리 전체 목록 (물품 등록 화면의 선택 상자용) */
export async function listCategories() {
  const rows = await query("SELECT category_id, category_name FROM category ORDER BY category_id", []);
  return rows.map((row) => ({
    categoryId: Number(row.category_id),
    categoryName: row.category_name,
  }));
}
