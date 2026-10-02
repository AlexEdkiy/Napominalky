import { router } from 'expo-router'
import React from 'react'
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'

import { useTheme } from '@/theme'
import SettingRow from '@/components/settings/SettingRow'
import { useSettings } from '@/hooks/useSettings'
import type { Theme } from '@/stores/settingsStore'

const THEME_LABELS: Record<Theme, string> = {
  light: 'Светлая',
  dark: 'Тёмная',
  system: 'Системная',
}

const THEME_CYCLE: Theme[] = ['system', 'light', 'dark']

export default function SettingsScreen() {
  const {
    theme,
    notificationsEnabled,
    syncEnabled,
    setTheme,
    toggleNotifications,
    toggleSync,
    isSyncUpdating, canSync, syncError, notificationsError, isHydrated,
  } = useSettings()

  const { colors } = useTheme()

  const handleThemePress = (): void => {
    const currentIndex = THEME_CYCLE.indexOf(theme)
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length
    const next = THEME_CYCLE[nextIndex]
    if (next !== undefined) {
      void setTheme(next)
    }
  }

  const handleSecurityPress = (): void => {
    router.push('/settings/security')
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.screenBg }]}
      contentContainerStyle={styles.container}
    >
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={styles.sectionTitle}>Внешний вид</Text>
        <SettingRow
          label="Тема"
          right={<Text style={styles.valueText}>{THEME_LABELS[theme]}</Text>}
          onPress={handleThemePress}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={styles.sectionTitle}>Уведомления</Text>
        <SettingRow
          label="Уведомления"
          hint={notificationsError ?? undefined}
          right={
            <Switch
              value={notificationsEnabled}
              disabled={!isHydrated}
              onValueChange={() => { void toggleNotifications() }}
              accessibilityLabel="Push-уведомления"
            />
          }
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={styles.sectionTitle}>Синхронизация</Text>
        <SettingRow
          label="Синхронизация с сервером"
          hint={syncError ?? (!canSync ? 'Войдите в аккаунт для синхронизации.' : isSyncUpdating ? 'Обновление...' : !syncEnabled ? 'Выключена. Изменения сохраняются только на устройстве.' : undefined)}
          right={
            <Switch
              value={syncEnabled}
              onValueChange={toggleSync}
              disabled={isSyncUpdating || !canSync}
              accessibilityLabel="Синхронизация с сервером"
            />
          }
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={styles.sectionTitle}>Безопасность</Text>
        <SettingRow
          label="Блокировка и биометрия"
          right={<Text style={styles.chevron}>›</Text>}
          onPress={handleSecurityPress}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 16 },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6a6a6a',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  valueText: { fontSize: 16, color: '#2563eb' },
  chevron: { fontSize: 20, color: '#94a3b8' },
})
