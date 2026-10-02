import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { settingsApi } from '@/api/settingsApi'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'

export function useSettings() {
  const settings = useSettingsStore()
  const token = useAuthStore((s) => s.token)
  const serverEnabled = useAuthStore((s) => s.syncEnabled)
  const [syncError, setSyncError] = useState<string | null>(null)
  const syncEnabled = token !== null && serverEnabled && settings.isHydrated && settings.syncEnabled
  const syncMutation = useMutation({
    mutationFn: ({ enabled }: { enabled: boolean; token: string }) => settingsApi.updateSyncEnabled(enabled),
    onSuccess: (user, request) => {
      if (useAuthStore.getState().token !== request.token) return
      useAuthStore.getState().setUser(user)
    },
    onError: (_error, request) => {
      if (useAuthStore.getState().token !== request.token) return
      // Failure must never undo the user's decision to stop data transfer.
      void settings.setSyncEnabled(false).catch(() => {})
      setSyncError(request.enabled
        ? 'Не удалось включить синхронизацию. Проверьте подключение и повторите.'
        : 'На устройстве синхронизация выключена. Настройку аккаунта на сервере обновить не удалось.')
    },
  })

  const toggleSync = (): void => {
    if (!token || !settings.isHydrated || syncMutation.isPending) return
    setSyncError(null)
    const next = !syncEnabled
    void settings.setSyncEnabled(next).catch(() => setSyncError('Не удалось сохранить настройку на устройстве.'))
    syncMutation.mutate({ enabled: next, token })
  }

  const toggleNotifications = async (): Promise<void> => {
    useSettingsStore.setState({ notificationsError: null })
    try { await settings.setNotificationsEnabled(!settings.notificationsEnabled) }
    catch { useSettingsStore.setState({ notificationsError: 'Не удалось сохранить настройку уведомлений.' }) }
  }

  return {
    ...settings, syncEnabled, toggleNotifications, toggleSync, syncError,
    canSync: token !== null && settings.isHydrated,
    isSyncUpdating: syncMutation.isPending,
  }
}
