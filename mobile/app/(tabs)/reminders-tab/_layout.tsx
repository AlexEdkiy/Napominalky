import { Stack } from 'expo-router'

/**
 * Вложенный стек вкладки «Напоминания»: список напоминаний (index) и экран
 * календаря. Благодаря вложенности таб-бар остаётся видимым, а вкладка
 * «Напоминания» — активной на обоих экранах.
 */
export default function RemindersTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="calendar" />
    </Stack>
  )
}
