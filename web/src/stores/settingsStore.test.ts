import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSettingsStore } from './settingsStore'
import type { Theme } from './settingsStore'

const STORAGE_KEY = 'app_settings'

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('initialises with system theme and notifications enabled by default', () => {
    const store = useSettingsStore()
    expect(store.theme).toBe('system')
    expect(store.notificationsEnabled).toBe(true)
  })

  it('restores theme from localStorage on init', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'dark', notificationsEnabled: false }))
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.theme).toBe('dark')
    expect(store.notificationsEnabled).toBe(false)
  })

  it('setTheme updates theme and persists to localStorage', () => {
    const store = useSettingsStore()
    store.setTheme('light')
    expect(store.theme).toBe('light')
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { theme: Theme }
    expect(saved.theme).toBe('light')
  })

  it('setTheme accepts all valid values', () => {
    const store = useSettingsStore()
    const themes: Theme[] = ['light', 'dark', 'system']
    for (const theme of themes) {
      store.setTheme(theme)
      expect(store.theme).toBe(theme)
    }
  })

  it('setNotificationsEnabled updates flag and persists to localStorage', () => {
    const store = useSettingsStore()
    store.setNotificationsEnabled(false)
    expect(store.notificationsEnabled).toBe(false)
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      notificationsEnabled: boolean
    }
    expect(saved.notificationsEnabled).toBe(false)
  })

  it('falls back to defaults when localStorage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json')
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.theme).toBe('system')
    expect(store.notificationsEnabled).toBe(true)
  })
})
