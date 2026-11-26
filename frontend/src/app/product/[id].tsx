
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '../../constants/theme';
import ProductImage from '../../components/product-image';
import { getItem, type Item } from '../../services/item-service';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = typeof id === 'string' ? id.trim() : '';
  return <ProductDetail key={itemId} itemId={itemId} />;
}

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

function ProductDetail({ itemId }: { itemId: string }) {
  const [result, setResult] = useState<Item | null | 'error'>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!itemId) return;

    let active = true;
    getItem(itemId).then(
      (item) => {
        if (active) setResult(item);
      },
      () => {
        if (active) setResult('error');
      }
    );
    return () => {
      active = false;
    };
  }, [itemId, attempt]);

  const retry = () => {
    setResult(undefined);
    setAttempt((value) => value + 1);
  };

  const product = result === 'error' ? null : result;
  if (!product) {
    return (
      <SafeAreaView style={styles.screen}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          style={styles.header}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.text}
          />
          <Text style={styles.headerTitle}>뒤로 가기</Text>
        </Pressable>

        <View style={styles.emptyContainer}>
          {itemId && result === undefined ? (
            <ActivityIndicator
              color={COLORS.primary}
              accessibilityLabel="상품 상세 불러오는 중"
            />
          ) : (
            <Text style={styles.emptyText}>
              {result === 'error'
                ? '상품 정보를 불러오지 못했습니다.'
                : '상품을 찾을 수 없습니다.'}
            </Text>
          )}
          {result === 'error' && (
            <Pressable accessibilityRole="button" onPress={retry}>
              <Text style={styles.retry}>다시 시도</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const metadata = [product.location, product.createdAt?.split('T')[0]]
    .filter(Boolean)
    .join(' | ');
  const tags = [
    product.categoryName,
    product.condition,
    product.salesStatus === 'SOLD' ? '판매완료' : null,
  ].filter(Boolean);

  return (
    <SafeAreaView
      style={styles.screen}
      edges={['top', 'bottom']}
    >
      <StatusBar
        style="dark"
      />

      {/* 상단 고정 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.text}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          상품 상세
        </Text>
      </View>

      {/* 스크롤 가능한 상품 정보 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 상품 이미지 */}
        <ProductImage uri={product.itemImage} style={styles.productImage} />

        {/* 상품명 */}
        <Text style={styles.productTitle}>
          {product.title}
        </Text>

        {/* 위치 및 등록 시간 */}
        {metadata ? <Text style={styles.productMeta}>{metadata}</Text> : null}

        {/* 가격 */}
        <Text style={styles.price}>
          {product.price.toLocaleString('ko-KR')}원
        </Text>

        {/* 상품 태그 */}
        {tags.length > 0 && (
          <View style={styles.tagRow}>
            {tags.map((label, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 판매자 신뢰 카드 */}
        {product.sellerNickname ? (
          <View style={styles.sellerCard}>
            <View style={styles.sellerInfoRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{product.sellerNickname.slice(0, 1)}</Text>
              </View>
              <View style={styles.sellerText}>
                <Text style={styles.sellerName}>{product.sellerNickname}</Text>
                {typeof product.sellerTrustScore === 'number' && (
                  <Text style={styles.sellerStats}>신뢰 점수 {product.sellerTrustScore}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </View>
          </View>
        ) : null}

        {/* 상품 설명 */}
        {product.content ? <Text style={styles.description}>{product.content}</Text> : null}

        {/* AI 상품 인증 안내 */}
        <Text style={styles.certificationNotice}>
          {product.aiPhotoVerified
            ? 'AI 사진 인증 완료'
            : '상품 인증은 별도 검토가 필요해요.'}
        </Text>
      </ScrollView>

      {/* 하단 고정 버튼 영역 */}
      <View style={styles.bottomBar}>
        <View style={styles.favoriteButton}>
          <Ionicons
            name="heart-outline"
            size={25}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.chatButton}>
          <Text style={styles.chatButtonText}>
            채팅으로 문의하기
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // 상단 헤더
  header: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },

  // 메인 콘텐츠
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    fontWeight: '600',
  },
  retry: {
    padding: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // 상품 이미지
  productImage: {
    width: '100%',
    aspectRatio: 1.51,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    marginBottom: 14,
  },

  // 상품 정보
  productTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 7,
    letterSpacing: -0.4,
  },
  productMeta: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 10,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },

  // 카테고리 및 상태 태그
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '700',
  },

  // 판매자 카드
  sellerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    padding: 12,
    marginBottom: 16,
  },
  sellerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    marginRight: 10,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  sellerText: {
    flex: 1,
    gap: 3,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  sellerStats: {
    fontSize: 11,
    color: COLORS.muted,
  },

  // 설명
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
    marginBottom: 10,
  },
  certificationNotice: {
    fontSize: 11,
    color: COLORS.muted,
  },

  // 하단 고정 버튼
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
  },
  favoriteButton: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    flex: 1,
    height: 42,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
});
