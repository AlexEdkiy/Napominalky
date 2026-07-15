import { ref } from 'vue'

import { syncApi } from '@/api/syncApi'
import { useLkForms } from '@/composables/useLkForms'

/**
 * Module-level (синглтон) состояние метра синхронизации в сайдбаре ЛК —
 * общее для всех компонентов, использующих `useSyncMeter`, чтобы анимация и
 * статус не зависели от того, какой именно компонент инициировал `runSync`.
 */
const isSyncing = ref(false)
const lastSyncedAt = ref<Date | null>(null)
const error = ref<string | null>(null)

/**
 * Бампит версии-счётчики всех разделов ЛК (`useLkForms`): открытый раздел
 * (задачи/заметки/напоминания/обзор/right-rail) watch'ит свою версию и
 * перечитывает данные из REST — так после синхронизации веб подхватывает
 * изменения, сделанные в другом клиенте (мобилке), без F5.
 */
function bumpSectionVersions(): void {
  const { notifyTaskSaved, notifyNoteSaved, notifyReminderSaved } = useLkForms()
  notifyTaskSaved()
  notifyNoteSaved()
  notifyReminderSaved()
}

/**
 * Запускает лёгкий delta-pull (`GET /sync/changes`, от начала истории) как
 * статус-пул для индикатора синхронизации, а при успехе бампит версии
 * разделов, чтобы открытый раздел перезагрузил свежие данные. Не бросает
 * ошибку наружу — при сбое просто фиксирует сообщение в `error` и возвращает
 * метр в состояние покоя. Повторный вызов, пока предыдущий ещё выполняется,
 * игнорируется.
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
    bumpSectionVersions()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось синхронизировать данные'
  } finally {
    isSyncing.value = false
  }
}

/**
 * Сбрасывает синглтон-состояние метра в исходное — только для тестов
 * (модуль переиспользуется между `it()`-блоками в одном тестовом файле).
 */
export function resetSyncMeterForTests(): void {
  isSyncing.value = false
  lastSyncedAt.value = null
  error.value = null
}

/**
 * Инкапсулирует общий (module-level) реактивный статус синхронизации,
 * который отображает метр `LkSidebar`: `isSyncing` управляет анимацией
 * прогресс-бара, `lastSyncedAt` — временем последней успешной синхронизации.
 */
export function useSyncMeter() {
  return { isSyncing, lastSyncedAt, error, runSync }
}
