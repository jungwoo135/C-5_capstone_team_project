
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';

export default function RegisterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>상품 등록</Text>

      <TextInput
        style={styles.input}
        placeholder="상품명을 입력하세요"
      />

      <TextInput
        style={styles.input}
        placeholder="가격을 입력하세요"
        keyboardType="numeric"
      />

      <TextInput
        style={[styles.input, styles.description]}
        placeholder="상품 설명을 입력하세요"
        multiline
      />

      <Text style={styles.notice}>
        추후 AI 상품 정보 자동 추천 기능이 추가됩니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  description: {
    height: 120,
    textAlignVertical: 'top',
  },
  notice: {
    color: '#666666',
    marginTop: 12,
  },
});
