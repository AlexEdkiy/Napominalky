import { ref } from 'vue'

import { syncApi } from '@/api/syncApi'

/**
 * Module-level (синглтон) состояние метра синхронизации в сайдбаре ЛК —
 * общее для всех компонентов, использующих `useSyncMeter`, чтобы анимация и
 * статус не зависели от того, какой именно компонент инициировал `runSync`.
 */
const isSyncing = ref(false)
const lastSyncedAt = ref<Date | null>(null)
const error = ref<string | null>(null)

/**
 * Запускает лёгкий delta-pull (`GET /sync/changes`, от начала истории) как
 * статус-пул для индикатора синхронизации. Не бросает ошибку наружу — при
 * сбое просто фиксирует сообщение в `error` и возвращает метр в состояние покоя.
 * Повторный вызов, пока предыдущий ещё выполняется, игнорируется.
 */
async function runSync(): Promise<void> {
  if (isSyncing.value) {
    return
  }
  isSyncing.value = true
  error.value = null
  try {
    await syncApi.fetchChanges(0)
    lastSyncedAt.value = new Date()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось синхронизировать данные'
  } finally {
    isSyncing.value = false
  }
}

/**
 * Инкапсулирует общий (module-level) реактивный статус синхронизации,
 * который отображает метр `LkSidebar`: `isSyncing` управляет анимацией
 * прогресс-бара, `lastSyncedAt` — временем последней успешной синхронизации.
 */
export function useSyncMeter() {
  return { isSyncing, lastSyncedAt, error, runSync }
}
