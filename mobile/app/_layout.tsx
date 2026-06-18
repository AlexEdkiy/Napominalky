import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'

import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorScreen from '@/components/ErrorScreen'
import DbProvider from '@/providers/DbProvider'
import LockProvider from '@/providers/LockProvider'
import ThemeProvider from '@/theme/ThemeProvider'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useSyncEngine } from '@/hooks/useSyncEngine'
import { useNotifications } from '@/hooks/useNotifications'
import { installGlobalErrorHandler } from '@/services/globalErrorHandler'
import { authApi } from '@/api/authApi'

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

function RootLayout(): React.JSX.Element {
  const hydrate = useAuthStore((state) => state.hydrate)
  const rehydrateUser = useAuthStore((state) => state.rehydrateUser)
  const hydrateSettings = useSettingsStore((state) => state.hydrate)
  const [globalError, setGlobalError] = useState<Error | null>(null)

  useEffect(() => {
    void hydrate().then(() => rehydrateUser(authApi.getMe))
    void hydrateSettings()
  }, [hydrate, rehydrateUser, hydrateSettings])

  useEffect(() => {
    const uninstall = installGlobalErrorHandler((error) => {
      setGlobalError(error)
    })
    return uninstall
  }, [])

  if (globalError !== null) {
    return (
      <ErrorScreen
        title="Ошибка приложения"
        message={globalError.message}
        stack={globalError.stack ?? null}
      />
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DbProvider>
        <ThemeProvider>
          <LockProvider>
            <SyncBootstrap />
            <NotificationsBootstrap />
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="notes" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="lock" options={{ headerShown: false }} />
              <Stack.Screen name="create" options={{ presentation: 'modal', headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
          </LockProvider>
        </ThemeProvider>
      </DbProvider>
    </QueryClientProvider>
  )
}

export default function Root(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <RootLayout />
    </ErrorBoundary>
  )
}
