import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'system'

const SETTINGS_KEY = 'app_settings'

interface SettingsData {
  theme: Theme
  notificationsEnabled: boolean
  syncEnabled: boolean
}

interface SettingsState extends SettingsData {
  isHydrated: boolean
  setTheme: (theme: Theme) => Promise<void>
  setNotificationsEnabled: (enabled: boolean) => Promise<void>
  setSyncEnabled: (enabled: boolean) => Promise<void>
  hydrate: () => Promise<void>
}

const DEFAULTS: SettingsData = {
  theme: 'system',
  notificationsEnabled: true,
  syncEnabled: false,
}

async function persist(data: SettingsData): Promise<void> {
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(data))
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  isHydrated: false,

  setTheme: async (theme: Theme): Promise<void> => {
    set({ theme })
    const { notificationsEnabled, syncEnabled } = get()
    await persist({ theme, notificationsEnabled, syncEnabled })
  },

  setNotificationsEnabled: async (enabled: boolean): Promise<void> => {
    set({ notificationsEnabled: enabled })
    const { theme, syncEnabled } = get()
    await persist({ theme, notificationsEnabled: enabled, syncEnabled })
  },

  setSyncEnabled: async (enabled: boolean): Promise<void> => {
    set({ syncEnabled: enabled })
    const { theme, notificationsEnabled } = get()
    await persist({ theme, notificationsEnabled, syncEnabled: enabled })
  },

  hydrate: async (): Promise<void> => {
    const raw = await SecureStore.getItemAsync(SETTINGS_KEY)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null) {
        const data = parsed as Partial<SettingsData>
        set({
          theme: isTheme(data.theme) ? data.theme : DEFAULTS.theme,
          notificationsEnabled: typeof data.notificationsEnabled === 'boolean'
            ? data.notificationsEnabled
            : DEFAULTS.notificationsEnabled,
          syncEnabled: typeof data.syncEnabled === 'boolean'
            ? data.syncEnabled
            : DEFAULTS.syncEnabled,
        })
      }
    }
    set({ isHydrated: true })
  },
}))

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}
