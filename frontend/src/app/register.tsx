import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../constants/theme';

const palette = {
  background: '#FAF7F2',
  surface: '#F0EAE1',
  border: '#E6DFD8',
  disabled: '#D3CFCA',
  disabledText: '#A9A49E',
};

export default function RegisterScreen() {
  const [price, setPrice] = useState('');
  const { category, group } = useLocalSearchParams<{ category?: string; group?: string }>();
  const categoryLabel = group && category ? `${group} · ${category}` : category;

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
        <Text accessibilityRole="header" style={styles.heading}>매물 작성</Text>
      </View>

      <KeyboardAvoidingView style={styles.body} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.body} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable disabled accessibilityRole="button" style={styles.photo}>
            <Ionicons name="camera-outline" size={23} color={COLORS.primary} />
            <Text style={styles.photoLabel}>사진 추가</Text>
          </Pressable>

          <View style={styles.field}>
            <Text style={styles.label}>카테고리</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={categoryLabel || '카테고리 선택'}
              style={[styles.input, styles.category]}
              onPress={() => router.push({ pathname: '/register-category', params: { category, group } })}>
              <Text style={categoryLabel ? styles.categoryValue : styles.placeholder}>
                {categoryLabel || '카테고리를 선택해 주세요'}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={COLORS.muted} />
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>제목</Text>
            <TextInput style={styles.input} accessibilityLabel="제목"
              placeholder="판매할 물건의 이름을 적어 주세요" placeholderTextColor={COLORS.muted} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>판매 가격</Text>
            <TextInput style={styles.input} accessibilityLabel="판매 가격"
              placeholder="가격을 입력해 주세요" placeholderTextColor={COLORS.muted}
              inputMode="numeric" value={price}
              onChangeText={(value) => setPrice(value.replace(/[^0-9]/g, ''))} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>상품 설명</Text>
            <TextInput style={[styles.input, styles.description]} accessibilityLabel="상품 설명"
              placeholder="상태와 사용감을 자세히 알려주세요." placeholderTextColor={COLORS.muted}
              multiline />
          </View>

          <View style={styles.location}>
            <Ionicons name="location-outline" size={19} color={COLORS.primary} />
            <Text style={styles.note}>금광동 · 동네인증 대기</Text>
          </View>
          <Text style={styles.notice}>사진과 필수 정보를 입력한 뒤 등록할 수 있어요.</Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable disabled accessibilityRole="button" style={styles.submit}>
            <Text style={styles.submitLabel}>등록하기</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18 },
  heading: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  body: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
  photo: {
    width: 88, height: 88, alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: palette.border, borderRadius: 16, backgroundColor: palette.surface,
  },
  photoLabel: { color: COLORS.primary, fontSize: 12 },
  field: { marginTop: 14, gap: 7 },
  label: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  input: {
    minHeight: 52, borderWidth: 1, borderColor: palette.border, borderRadius: 10,
    backgroundColor: COLORS.white, paddingHorizontal: 12, color: COLORS.text, fontSize: 14,
  },
  category: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryValue: { color: COLORS.text, fontSize: 14 },
  placeholder: { color: COLORS.muted, fontSize: 14 },
  description: { minHeight: 100, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
  location: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  note: { color: COLORS.muted, fontSize: 12 },
  notice: { color: COLORS.muted, fontSize: 12, marginTop: 16 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  submit: {
    minHeight: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.disabled, borderRadius: 24,
  },
  submitLabel: { color: palette.disabledText, fontSize: 14, fontWeight: '800' },
});
