import { ApiError, apiRequest } from './api';

export interface Item {
  itemId: number | string;
  title: string;
  price: number;
  itemImage?: string | null;
  salesStatus?: string;
  createdAt?: string | null;
  categoryName?: string | null;
  location?: string | null;
  condition?: string | null;
  content?: string | null;
  sellerNickname?: string | null;
  sellerTrustScore?: number | null;
  aiPhotoVerified?: boolean;
}

function isItem(value: unknown): value is Item {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<Item>;
  return (
    ((typeof item.itemId === 'number' && Number.isFinite(item.itemId)) ||
      (typeof item.itemId === 'string' && item.itemId.trim().length > 0)) &&
    typeof item.title === 'string' &&
    typeof item.price === 'number' &&
    Number.isFinite(item.price) &&
    (item.itemImage == null || typeof item.itemImage === 'string') &&
    (item.createdAt == null || typeof item.createdAt === 'string') &&
    (item.categoryName == null || typeof item.categoryName === 'string') &&
    (item.location == null || typeof item.location === 'string') &&
    (item.condition == null || typeof item.condition === 'string') &&
    (item.sellerNickname == null || typeof item.sellerNickname === 'string') &&
    (item.content == null || typeof item.content === 'string')
  );
}

export async function getItems(): Promise<Item[]> {
  const response = await apiRequest<{ items?: unknown }>('/api/items');
  if (!Array.isArray(response?.items) || !response.items.every(isItem)) {
    throw new ApiError('상품 목록 응답을 읽을 수 없습니다.');
  }
  return response.items;
}

export async function getItem(itemId: string): Promise<Item | null> {
  try {
    const item = await apiRequest<unknown>(
      `/api/items/${encodeURIComponent(itemId)}`
    );
    if (!isItem(item) || String(item.itemId) !== itemId) {
      throw new ApiError('상품 상세 응답을 읽을 수 없습니다.');
    }
    return item;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
