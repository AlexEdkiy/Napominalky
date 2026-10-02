import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'

/** One session per exchange: disabling and re-enabling cannot revive an old request. */
export interface SyncSession {
  token: string
  signal: AbortSignal
  assertActive: () => void
  dispose: () => void
  cancel: () => void
}

export const isSyncEnabled = (): boolean => {
  const auth = useAuthStore.getState()
  const settings = useSettingsStore.getState()
  return auth.token !== null && auth.syncEnabled && settings.isHydrated && settings.syncEnabled
}

export const createSyncSession = (): SyncSession => {
  const token = useAuthStore.getState().token
  if (!token) throw new Error('unauthenticated')
  if (!isSyncEnabled()) throw new Error('sync_disabled')
  const controller = new AbortController()
  const check = (): void => {
    if (useAuthStore.getState().token !== token || !isSyncEnabled()) controller.abort()
  }
  const offAuth = useAuthStore.subscribe(check)
  const offSettings = useSettingsStore.subscribe(check)
  return {
    token, signal: controller.signal, cancel: () => controller.abort(),
    assertActive: () => {
      check()
      if (controller.signal.aborted) throw new Error('sync_cancelled')
    },
    dispose: () => { offAuth(); offSettings() },
  }
}
