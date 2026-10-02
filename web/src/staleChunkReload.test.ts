import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reportConnectionLost, retryConnection } from '@/connection'

import { isStaleChunkError, reloadForStaleChunk, setupStaleChunkReload } from './staleChunkReload'

describe('staleChunkReload', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('распознаёт ошибки загрузки чанка и не трогает остальные', () => {
    expect(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: x.js'))).toBe(true)
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isStaleChunkError(new Error('Unable to preload CSS for /assets/a.css'))).toBe(true)
    expect(isStaleChunkError(new Error('Request failed with status code 500'))).toBe(false)
    expect(isStaleChunkError('строка')).toBe(false)
  })

  it('перезагружает один раз и молчит в течение 10 секунд (защита от цикла)', () => {
    const reload = vi.fn()
    expect(reloadForStaleChunk(reload, 1_000_000)).toBe(true)
    expect(reloadForStaleChunk(reload, 1_005_000)).toBe(false)
    expect(reloadForStaleChunk(reload, 1_011_000)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('вешает обработчик на router.onError и vite:preloadError', () => {
    const handlers: Array<(error: unknown) => void> = []
    const router = { currentRoute: { value: { matched: [{}] } }, onError: (handler: (error: unknown) => void) => handlers.push(handler) }
    const addEventListener = vi.spyOn(window, 'addEventListener')

    setupStaleChunkReload(router as never)

    expect(handlers).toHaveLength(1)
    expect(addEventListener).toHaveBeenCalledWith('vite:preloadError', expect.any(Function))
  })

  it('does not reload or consume the reload cooldown when connectivity is lost', async () => {
    const reload = vi.fn()
    reportConnectionLost()
    expect(reloadForStaleChunk(reload, 1_000_000)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('napominalki:stale-chunk-reload-at')).toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } })))
    await retryConnection()
    expect(reloadForStaleChunk(reload, 1_000_000)).toBe(true)
    vi.unstubAllGlobals()
  })

})
