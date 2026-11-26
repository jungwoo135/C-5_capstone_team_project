import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../constants/theme';

const groups = [
  { name: '전자제품', categories: ['생활가전', '게임', '디지털기기'] },
  { name: '생활/가구', categories: ['가구', '인테리어', '주방용품'] },
  { name: '패션/잡화', categories: ['남성의류', '여성의류', '뷰티/미용', '잡화'] },
  { name: '스포츠/레저', categories: ['자전거', '캠핑용품', '운동용품'] },
];

export default function RegisterCategoryScreen() {
  const params = useLocalSearchParams<{ category?: string; group?: string }>();
  const [expanded, setExpanded] = useState<string>();
  const [selection, setSelection] = useState({ category: params.category, group: params.group });
  const badges = [selection.group, selection.category].filter(Boolean);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" hitSlop={10}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/register');
          }}>
          <Ionicons name="arrow-back" size={23} color={COLORS.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.heading}>카테고리 선택</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>어떤 물건인가요?</Text>
        <Text style={styles.subtitle}>물건에 맞는 카테고리를 선택해 주세요.</Text>
        {badges.length > 0 && (
          <View style={styles.badges}>
            {badges.map((badge) => <Text key={badge} style={styles.badge}>{badge}</Text>)}
          </View>
        )}

        <View style={styles.groups}>
          {groups.map(({ name, categories }) => {
            const open = expanded === name;
            const selected = selection.group === name;
            return (
              <View key={name}>
                <Pressable style={[styles.row, styles.groupRow]} accessibilityRole="button"
                  accessibilityState={{ expanded: open, selected }}
                  onPress={() => setExpanded(open ? undefined : name)}>
                  <Text style={styles.rowLabel}>{name}</Text>
                  <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={18} color={COLORS.primary} />
                </Pressable>
                {open && (
                  <View style={styles.children}>
                    {categories.map((category, index) => {
                      const checked = selected && selection.category === category;
                      return (
                        <Pressable key={category} accessibilityRole="radio" accessibilityState={{ checked }}
                          style={[styles.row, index === categories.length - 1 && styles.lastChild, checked && styles.selected]}
                          onPress={() => setSelection({ category, group: name })}>
                          <Text style={styles.rowLabel}>{category}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
          <Pressable style={[styles.row, selection.category === '기타' && styles.selected]} accessibilityRole="radio"
            accessibilityState={{ checked: selection.category === '기타' }}
            onPress={() => {
              setExpanded(undefined);
              setSelection({ category: '기타', group: undefined });
            }}>
            <Text style={styles.rowLabel}>기타</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>선택한 분류는 매물 작성 화면에 반영돼요.</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" disabled={!selection.category}
          style={[styles.confirm, !selection.category && styles.disabled]}
          onPress={() => router.dismissTo({
            pathname: '/register',
            params: { category: selection.category, group: selection.group ?? '' },
          })}>
          <Text style={styles.confirmLabel}>이 카테고리로 선택</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF7F2' },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18 },
  heading: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '800' },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  badge: {
    color: COLORS.primary, backgroundColor: '#EEE2E8', fontSize: 12, fontWeight: '700',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5,
  },
  groups: { marginTop: 16 },
  row: {
    minHeight: 56, borderBottomWidth: 1, borderBottomColor: '#E6DFD8',
    justifyContent: 'center', paddingHorizontal: 12,
  },
  groupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { color: COLORS.text, fontSize: 14 },
  selected: { backgroundColor: '#EEE2E8', borderRadius: 12, borderBottomColor: 'transparent' },
  children: { backgroundColor: '#F0EAE1', paddingHorizontal: 20, borderRadius: 12 },
  lastChild: { borderBottomWidth: 0 },
  note: { color: COLORS.muted, fontSize: 12, marginTop: 18 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  confirm: {
    minHeight: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#71445F', borderRadius: 24,
  },
  disabled: { backgroundColor: '#A79AA1' },
  confirmLabel: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});
