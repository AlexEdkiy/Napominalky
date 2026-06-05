import { useAuthStore } from '@/stores/authStore'
import { getIsOnline } from '@/services/netStatus'
import { pushChanges } from './pushChanges'
import { pullChanges } from './pullChanges'
import { setLastSyncedAt } from './syncMeta'

/** Опции запуска синхронизации. */
export interface SyncOptions {
  /** Игнорировать гейт (syncEnabled/online) — для ручного запуска. */
  force?: boolean
}

/** Итог одной синхронизации. */
export interface SyncResult {
  ok: boolean
  pushed?: number
  error?: string
  lastSyncedAt?: string
}

type SyncListener = (result: SyncResult) => void

const listeners = new Set<SyncListener>()

/** Текущий промис синхронизации (анти-параллель): null, если не идёт. */
let inFlight: Promise<SyncResult> | null = null

/** Подписка на завершение синхронизации. Возвращает функцию отписки. */
const onChange = (listener: SyncListener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const emit = (result: SyncResult): void => {
  listeners.forEach((listener) => listener(result))
}

/**
 * Гейт синхронизации: нужен токен; при отсутствии force — также включённая
 * синхронизация и онлайн-статус. Возвращает null, если можно продолжать,
 * либо причину отказа.
 */
const checkGate = async (force: boolean): Promise<string | null> => {
  const { token, syncEnabled } = useAuthStore.getState()
  if (token === null) return 'unauthenticated'
  if (force) return null
  if (!syncEnabled) return 'sync_disabled'
  if (!(await getIsOnline())) return 'offline'
  return null
}

/** Выполняет push → pull и фиксирует метку времени. Ошибки — наружу. */
const runSync = async (): Promise<SyncResult> => {
  const pushResult = await pushChanges()
  await pullChanges()

  const lastSyncedAt = new Date().toISOString()
  await setLastSyncedAt(lastSyncedAt)

  return { ok: true, pushed: pushResult?.applied.length ?? 0, lastSyncedAt }
}

const toError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const sync = (opts: SyncOptions = {}): Promise<SyncResult> => {
  if (inFlight !== null) return inFlight

  inFlight = (async (): Promise<SyncResult> => {
    const denied = await checkGate(opts.force === true)
    if (denied !== null) return { ok: false, error: denied }
    try {
      return await runSync()
    } catch (error) {
      return { ok: false, error: toError(error) }
    }
  })()

  return inFlight.then((result) => {
    inFlight = null
    emit(result)
    return result
  })
}

/** Единый движок синхронизации приложения. */
export const syncEngine = { sync, onChange }
