
import React from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import { router } from 'expo-router';

import type { Item } from '../services/item-service';
import { COLORS } from '../constants/theme';
import ProductImage from './product-image';

interface ProductCardProps {
  product: Item;
}

export default function ProductCard({
  product,
}: ProductCardProps) {
  const handlePress = () => {
    router.push({
      pathname: '/product/[id]',
      params: {
        id: String(product.itemId),
      },
    });
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${product.title} 상품 상세 보기`}
    >
      <ProductImage uri={product.itemImage} style={styles.image} />

      <Text
        style={styles.title}
        numberOfLines={1}
      >
        {product.title}
      </Text>

      <Text style={styles.price}>
        {product.price.toLocaleString('ko-KR')}원
      </Text>

      {product.location ? (
        <Text style={styles.location}>{product.location}</Text>
      ) : null}
      {product.salesStatus === 'SOLD' && (
        <Text style={styles.location}>판매완료</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    minWidth: 0,
  },
  image: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  location: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
