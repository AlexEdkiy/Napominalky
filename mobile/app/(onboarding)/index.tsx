import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
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
        <View style={styles.bellCircle}>
          <Ionicons name="notifications" size={56} color="#ffffff" />
        </View>
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
    paddingTop: 16,
  },
  bellCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0f6155',
    alignItems: 'center',
    justifyContent: 'center',
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
