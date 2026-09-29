import type { Router } from 'vue-router'

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
  if (now - readStamp() < RELOAD_COOLDOWN_MS) {
    return false
  }
  writeStamp(now)
  reload()
  return true
}

export function setupStaleChunkReload(router: Router): void {
  router.onError((error) => {
    if (isStaleChunkError(error)) {
      reloadForStaleChunk()
    }
  })
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    reloadForStaleChunk()
  })
}
