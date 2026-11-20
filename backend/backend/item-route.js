import { getAuthUser, requireAuth } from "./auth-service.js";
import { SALES_STATUS, SALES_STATUS_VALUES } from "./constants.js";
import { errorResponse, handleError, isValidId, readJson } from "./http.js";
import {
  createItem,
  deleteItem,
  getItemDetail,
  listItems,
  updateItem,
  updateItemStatus,
} from "./item-service.js";

/**
 * 요청 본문에서 물품 항목을 검사해 꺼냅니다.
 * partial=false: 등록용. 필수 항목이 모두 있어야 합니다.
 * partial=true: 수정용. 들어온 항목만 검사합니다.
 */
function readItemFields(body, { partial }) {
  const fields = {};
  const given = (name) => body[name] !== undefined;

  if (!partial || given("categoryId")) {
    if (!isValidId(body.categoryId)) return { error: "categoryId는 1 이상의 정수여야 합니다." };
    fields.categoryId = body.categoryId;
  }
  if (!partial || given("title")) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length < 1 || title.length > 200) return { error: "title은 1~200자여야 합니다." };
    fields.title = title;
  }
  if (!partial || given("price")) {
    if (!Number.isSafeInteger(body.price) || body.price < 0 || body.price > 1000000000) {
      return { error: "price는 0 이상 10억 이하의 정수여야 합니다." };
    }
    fields.price = body.price;
  }
  if (!partial || given("content")) {
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (content.length < 1) return { error: "content를 입력해 주세요." };
    fields.content = content;
  }
  if (given("itemImage")) {
    const { itemImage } = body;
    if (itemImage !== null && (typeof itemImage !== "string" || itemImage.length > 500)) {
      return { error: "itemImage는 500자 이하의 주소여야 합니다." };
    }
    fields.itemImage = itemImage; // null이면 사진 제거
  }
  return { fields };
}

/** 주소의 [itemId]를 숫자로 바꿉니다. */
async function readItemId(context) {
  const { itemId } = await context.params;
  const id = Number(itemId);
  return isValidId(id) ? id : null;
}

/** POST /api/items : 물품 등록 (로그인 필요) */
export async function createItemHandler(request) {
  try {
    const user = requireAuth(request);
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    const checked = readItemFields(body, { partial: false });
    if (checked.error) return errorResponse(400, checked.error);

    const result = await createItem({
      sellerId: user.userId,
      ...checked.fields,
      itemImage: checked.fields.itemImage ?? null,
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleError(error, "물품 등록 실패");
  }
}

/** GET /api/items : 물품 목록 (로그인했다면 차단한 유저의 물품은 빠짐) */
export async function listItemsHandler(request) {
  try {
    const params = new URL(request.url).searchParams;
    const filters = { viewerId: getAuthUser(request)?.userId ?? null };

    if (params.get("categoryId") !== null) {
      const categoryId = Number(params.get("categoryId"));
      if (!isValidId(categoryId)) return errorResponse(400, "categoryId는 1 이상의 정수여야 합니다.");
      filters.categoryId = categoryId;
    }
    if (params.get("salesStatus") !== null) {
      const salesStatus = params.get("salesStatus");
      if (!SALES_STATUS_VALUES.includes(salesStatus)) {
        return errorResponse(400, `salesStatus는 ${SALES_STATUS_VALUES.join(", ")} 중 하나여야 합니다.`);
      }
      filters.salesStatus = salesStatus;
    }
    if (params.get("limit") !== null) {
      const limit = Number(params.get("limit"));
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        return errorResponse(400, "limit는 1~100 사이의 정수여야 합니다.");
      }
      filters.limit = limit;
    }

    return Response.json({ items: await listItems(filters) });
  } catch (error) {
    return handleError(error, "물품 목록 조회 실패");
  }
}

/** GET /api/items/[itemId] : 물품 상세 */
export async function itemDetailHandler(request, context) {
  try {
    const itemId = await readItemId(context);
    if (!itemId) return errorResponse(400, "물품 ID가 올바르지 않습니다.");
    return Response.json(await getItemDetail(itemId));
  } catch (error) {
    return handleError(error, "물품 상세 조회 실패");
  }
}

/** PUT /api/items/[itemId] : 물품 수정 (판매자 본인만). 바꿀 항목만 보내면 됩니다. */
export async function updateItemHandler(request, context) {
  try {
    const user = requireAuth(request);
    const itemId = await readItemId(context);
    if (!itemId) return errorResponse(400, "물품 ID가 올바르지 않습니다.");
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    const checked = readItemFields(body, { partial: true });
    if (checked.error) return errorResponse(400, checked.error);
    if (Object.keys(checked.fields).length === 0) {
      return errorResponse(400, "수정할 항목이 없습니다. (categoryId, title, price, content, itemImage 중 하나 이상)");
    }
    return Response.json(await updateItem({ userId: user.userId, itemId, fields: checked.fields }));
  } catch (error) {
    return handleError(error, "물품 수정 실패");
  }
}

/** PATCH /api/items/[itemId]/status : 판매 상태 전환 (ON_SALE ↔ RESERVED, 판매자 본인만) */
export async function updateItemStatusHandler(request, context) {
  try {
    const user = requireAuth(request);
    const itemId = await readItemId(context);
    if (!itemId) return errorResponse(400, "물품 ID가 올바르지 않습니다.");
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    const { salesStatus } = body;
    if (salesStatus !== SALES_STATUS.ON_SALE && salesStatus !== SALES_STATUS.RESERVED) {
      return errorResponse(400, "salesStatus는 ON_SALE 또는 RESERVED여야 합니다. (SOLD는 거래 완료 API로만 바뀝니다)");
    }
    return Response.json(await updateItemStatus({ userId: user.userId, itemId, salesStatus }));
  } catch (error) {
    return handleError(error, "판매 상태 변경 실패");
  }
}

/** DELETE /api/items/[itemId] : 물품 삭제 (판매자 본인만, 판매 완료 전까지) */
export async function deleteItemHandler(request, context) {
  try {
    const user = requireAuth(request);
    const itemId = await readItemId(context);
    if (!itemId) return errorResponse(400, "물품 ID가 올바르지 않습니다.");
    return Response.json(await deleteItem({ userId: user.userId, itemId }));
  } catch (error) {
    return handleError(error, "물품 삭제 실패");
  }
}
