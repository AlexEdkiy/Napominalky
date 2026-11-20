import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

export type Language = 'ru' | 'en'
const LANGUAGE_KEY = 'app_language'

interface LanguageState {
  language: Language
  isHydrated: boolean
  hydrate: () => Promise<void>
  setLanguage: (language: Language) => Promise<void>
}

let revision = 0
let pendingWrite = Promise.resolve()

// A device preference, deliberately separate from accounts, domain data and sync.
export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'ru',
  isHydrated: false,
  hydrate: async () => {
    const started = revision
    try {
      const saved = await SecureStore.getItemAsync(LANGUAGE_KEY)
      if (started === revision) set({ language: saved === 'en' ? 'en' : 'ru' })
    } catch {
      // Keep the usable Russian default when device storage is unavailable.
    } finally {
      set({ isHydrated: true })
    }
  },
  setLanguage: async (language) => {
    revision += 1
    const write = pendingWrite.then(async () => {
      await SecureStore.setItemAsync(LANGUAGE_KEY, language)
      set({ language, isHydrated: true })
    })
    pendingWrite = write.catch(() => {})
    await write
  },
}))

export const useLanguage = (): Language => useLanguageStore((state) => state.language)
export const getLanguage = (): Language => useLanguageStore.getState().language
