import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { COLORS } from '../constants/theme';

const menuItems = [
  { icon: 'camera-outline', title: '카메라 촬영', description: '사진으로 물건을 찾아보세요', photo: true },
  { icon: 'ribbon-outline', title: '시리얼 인증 물품', description: '시리얼 검토만 인증된 제품들이에요', photo: false },
] as const;

export default function HomeMenu({ onClose, onPhotoSearch }: { onClose: () => void; onPhotoSearch: () => void }) {
  const { width } = useWindowDimensions();
  const menuWidth = Math.min(330, width * 0.8);
  const progress = useSharedValue(0);
  const shadeStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.get() - 1) * menuWidth }],
  }));

  const open = () => {
    progress.set(withTiming(1, {
      duration: 240,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      reduceMotion: ReduceMotion.System,
    }));
  };

  const animateClose = (afterClose: () => void) => {
    progress.set(withTiming(0, {
      duration: 200,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      reduceMotion: ReduceMotion.System,
    }, (finished) => {
      if (finished) scheduleOnRN(afterClose);
    }));
  };
  const close = () => animateClose(onClose);

  return (
    <Modal transparent animationType="none" statusBarTranslucent navigationBarTranslucent
      onShow={open} onRequestClose={close}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.shade, shadeStyle]}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button"
            accessibilityLabel="메뉴 바깥 영역, 닫기" onPress={close} />
        </Animated.View>
        <Animated.View style={[styles.panel, { width: menuWidth }, panelStyle]} accessibilityViewIsModal>
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Text accessibilityRole="header" style={styles.brand}>신중</Text>
                <Pressable accessibilityRole="button" onPress={close} style={styles.closeButton}>
                  <Text style={styles.closeText}>닫기</Text>
                </Pressable>
              </View>
              <Text style={styles.subtitle}>금광동 · 우리 동네 마켓</Text>
              <View style={styles.divider} />
              {menuItems.map(({ icon, title, description, photo }) => (
                <Pressable key={title} disabled={!photo} accessibilityRole="button"
                  accessibilityState={{ disabled: !photo }} style={styles.menuItem}
                  onPress={photo ? () => animateClose(onPhotoSearch) : undefined}>
                  <Ionicons name={icon} size={23} color={COLORS.primary} />
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemTitle}>{title}</Text>
                    <Text style={styles.itemDescription}>{description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(41, 37, 44, 0.46)' },
  panel: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 44 },
  brand: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  closeButton: {
    minHeight: 36, paddingHorizontal: 20, justifyContent: 'center',
    backgroundColor: COLORS.surface, borderRadius: 18,
  },
  closeText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  subtitle: { marginTop: 43, color: COLORS.primary, fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 12, marginBottom: 6, backgroundColor: COLORS.border },
  menuItem: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemCopy: { flex: 1, gap: 5 },
  itemTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  itemDescription: { color: COLORS.muted, fontSize: 12 },
});
