import { t, useLanguage } from '@/i18n'
import { Stack } from 'expo-router'

export default function SettingsLayout() {
  useLanguage()
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t("Настройки") }} />
      <Stack.Screen name="security" options={{ title: t("Безопасность") }} />
    </Stack>
  )
}
