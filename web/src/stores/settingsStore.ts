import { ref } from 'vue'
import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'app_settings'

interface PersistedSettings {
  theme: Theme
  notificationsEnabled: boolean
}

function loadFromStorage(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { theme: 'system', notificationsEnabled: true }
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>
    return {
      theme: parsed.theme ?? 'system',
      notificationsEnabled: parsed.notificationsEnabled ?? true,
    }
  } catch {
    return { theme: 'system', notificationsEnabled: true }
  }
}

function saveToStorage(settings: PersistedSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export const useSettingsStore = defineStore('settings', () => {
  const persisted = loadFromStorage()

  const theme = ref<Theme>(persisted.theme)
  const notificationsEnabled = ref<boolean>(persisted.notificationsEnabled)

  function setTheme(value: Theme): void {
    theme.value = value
    saveToStorage({ theme: theme.value, notificationsEnabled: notificationsEnabled.value })
  }

  function setNotificationsEnabled(value: boolean): void {
    notificationsEnabled.value = value
    saveToStorage({ theme: theme.value, notificationsEnabled: notificationsEnabled.value })
  }

  return { theme, notificationsEnabled, setTheme, setNotificationsEnabled }
})
