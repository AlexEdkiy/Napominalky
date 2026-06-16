import { useMutation } from '@tanstack/react-query'

import { settingsApi } from '@/api/settingsApi'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore, type Theme } from '@/stores/settingsStore'

interface UseSettingsResult {
  theme: Theme
  notificationsEnabled: boolean
  syncEnabled: boolean
  isHydrated: boolean
  setTheme: (theme: Theme) => Promise<void>
  toggleNotifications: () => Promise<void>
  toggleSync: () => void
  isSyncUpdating: boolean
}

export function useSettings(): UseSettingsResult {
  const theme = useSettingsStore((s) => s.theme)
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled)
  const syncEnabled = useSettingsStore((s) => s.syncEnabled)
  const isHydrated = useSettingsStore((s) => s.isHydrated)
  const setThemeStore = useSettingsStore((s) => s.setTheme)
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled)
  const setSyncEnabled = useSettingsStore((s) => s.setSyncEnabled)
  const token = useAuthStore((s) => s.token)
  const setUserInAuth = useAuthStore((s) => s.setUser)

  const syncMutation = useMutation({
    mutationFn: (enabled: boolean) => settingsApi.updateSyncEnabled(enabled),
    onSuccess: (user) => {
      setUserInAuth(user)
      void setSyncEnabled(user.sync_enabled)
    },
    onError: () => {
      void setSyncEnabled(!syncEnabled)
    },
  })

  const setTheme = async (next: Theme): Promise<void> => {
    await setThemeStore(next)
  }

  const toggleNotifications = async (): Promise<void> => {
    await setNotificationsEnabled(!notificationsEnabled)
  }

  const toggleSync = (): void => {
    const next = !syncEnabled
    void setSyncEnabled(next)
    if (token !== null) {
      syncMutation.mutate(next)
    }
  }

  return {
    theme,
    notificationsEnabled,
    syncEnabled,
    isHydrated,
    setTheme,
    toggleNotifications,
    toggleSync,
    isSyncUpdating: syncMutation.isPending,
  }
}
