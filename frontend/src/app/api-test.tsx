
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { checkBackendHealth } from '../services/healthService';
import { COLORS } from '../constants/theme';

type ConnectionStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error';

export default function ApiTestScreen() {
  const [status, setStatus] =
    useState<ConnectionStatus>('idle');

  const [message, setMessage] = useState(
    '아직 서버에 연결하지 않았습니다.'
  );

  const handleTest = async () => {
    setStatus('loading');
    setMessage('서버 연결을 확인하고 있습니다.');

    try {
      const result = await checkBackendHealth();

      if (result.status !== 'ok') {
        throw new Error('서버 상태가 정상적이지 않습니다.');
      }

      setStatus('success');
      setMessage(result.message);
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : '서버 연결에 실패했습니다.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color={COLORS.text}
        />
        <Text style={styles.backText}>뒤로 가기</Text>
      </Pressable>

      <View style={styles.content}>
        <Ionicons
          name="server-outline"
          size={64}
          color={COLORS.primary}
        />

        <Text style={styles.title}>
          백엔드 연결 테스트
        </Text>

        <Text style={styles.url}>
          {process.env.EXPO_PUBLIC_API_URL ??
            'API 주소 미설정'}
        </Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusText}>
            {status === 'success'
              ? '연결 성공'
              : status === 'error'
                ? '연결 실패'
                : '연결 대기'}
          </Text>

          <Text style={styles.message}>
            {message}
          </Text>
        </View>

        <Pressable
          onPress={handleTest}
          disabled={status === 'loading'}
          style={styles.button}
        >
          {status === 'loading' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              서버 연결 테스트
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  backText: {
    fontSize: 16,
    color: COLORS.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.text,
  },
  url: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
  statusBox: {
    width: '100%',
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  message: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    padding: 17,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
