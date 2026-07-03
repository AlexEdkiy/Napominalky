import { Stack } from 'expo-router'

export default function RemindersLayout() {
  return (
    <Stack>
      <Stack.Screen name="new" options={{ headerShown: false }} />
      <Stack.Screen name="[uuid]" options={{ headerShown: false }} />
    </Stack>
  )
}
