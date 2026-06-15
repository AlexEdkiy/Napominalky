import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

import { isPinSet } from '@/services/appLock'

/** Ключ для хранения флага biometricEnabled в secure-store. */
const SECURE_KEY_BIOMETRIC = 'app_lock_biometric_enabled'

interface LockState {
  pinSet: boolean
  biometricEnabled: boolean
  isLocked: boolean
  isHydrated: boolean
}

interface LockActions {
  setPinSet: (value: boolean) => void
  setBiometricEnabled: (value: boolean) => Promise<void>
  lock: () => void
  unlock: () => void
  hydrate: () => Promise<void>
}

type LockStore = LockState & LockActions

export const useLockStore = create<LockStore>((set) => ({
  pinSet: false,
  biometricEnabled: false,
  isLocked: false,
  isHydrated: false,

  setPinSet: (value: boolean): void => {
    set({ pinSet: value })
  },

  setBiometricEnabled: async (value: boolean): Promise<void> => {
    await SecureStore.setItemAsync(SECURE_KEY_BIOMETRIC, value ? '1' : '0')
    set({ biometricEnabled: value })
  },

  lock: (): void => {
    set({ isLocked: true })
  },

  unlock: (): void => {
    set({ isLocked: false })
  },

  hydrate: async (): Promise<void> => {
    const pinSetValue = await isPinSet()

    const biometricRaw = await SecureStore.getItemAsync(SECURE_KEY_BIOMETRIC)
    const biometricEnabled = biometricRaw === '1'

    set({
      pinSet: pinSetValue,
      biometricEnabled,
      isLocked: pinSetValue,
      isHydrated: true,
    })
  },
}))
