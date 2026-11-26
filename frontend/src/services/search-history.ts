import AsyncStorage from '@react-native-async-storage/async-storage';

const key = 'recent-item-searches';
let pending = Promise.resolve();

async function readHistory(): Promise<string[]> {
  const value = await AsyncStorage.getItem(key);
  const history: unknown = value ? JSON.parse(value) : [];
  return Array.isArray(history)
    ? history.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

export async function getSearchHistory() {
  await pending;
  return readHistory();
}

export function updateSearchHistory(update: (history: string[]) => string[]) {
  const write = pending.then(async () => {
    const history = update(await readHistory().catch(() => []));
    await AsyncStorage.setItem(key, JSON.stringify(history));
    return history;
  });
  pending = write.then(() => {}, () => {});
  return write;
}

export function rememberSearch(term: string) {
  return updateSearchHistory((history) => [
    term,
    ...history.filter((entry) => entry.toLowerCase() !== term.toLowerCase()),
  ].slice(0, 10));
}
