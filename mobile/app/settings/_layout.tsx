import { Stack } from 'expo-router'

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="security" options={{ title: 'Безопасность' }} />
    </Stack>
  )
}
