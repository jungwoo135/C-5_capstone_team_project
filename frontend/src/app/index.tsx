
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        AI 중고거래 플랫폼
      </Text>

      <Text style={styles.description}>
        AI로 더 편리하고 신뢰할 수 있는 중고거래
      </Text>

      <Link href="/register" style={styles.button}>
        상품 등록하기
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
  },
});
