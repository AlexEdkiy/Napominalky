import {
  authenticateBiometric,
  clearPin,
  isBiometricAvailable,
  setPin,
  verifyPin,
} from '@/services/appLock'
import { useLockStore } from '@/stores/lockStore'

interface AppLockActions {
  setupPin: (pin: string) => Promise<void>
  removePin: () => Promise<void>
  verifyAndUnlock: (pin: string) => Promise<boolean>
  unlockWithBiometric: () => Promise<boolean>
  enableBiometric: () => Promise<boolean>
  disableBiometric: () => Promise<void>
  lock: () => void
}

interface AppLockState {
  isLocked: boolean
  pinSet: boolean
  biometricEnabled: boolean
  isHydrated: boolean
}

type UseAppLockResult = AppLockState & AppLockActions

export function useAppLock(): UseAppLockResult {
  const isLocked = useLockStore((s) => s.isLocked)
  const pinSet = useLockStore((s) => s.pinSet)
  const biometricEnabled = useLockStore((s) => s.biometricEnabled)
  const isHydrated = useLockStore((s) => s.isHydrated)
  const setPinSet = useLockStore((s) => s.setPinSet)
  const setBiometricEnabled = useLockStore((s) => s.setBiometricEnabled)
  const lockStore = useLockStore((s) => s.lock)
  const unlock = useLockStore((s) => s.unlock)

  const setupPin = async (pin: string): Promise<void> => {
    await setPin(pin)
    setPinSet(true)
  }

  const removePin = async (): Promise<void> => {
    await clearPin()
    setPinSet(false)
    await setBiometricEnabled(false)
  }

  const verifyAndUnlock = async (pin: string): Promise<boolean> => {
    const valid = await verifyPin(pin)
    if (valid) unlock()
    return valid
  }

  const unlockWithBiometric = async (): Promise<boolean> => {
    const success = await authenticateBiometric()
    if (success) unlock()
    return success
  }

  const enableBiometric = async (): Promise<boolean> => {
    const available = await isBiometricAvailable()
    if (!available) return false
    await setBiometricEnabled(true)
    return true
  }

  const disableBiometric = async (): Promise<void> => {
    await setBiometricEnabled(false)
  }

  return {
    isLocked,
    pinSet,
    biometricEnabled,
    isHydrated,
    setupPin,
    removePin,
    verifyAndUnlock,
    unlockWithBiometric,
    enableBiometric,
    disableBiometric,
    lock: lockStore,
  }
}
