import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import DbProvider from '@/providers/DbProvider'
import { useAuthStore } from '@/stores/authStore'
import { useSyncEngine } from '@/hooks/useSyncEngine'
import { useNotifications } from '@/hooks/useNotifications'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
})

/**
 * Запускает движок синхронизации внутри провайдеров (БД готова): авто-sync
 * при старте с токеном и syncEnabled и при возврате в онлайн. Ничего не рендерит.
 */
function SyncBootstrap(): null {
  useSyncEngine()
  return null
}

/**
 * Инициализирует локальные уведомления (handler, разрешения) и навигацию по
 * тапу на уведомление. Внутри провайдеров и контекста роутера. Ничего не рендерит.
 */
function NotificationsBootstrap(): null {
  useNotifications()
  return null
}

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <QueryClientProvider client={queryClient}>
      <DbProvider>
        <SyncBootstrap />
        <NotificationsBootstrap />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="notes" options={{ headerShown: false }} />
          <Stack.Screen name="lock" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </DbProvider>
    </QueryClientProvider>
  )
}
