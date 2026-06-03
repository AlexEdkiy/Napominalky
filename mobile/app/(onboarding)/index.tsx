import { router } from 'expo-router'
import { SafeAreaView, StyleSheet, Text, View } from 'react-native'

import BaseButton from '@/components/common/BaseButton'
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

export default function OnboardingScreen() {
  const { continueAsGuest } = useAuth()

  const handleLogin = (): void => {
    router.push('/(auth)/login')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Напоминалки</Text>
        <Text style={styles.subtitle}>Заметки, списки покупок и напоминания — всегда под рукой.</Text>
      </View>

      <View style={styles.values}>
        {VALUES.map((value) => (
          <View key={value.title} style={styles.valueRow}>
            <Text style={styles.valueTitle}>{value.title}</Text>
            <Text style={styles.valueDescription}>{value.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <BaseButton label="Начать без регистрации" onPress={continueAsGuest} />
        <BaseButton label="Войти" variant="secondary" onPress={handleLogin} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between', backgroundColor: '#fff' },
  header: { marginTop: 48, gap: 12 },
  title: { fontSize: 32, fontWeight: '700', color: '#1a1a1a' },
  subtitle: { fontSize: 16, color: '#4a4a4a', lineHeight: 22 },
  values: { gap: 20 },
  valueRow: { gap: 4 },
  valueTitle: { fontSize: 17, fontWeight: '600', color: '#1a1a1a' },
  valueDescription: { fontSize: 14, color: '#6a6a6a', lineHeight: 20 },
  actions: { gap: 12, marginBottom: 24 },
})
