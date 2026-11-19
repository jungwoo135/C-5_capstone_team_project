
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '../constants/theme';

interface TabItemProps {
  label: string;
  icon: 'home-outline' | 'location-outline' | 'person-outline';
  active?: boolean;
}

function TabItem({
  label,
  icon,
  active = false,
}: TabItemProps) {
  return (
    <View style={styles.tab}>
      <View
        style={[
          styles.iconContainer,
          active && styles.activeIconContainer,
        ]}
      >
        <Ionicons
          name={active && icon === 'home-outline' ? 'home' : icon}
          size={25}
          color={COLORS.text}
        />
      </View>

      <Text
        style={[
          styles.label,
          active && styles.activeLabel,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function BottomNavigation() {
  return (
    <View style={styles.container}>
      <TabItem
        label="홈"
        icon="home-outline"
        active
      />
      <TabItem
        label="내 주변"
        icon="location-outline"
      />
      <TabItem
        label="프로필"
        icon="person-outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconContainer: {
    width: 56,
    height: 34,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconContainer: {
    backgroundColor: COLORS.primaryLight,
  },
  label: {
    fontSize: 12,
    color: COLORS.muted,
  },
  activeLabel: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
