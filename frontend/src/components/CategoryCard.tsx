
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { COLORS } from '../constants/theme';

type CategoryIcon =
  | 'headphones'
  | 'desk-lamp'
  | 'bicycle';

interface CategoryCardProps {
  title: string;
  icon: CategoryIcon;
}

export default function CategoryCard({
  title,
  icon,
}: CategoryCardProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={icon}
        size={27}
        color={COLORS.primary}
      />

      <Text style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    height: 90,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 13,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
});
