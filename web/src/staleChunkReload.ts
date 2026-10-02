import type { Router } from 'vue-router'
import { watch } from 'vue'
import { reportConnectionLost, retryConnection, useConnection } from '@/connection'

/**
 * Защита от устаревших чанков после деплоя (WEB-51): кэшированный index.html
 * ссылается на хэши, которых на сервере уже нет → ленивый роут не грузится.
 * При такой ошибке страница перезагружается один раз (не чаще раза в 10 с —
 * защита от цикла), браузер получает свежий index.html с актуальными хэшами.
 */

const RELOAD_STAMP_KEY = 'napominalki:stale-chunk-reload-at'
const RELOAD_COOLDOWN_MS = 10_000

const CHUNK_ERROR_PATTERN =
  /dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading chunk/i

export function isStaleChunkError(error: unknown): boolean {
  return error instanceof Error && CHUNK_ERROR_PATTERN.test(error.message)
}

function readStamp(): number {
  try {
    return Number(sessionStorage.getItem(RELOAD_STAMP_KEY) ?? 0)
  } catch {
    return 0
  }
}

function writeStamp(now: number): void {
  try {
    sessionStorage.setItem(RELOAD_STAMP_KEY, String(now))
  } catch {
    // sessionStorage недоступен (приватный режим) — перезагрузим без защиты.
  }
}

/** Перезагружает страницу, если с прошлой перезагрузки прошло ≥ 10 с. */
export function reloadForStaleChunk(
  reload: () => void = () => window.location.reload(),
  now: number = Date.now(),
): boolean {
  if (!navigator.onLine || useConnection().unavailable.value) {
    reportConnectionLost()
    return false
  }
  if (now - readStamp() < RELOAD_COOLDOWN_MS) {
    return false
  }
  writeStamp(now)
  reload()
  return true
}

function handleChunkFailure(): void {
  if (!navigator.onLine || useConnection().unavailable.value) {
    reportConnectionLost()
    return
  }
  // A failed lazy import can also mean lost connectivity, not an old deployment.
  void retryConnection().then(connected => { if (connected) reloadForStaleChunk() })
}

export function setupStaleChunkReload(router: Router): void {
  watch(useConnection().recoveryCount, () => {
    // If no route ever mounted, there is no draft to preserve. Failed initial imports
    // can stay rejected in the module map, so recover with one fresh document load.
    if (router.currentRoute.value.matched.length === 0) {
      reloadForStaleChunk()
    }
  })
  router.onError((error) => {
    if (isStaleChunkError(error)) {
      handleChunkFailure()
    }
  })
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    handleChunkFailure()
  })
}
