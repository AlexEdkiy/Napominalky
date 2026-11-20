import LanguageSelector from '@/components/settings/LanguageSelector'
import { t, useLanguage } from '@/i18n'
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
  useLanguage()
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
        <Text style={styles.sectionTitle}>{t("Язык")}</Text>
        <LanguageSelector />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={styles.sectionTitle}>{t("Внешний вид")}</Text>
        <SettingRow
          label={t("Тема")}
          right={<Text style={styles.valueText}>{t(THEME_LABELS[theme] ?? '')}</Text>}
          onPress={handleThemePress}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={styles.sectionTitle}>{t("Уведомления")}</Text>
        <SettingRow
          label={t("Уведомления")}
          hint={notificationsError ?? undefined}
          right={
            <Switch
              value={notificationsEnabled}
              disabled={!isHydrated}
              onValueChange={() => { void toggleNotifications() }}
              accessibilityLabel={t("Push-уведомления")}
            />
          }
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={styles.sectionTitle}>{t("Синхронизация")}</Text>
        <SettingRow
          label={t("Синхронизация с сервером")}
          hint={syncError ?? (!canSync ? t("Войдите в аккаунт для синхронизации.") : isSyncUpdating ? t("Обновление...") : !syncEnabled ? t("Выключена. Изменения сохраняются только на устройстве.") : undefined)}
          right={
            <Switch
              value={syncEnabled}
              onValueChange={toggleSync}
              disabled={isSyncUpdating || !canSync}
              accessibilityLabel={t("Синхронизация с сервером")}
            />
          }
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={styles.sectionTitle}>{t("Безопасность")}</Text>
        <SettingRow
          label={t("Блокировка и биометрия")}
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
