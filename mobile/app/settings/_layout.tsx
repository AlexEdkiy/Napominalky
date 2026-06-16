import { Stack } from 'expo-router'

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Настройки' }} />
      <Stack.Screen name="security" options={{ title: 'Безопасность' }} />
    </Stack>
  )
}
