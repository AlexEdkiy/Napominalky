import { router } from 'expo-router'
import React from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import BaseButton from '@/components/common/BaseButton'
import { useAuth } from '@/hooks/useAuth'

export default function ProfileScreen() {
  const { user, isAuthenticated, guestMode, logout } = useAuth()

  const displayName = user?.name ?? user?.email ?? 'Гость'
  const isGuest = guestMode || !isAuthenticated

  const handleLogout = (): void => {
    Alert.alert('Выйти из аккаунта?', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => { logout.mutate() },
      },
    ])
  }

  const handleSettings = (): void => {
    router.push('/settings')
  }

  const handleSecurity = (): void => {
    router.push('/settings/security')
  }

  const handleLogin = (): void => {
    router.push('/(auth)/login')
  }

  const handleRegister = (): void => {
    router.push('/(auth)/register')
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        {user?.email !== undefined ? (
          <Text style={styles.email}>{user.email}</Text>
        ) : null}
        {isGuest ? <Text style={styles.guestBadge}>Гость</Text> : null}
      </View>

      {isGuest ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Аккаунт</Text>
          <BaseButton label="Войти" onPress={handleLogin} />
          <BaseButton
            label="Зарегистрироваться"
            onPress={handleRegister}
            variant="secondary"
          />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Аккаунт</Text>
          <BaseButton
            label="Выйти"
            onPress={handleLogout}
            variant="secondary"
            loading={logout.isPending}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Приложение</Text>
        <BaseButton
          label="Настройки"
          onPress={handleSettings}
          variant="secondary"
        />
        <BaseButton
          label="Безопасность"
          onPress={handleSecurity}
          variant="secondary"
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '600', color: '#ffffff' },
  displayName: { fontSize: 20, fontWeight: '600', color: '#1a1a1a' },
  email: { fontSize: 14, color: '#6a6a6a' },
  guestBadge: {
    fontSize: 12,
    color: '#94a3b8',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6a6a6a',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
})
