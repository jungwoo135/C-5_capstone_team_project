import React, { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../constants/theme';

export default function ProductImage({
  uri,
  style,
}: {
  uri?: string | null;
  style: StyleProp<ViewStyle>;
}) {
  const [failedUri, setFailedUri] = useState<string>();
  const imageUri = uri?.trim();

  return (
    <View style={[style, styles.frame]}>
      {imageUri && imageUri !== failedUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailedUri(imageUri)}
        />
      ) : (
        <Ionicons
          name="image-outline"
          size={30}
          color={COLORS.muted}
          accessibilityLabel="상품 이미지 없음"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
