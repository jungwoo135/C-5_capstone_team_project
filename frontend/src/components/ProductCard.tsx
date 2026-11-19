
import React from 'react';
import {
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';

import { router } from 'expo-router';

import type { Product } from '../types/product';
import { COLORS } from '../constants/theme';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({
  product,
}: ProductCardProps) {
  const handlePress = () => {
    router.push({
      pathname: '/product/[id]' as any,
      params: {
        id: String(product.id),
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
      <Image
        source={{ uri: product.imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />

      <Text
        style={styles.title}
        numberOfLines={1}
      >
        {product.title}
      </Text>

      <Text style={styles.price}>
        {product.price.toLocaleString('ko-KR')}원
      </Text>

      <Text style={styles.location}>
        {product.location}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
