import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../constants/theme';
import { getItems, type Item } from '../services/item-service';
import { compareItems, ITEM_SORT_LABELS, type ItemSort } from '../services/item-sort';
import { filterRecentItems } from '../services/recent-items';
import { getSearchHistory, rememberSearch, updateSearchHistory } from '../services/search-history';
import ProductImage from './product-image';
import SearchSortSheet from './search-sort-sheet';

const palette = {
  background: '#FAF7F2',
  field: '#F0EAE1',
  accent: '#71445F',
  panel: '#EEE2E8',
  divider: '#E6DFD8',
};

const sortOptions: ItemSort[] = ['newest', 'priceLow', 'priceHigh', 'trust'];

function showPhotoSearch() {
  Keyboard.dismiss();
  router.push('/image-search');
}

export default function SearchScreen({ query, recentItems = false }: { query?: string; recentItems?: boolean }) {
  const isResults = recentItems || query !== undefined;
  const showsItems = recentItems || Boolean(query);
  const [text, setText] = useState(query ?? '');
  const [history, setHistory] = useState<string[]>();
  const [historyError, setHistoryError] = useState(false);
  const [items, setItems] = useState<Item[] | 'error'>();
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState<ItemSort>(recentItems ? 'newest' : 'trust');
  const [pendingSort, setPendingSort] = useState<ItemSort | null>(null);
  const { height } = useWindowDimensions();

  useFocusEffect(useCallback(() => {
    if (isResults) return;
    let active = true;
    getSearchHistory().then(
      (entries) => {
        if (active) {
          setHistory(entries);
          setHistoryError(false);
        }
      },
      () => {
        if (active) setHistoryError(true);
      }
    );
    return () => {
      active = false;
    };
  }, [isResults]));

  useEffect(() => {
    if (!showsItems) return;
    let active = true;
    getItems().then(
      (data) => {
        if (active) setItems(recentItems ? filterRecentItems(data) : data);
      },
      () => { if (active) setItems('error'); }
    );
    return () => {
      active = false;
    };
  }, [showsItems, recentItems, attempt]);

  const retry = () => {
    setItems(undefined);
    setAttempt((current) => current + 1);
  };

  const submit = (value: string) => {
    const term = value.trim();
    if (!term) return;
    void rememberSearch(term).catch(() => {
      Alert.alert('최근 검색', '검색 기록을 저장하지 못했어요.');
    });
    Keyboard.dismiss();
    const href = { pathname: '/search-results' as const, params: { query: term } };
    if (!isResults) router.push(href);
    else if (term !== query) router.replace(href);
    else {
      setText(term);
      retry();
    }
  };

  const changeHistory = (update: (entries: string[]) => string[]) => {
    void updateSearchHistory(update).then(setHistory, () => {
      Alert.alert('최근 검색', '검색 기록을 수정하지 못했어요.');
    });
  };

  const term = query?.toLowerCase() ?? '';
  const matches = Array.isArray(items)
    ? items.filter((item) => item.title.toLowerCase().includes(term))
      .sort((a, b) => compareItems(a, b, sort))
    : [];
  const title = recentItems ? '최근 등록된 물건' : isResults ? '검색 결과' : '검색';
  const listLabel = recentItems ? '최근 30일' : '검색 결과';
  const itemCount = Array.isArray(items) ? `${matches.length}개` : '';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" hitSlop={10}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace(isResults && !recentItems ? '/search' : '/');
          }}>
          <Ionicons name="arrow-back" size={23} color={COLORS.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
      </View>

      {!recentItems && (
        <View style={[styles.field, !isResults && styles.entryField]}>
        <Pressable accessibilityRole="button" accessibilityLabel="검색 실행" hitSlop={8}
          onPress={() => submit(text)}>
          <Ionicons name="search-outline" size={22} color={COLORS.text} />
        </Pressable>
        <TextInput
          accessibilityLabel="검색어"
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="어떤 물건을 찾으세요?"
          placeholderTextColor={COLORS.muted}
          returnKeyType="search"
          onSubmitEditing={() => submit(text)}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="사진 검색" hitSlop={8}
          onPress={showPhotoSearch}>
          <Ionicons name="image" size={20} color={COLORS.text} />
        </Pressable>
        </View>
      )}

      {isResults ? (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.meta}>
              {itemCount ? `${listLabel}${recentItems ? ' · ' : ' '}${itemCount}` : listLabel}
            </Text>
            <Pressable style={styles.sort} accessibilityRole="button"
              accessibilityLabel={`상품 목록 정렬, 현재 ${ITEM_SORT_LABELS[sort]}`}
              onPress={() => {
                Keyboard.dismiss();
                setPendingSort(sort);
              }}>
              <Text style={styles.action}>{ITEM_SORT_LABELS[sort]}</Text>
              <Ionicons name="chevron-down" size={14} color={palette.accent} />
            </Pressable>
          </View>
          <FlatList
            style={styles.results}
            data={matches}
            keyExtractor={(item) => String(item.itemId)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <SearchResult item={item} />}
            ListEmptyComponent={
              !showsItems ? <Text style={styles.empty}>검색어를 입력해 주세요.</Text> :
              items === undefined ? <ActivityIndicator style={styles.empty} color={palette.accent} /> :
              items === 'error' ? (
                <View style={styles.empty}>
                  <Text style={styles.meta}>상품을 불러오지 못했어요.</Text>
                  <Pressable accessibilityRole="button" onPress={retry}>
                    <Text style={styles.action}>다시 시도</Text>
                  </Pressable>
                </View>
              ) : <Text style={styles.empty}>
                {recentItems ? '최근 30일 동안 등록된 상품이 없어요.' : '검색 결과가 없어요.'}
              </Text>
            }
          />
          <Pressable style={styles.register} accessibilityRole="button" onPress={() => router.push('/register')}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
            <Text style={styles.registerText}>물건 등록</Text>
          </Pressable>
          <SearchSortSheet
            visible={pendingSort !== null}
            onDismiss={() => setPendingSort(null)}
            background={palette.background}
          >
            <ScrollView style={[styles.sheetScroll, { maxHeight: height * 0.8 }]} contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}>
              <View style={styles.sheetHandle} />
              <Text accessibilityRole="header" style={styles.sheetTitle}>정렬 선택</Text>
              <Text style={styles.sheetDescription}>
                {recentItems ? '상품 목록을 보여줄 순서를 선택해 주세요.' : '검색 결과를 보여줄 순서를 선택해 주세요.'}
              </Text>
              <View accessibilityRole="radiogroup">
                {sortOptions.map((option) => {
                  const selected = option === (pendingSort ?? sort);
                  return (
                    <Pressable key={option} style={[styles.sortOption, selected && styles.activeSortOption]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }} onPress={() => setPendingSort(option)}>
                      <Text style={[styles.term, selected && styles.selectedOption]}>{ITEM_SORT_LABELS[option]}</Text>
                      <Ionicons name={selected ? 'checkmark-circle-outline' : 'chevron-forward'}
                        size={selected ? 21 : 17} color={palette.accent} />
                    </Pressable>
                  );
                })}
              </View>
              <Pressable style={[styles.sheetButton, styles.confirmSort]} accessibilityRole="button"
                onPress={() => {
                  if (pendingSort) setSort(pendingSort);
                  setPendingSort(null);
                }}>
                <Text style={styles.registerText}>확인</Text>
              </Pressable>
              <Pressable style={[styles.sheetButton, styles.cancelSort]} accessibilityRole="button"
                onPress={() => setPendingSort(null)}>
                <Text style={[styles.action, styles.selectedOption]}>취소</Text>
              </Pressable>
            </ScrollView>
          </SearchSortSheet>
        </>
      ) : (
        <ScrollView style={styles.recent} keyboardShouldPersistTaps="handled">
          <View style={styles.recentHeader}>
            <Text accessibilityRole="header" style={styles.recentTitle}>최근 검색</Text>
            {!!history?.length && (
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => changeHistory(() => [])}>
                <Text style={[styles.action, styles.small]}>전체 지우기</Text>
              </Pressable>
            )}
          </View>
          {historyError ? <Text style={styles.empty}>검색 기록을 불러오지 못했어요.</Text> :
            history?.length === 0 ? <Text style={styles.empty}>검색 기록이 없어요</Text> :
            history?.map((entry) => (
              <View key={entry} style={styles.historyRow}>
                <Pressable style={styles.historyTerm} accessibilityRole="button" onPress={() => submit(entry)}>
                  <Ionicons name="time-outline" size={20} color={palette.accent} />
                  <Text style={styles.term} numberOfLines={1}>{entry}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${entry} 검색 기록 삭제`} hitSlop={10}
                  onPress={() => changeHistory((entries) => entries.filter((value) => value !== entry))}>
                  <Ionicons name="close" size={19} color={palette.accent} />
                </Pressable>
              </View>
            ))}
          <Pressable style={styles.photo} accessibilityRole="button" onPress={showPhotoSearch}>
            <Ionicons name="image-outline" size={25} color={palette.accent} />
            <View style={styles.photoCopy}>
              <Text style={styles.photoTitle}>사진으로 물건 찾기</Text>
              <Text style={styles.meta}>비슷한 물건을 사진으로 살펴보세요.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.accent} />
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SearchResult({ item }: { item: Item }) {
  const metadata = [item.location, item.createdAt?.split('T')[0], item.salesStatus === 'SOLD' ? '판매완료' : null]
    .filter(Boolean).join(' | ');
  return (
    <Pressable style={styles.result} accessibilityRole="button" accessibilityLabel={`${item.title} 상품 상세 보기`}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(item.itemId) } })}>
      <ProductImage uri={item.itemImage} style={styles.thumbnail} />
      <View style={styles.resultCopy}>
        <Text style={styles.term} numberOfLines={2}>{item.title}</Text>
        {metadata ? <Text style={styles.meta} numberOfLines={1}>{metadata}</Text> : null}
        <Text style={styles.price}>{item.price.toLocaleString('ko-KR')}원</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18 },
  heading: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  field: {
    height: 56, marginHorizontal: 24, borderRadius: 16, backgroundColor: palette.field,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  entryField: { marginTop: 15, height: 58, borderWidth: 2, borderColor: palette.accent },
  input: { flex: 1, alignSelf: 'stretch', minWidth: 0, color: COLORS.text, fontSize: 15 },
  recent: { marginHorizontal: 24, marginTop: 14 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  recentTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  historyRow: {
    minHeight: 60, flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: palette.divider,
  },
  historyTerm: { flex: 1, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12 },
  term: { flexShrink: 1, color: COLORS.text, fontSize: 14 },
  empty: { paddingVertical: 18, color: COLORS.muted, gap: 8 },
  action: { color: palette.accent, fontSize: 14 },
  small: { fontSize: 12 },
  photo: {
    minHeight: 75, marginTop: 16, borderRadius: 16, backgroundColor: palette.panel,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 14,
  },
  photoCopy: { flex: 1, gap: 5 },
  photoTitle: { color: palette.accent, fontSize: 14, fontWeight: '800' },
  resultsHeader: {
    minHeight: 40, marginHorizontal: 24, paddingRight: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  meta: { color: COLORS.muted, fontSize: 12 },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  sheetScroll: { flexGrow: 0 },
  sheetContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  sheetHandle: {
    alignSelf: 'center', width: 36, height: 4, borderRadius: 2,
    marginBottom: 20, backgroundColor: palette.divider,
  },
  sheetTitle: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  sheetDescription: { color: COLORS.muted, fontSize: 14, marginTop: 16, marginBottom: 10 },
  sortOption: {
    minHeight: 68, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: palette.divider,
  },
  activeSortOption: {
    backgroundColor: palette.panel,
    borderRadius: 12,
    borderBottomColor: 'transparent',
  },
  selectedOption: { fontWeight: '800' },
  sheetButton: {
    minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  confirmSort: { backgroundColor: palette.accent },
  cancelSort: { backgroundColor: palette.field },
  results: { flex: 1, marginHorizontal: 24, paddingRight: 8 },
  result: {
    flexDirection: 'row', alignItems: 'center', minHeight: 94, gap: 14, paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: palette.divider,
  },
  thumbnail: { width: 100, height: 84, borderRadius: 10, backgroundColor: palette.field },
  resultCopy: { flex: 1, gap: 4 },
  price: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  register: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, backgroundColor: palette.accent, paddingHorizontal: 16, height: 40,
    marginTop: 12, marginBottom: 18,
  },
  registerText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});
