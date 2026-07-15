import { onMounted, onUnmounted } from 'vue'

import { useSyncMeter } from '@/composables/useSyncMeter'

/**
 * Минимальный интервал между авто-синхронизациями при возврате фокуса на
 * вкладку — чтобы не долбить API при каждом переключении вкладок.
 */
export const AUTO_REFRESH_THROTTLE_MS = 30_000

/**
 * Авто-обновление данных ЛК при возврате на вкладку: когда документ снова
 * становится видимым (`visibilitychange` → `visible`), запускает `runSync()`
 * из `useSyncMeter` — метр анимируется, а при успехе бампятся версии
 * разделов, и открытый раздел перечитывает свежие данные из REST.
 *
 * Троттлинг — по времени последней успешной синхронизации (`lastSyncedAt`):
 * если она была меньше `AUTO_REFRESH_THROTTLE_MS` назад, вызов пропускается.
 * Overlap-guard от параллельных вызовов встроен в сам `runSync`.
 * Слушатель снимается в `onUnmounted`.
 */
export function useLkAutoRefresh(): void {
  const { lastSyncedAt, runSync } = useSyncMeter()

  function handleVisibilityChange(): void {
    if (document.visibilityState !== 'visible') {
      return
    }
    const last = lastSyncedAt.value
    if (last !== null && Date.now() - last.getTime() < AUTO_REFRESH_THROTTLE_MS) {
      return
    }
    void runSync()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
}
