import type { Item } from './item-service';

const thirtyDays = 30 * 24 * 60 * 60 * 1000;

export function filterRecentItems(items: Item[], now = Date.now()): Item[] {
  return items.filter(({ createdAt }) => {
    if (!createdAt) return false;
    const registeredAt = Date.parse(createdAt);
    return registeredAt >= now - thirtyDays && registeredAt <= now;
  });
}
