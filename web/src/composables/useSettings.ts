import { ref } from 'vue'

import { settingsApi } from '@/api/settingsApi'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { Theme } from '@/stores/settingsStore'

/**
 * Инкапсулирует действия раздела «Настройки» ЛК:
 * - toggleSync: PATCH /settings/sync + обновление authStore.user
 * - setTheme: сохраняет тему в settingsStore (localStorage)
 * - toggleNotifications: сохраняет флаг уведомлений локально
 */
export function useSettings() {
  const auth = useAuthStore()
  const settings = useSettingsStore()

  const isSyncLoading = ref(false)
  const syncError = ref<string | null>(null)

  async function toggleSync(enabled: boolean): Promise<void> {
    isSyncLoading.value = true
    syncError.value = null
    try {
      const updatedUser = await settingsApi.toggleSync(enabled)
      auth.setUser(updatedUser)
    } catch (e) {
      syncError.value = e instanceof Error ? e.message : 'Не удалось изменить настройку синхронизации'
    } finally {
      isSyncLoading.value = false
    }
  }

  function setTheme(theme: Theme): void {
    settings.setTheme(theme)
  }

  function toggleNotifications(enabled: boolean): void {
    settings.setNotificationsEnabled(enabled)
  }

  return {
    isSyncLoading,
    syncError,
    toggleSync,
    setTheme,
    toggleNotifications,
  }
}
