import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS } from '../constants/theme';

const palette = {
  background: '#FAF7F2',
  surface: '#F0EAE1',
  accent: '#71445F',
  accentLight: '#EEE2E8',
  border: '#E6DFD8',
  disabled: '#E5DFDF',
  disabledText: '#968C95',
};

const sources = [
  { key: 'photo', label: '사진' },
  { key: 'file', label: '파일' },
] as const;

export default function ImageSearchScreen() {
  const [source, setSource] = useState<(typeof sources)[number]['key']>('photo');
  const isFile = source === 'file';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" hitSlop={10}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}>
          <Ionicons name="arrow-back" size={23} color={COLORS.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>사진으로 찾기</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.title}>검색할 물건을 촬영해주세요</Text>
        <Text style={styles.subtitle}>물건이 잘 보이도록 화면 안에 담아주세요.</Text>

        <View style={styles.preview}>
          <View style={styles.previewIcon}>
            <MaterialCommunityIcons name="image-plus-outline" size={32} color={palette.accent} />
          </View>
          <Text style={styles.emptyTitle}>아직 선택한 사진이 없어요</Text>
          <Text style={styles.emptyDescription}>
            {'물건을 직접 촬영하거나\n파일에서 사진을 선택해주세요.'}
          </Text>
        </View>

        <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }}
          style={styles.capture}>
          <View style={styles.captureIcon}>
            <Ionicons name={isFile ? 'folder-open-outline' : 'camera-outline'} size={34} color={COLORS.white} />
          </View>
          <Text style={styles.captureLabel}>{isFile ? '파일 선택' : '사진 촬영'}</Text>
        </Pressable>

        <View style={styles.sources} accessibilityRole="tablist">
          {sources.map(({ key, label }) => {
            const selected = source === key;
            return (
              <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected }}
                style={[styles.source, key === 'photo' && styles.firstSource, selected && styles.selectedSource]}
                onPress={() => setSource(key)}>
                {selected && <Ionicons name="checkmark" size={17} color={COLORS.text} />}
                <Text style={[styles.sourceLabel, selected && styles.activeLabel]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }}
          style={styles.searchButton}>
          <Text style={styles.searchLabel}>사진으로 검색</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 8 },
  preview: {
    width: '100%', aspectRatio: 364 / 360, maxHeight: 360, minHeight: 225,
    marginTop: 20, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed',
    borderColor: palette.border, backgroundColor: palette.surface,
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  previewIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: palette.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 14 },
  emptyDescription: { color: COLORS.muted, fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: 14 },
  capture: { alignSelf: 'center', alignItems: 'center', gap: 8, marginTop: 18 },
  captureIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: palette.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  captureLabel: { color: palette.accent, fontSize: 12 },
  sources: {
    width: '100%', maxWidth: 240, minHeight: 40, marginTop: 10, alignSelf: 'center',
    flexDirection: 'row', borderWidth: 1, borderColor: COLORS.muted, borderRadius: 20, overflow: 'hidden',
  },
  source: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  firstSource: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: COLORS.muted },
  selectedSource: { backgroundColor: palette.accentLight },
  sourceLabel: { color: COLORS.text, fontSize: 14 },
  activeLabel: { color: palette.accent },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  searchButton: {
    minHeight: 48, borderRadius: 24, backgroundColor: palette.disabled,
    alignItems: 'center', justifyContent: 'center',
  },
  searchLabel: { color: palette.disabledText, fontSize: 14, fontWeight: '800' },
});
