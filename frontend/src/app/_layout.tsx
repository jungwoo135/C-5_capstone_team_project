
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: '홈' }}
      />
      <Stack.Screen
        name="register"
        options={{ title: '상품 등록' }}
      />
    </Stack>
  );
}
