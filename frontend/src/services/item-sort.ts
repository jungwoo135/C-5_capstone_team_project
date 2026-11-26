import type { Item } from './item-service';

export const ITEM_SORT_LABELS = {
  newest: '최신순',
  priceLow: '낮은가격순',
  priceHigh: '높은가격순',
  trust: '신뢰도순',
} as const;

export type ItemSort = keyof typeof ITEM_SORT_LABELS;

function compareNewest(a: Item, b: Item) {
  return String(b.itemId).localeCompare(String(a.itemId), 'en', { numeric: true });
}

export function compareItems(a: Item, b: Item, sort: ItemSort): number {
  switch (sort) {
    case 'priceLow':
      return a.price - b.price || compareNewest(a, b);
    case 'priceHigh':
      return b.price - a.price || compareNewest(a, b);
    case 'trust': {
      const trustA = a.sellerTrustScore ?? Number.NEGATIVE_INFINITY;
      const trustB = b.sellerTrustScore ?? Number.NEGATIVE_INFINITY;
      return trustB - trustA || compareNewest(a, b);
    }
    case 'newest':
      return compareNewest(a, b);
  }
}
