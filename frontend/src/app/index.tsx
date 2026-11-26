
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router } from 'expo-router';

import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import BottomNavigation from '../components/BottomNavigation';
import HomeMenu from '../components/home-menu';

import { COLORS } from '../constants/theme';
import { getItems, type Item } from '../services/item-service';

export default function HomeScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [result, setResult] = useState<Item[] | 'error'>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getItems().then(
      (items) => {
        if (active) setResult(items);
      },
      () => {
        if (active) setResult('error');
      }
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => {
    setResult(undefined);
    setAttempt((value) => value + 1);
  };

  return (
    <SafeAreaView
      style={styles.screen}
      edges={['top', 'bottom']}
    >
      <StatusBar
        barStyle="dark-content"
      />

      {/* 1. 고정 헤더 */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="메뉴 열기"
          accessibilityState={{ expanded: menuOpen }}
          hitSlop={10}
          onPress={() => setMenuOpen(true)}
        >
          <Ionicons name="menu" size={25} color={COLORS.text} />
        </Pressable>
        <Text style={styles.logo}>신중</Text>
      </View>

      {/* 2. 스크롤 영역 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 메인 소개 */}
        <View style={styles.intro}>
          <Text style={styles.brandDescription}>
            금광동 · 우리 동네 마켓
          </Text>

          <Text style={styles.headline}>
            가까이에서, 새 쓰임을.
          </Text>
        </View>

        {/* 검색창 */}
        <View style={styles.searchBar}>
          <Link href="/search" asChild>
            <Pressable style={styles.searchTextButton} accessibilityLabel="물건 검색">
              <Ionicons name="search-outline" size={23} color="#494550" />
              <Text style={styles.searchPlaceholder}>어떤 물건을 찾으세요?</Text>
            </Pressable>
          </Link>
          <Link href="/image-search" asChild>
            <Pressable hitSlop={8} accessibilityLabel="사진으로 찾기">
              <Ionicons name="image" size={22} color="#494550" />
            </Pressable>
          </Link>
        </View>

        {/* AI 추천 카테고리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            AI가 추천한 물품
          </Text>

          <View style={styles.categoryRow}>
            <CategoryCard
              title="전자제품"
              icon="headphones"
            />
            <CategoryCard
              title="사무용품"
              icon="desk-lamp"
            />
            <CategoryCard
              title="여가용품"
              icon="bicycle"
            />
          </View>
        </View>

        {/* 최근 등록된 물건 */}
        <View style={styles.productSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              최근 등록된 물건
            </Text>

            <Link href="/recent-items" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.seeAll}>전체 보기 →</Text>
              </Pressable>
            </Link>
          </View>

          {result === undefined ? (
            <ActivityIndicator
              style={styles.listState}
              color={COLORS.primary}
              accessibilityLabel="상품 목록 불러오는 중"
            />
          ) : result === 'error' ? (
            <View style={styles.listState}>
              <Text style={styles.stateText}>상품 목록을 불러오지 못했습니다.</Text>
              <Pressable accessibilityRole="button" onPress={retry}>
                <Text style={styles.retry}>다시 시도</Text>
              </Pressable>
            </View>
          ) : result.length === 0 ? (
            <Text style={[styles.listState, styles.stateText]}>등록된 상품이 없습니다.</Text>
          ) : (
            <View style={styles.productRow}>
              {result.map((product) => (
                <ProductCard key={product.itemId} product={product} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 3. 고정 물건 등록 버튼 */}
      <Pressable
        accessibilityRole="button"
        style={styles.registerButton}
        onPress={() => router.push('/register')}
      >
        <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
        <Text style={styles.registerButtonText}>물건 등록</Text>
      </Pressable>

      {/* 4. 고정 하단 내비게이션 */}
      <BottomNavigation />
      {menuOpen && (
        <HomeMenu
          onClose={() => setMenuOpen(false)}
          onPhotoSearch={() => {
            setMenuOpen(false);
            router.push('/image-search');
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // 고정 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    height: 72,
    backgroundColor: COLORS.background,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },

  // 스크롤 영역
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 110,
  },

  // 메인 소개
  intro: {
    marginBottom: 22,
  },
  brandDescription: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 8,
  },
  headline: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.8,
  },

  // 검색창
  searchBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 17,
    gap: 16,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: COLORS.muted,
  },
  searchTextButton: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  // AI 추천 카테고리
  section: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  // 최근 등록된 물건
  productSection: {
    marginTop: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    fontSize: 12,
    color: COLORS.primary,
  },
  productRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
    marginTop: 12,
  },
  listState: {
    marginTop: 12,
    alignItems: 'center',
  },
  stateText: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  retry: {
    padding: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // 고정 물건 등록 버튼
  registerButton: {
    position: 'absolute',
    bottom: 120,
    left: 12,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingHorizontal: 17,
    paddingVertical: 11,

    // Android 그림자
    elevation: 5,

    // iOS 그림자
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
