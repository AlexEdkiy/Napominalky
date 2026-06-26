import React from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'

import { useAuth } from '@/hooks/useAuth'

interface ValueItem {
  title: string
  description: string
}

const VALUES: ValueItem[] = [
  { title: 'Работает офлайн', description: 'Заметки и списки доступны без интернета.' },
  { title: 'Данные у вас', description: 'Всё хранится локально на устройстве.' },
  { title: 'Синхронизация', description: 'Войдите, чтобы синхронизировать между устройствами.' },
]

export default function OnboardingScreen(): React.JSX.Element {
  const { continueAsGuest } = useAuth()
  const insets = useSafeAreaInsets()

  const handleLogin = (): void => {
    router.push('/(auth)/login')
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.illustration}>
        <Image
          testID="onboarding-illustration"
          source={require('../../assets/onboarding-illustration.png')}
          style={styles.illustrationImage}
          resizeMode="contain"
          accessibilityLabel="Иллюстрация приложения"
        />
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.title}>Напоминалки</Text>
        <Text style={styles.subtitle}>
          {'Заметки, списки покупок и напоминания — всегда под рукой.'}
        </Text>
      </View>

      <View style={styles.values}>
        {VALUES.map((item) => (
          <View key={item.title} style={styles.valueRow}>
            <Text style={styles.valueTitle}>{item.title}</Text>
            <Text style={styles.valueDescription}>{item.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Начать без регистрации"
          onPress={continueAsGuest}
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
        >
          <Text style={styles.btnPrimaryText}>Начать без регистрации</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Войти"
          onPress={handleLogin}
          style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
        >
          <Text style={styles.btnSecondaryText}>Войти</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  illustration: {
    alignItems: 'center',
    paddingTop: 8,
  },
  illustrationImage: {
    width: 300,
    height: Math.round(300 * (320 / 360)),
  },
  textBlock: {
    gap: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#141414',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b716e',
    lineHeight: 22,
  },
  values: {
    gap: 18,
  },
  valueRow: {
    gap: 3,
  },
  valueTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2622',
  },
  valueDescription: {
    fontSize: 13,
    color: '#8a938f',
    lineHeight: 19,
  },
  actions: {
    gap: 12,
  },
  btnPrimary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#17897a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnSecondary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#d7dedb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17897a',
  },
  pressed: {
    opacity: 0.85,
  },
})
