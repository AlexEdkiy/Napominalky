// @vitest-environment node
import source from '../public/offline-worker.js?raw'
import { expect, it, vi } from 'vitest'

async function worker() {
  const handlers = new Map<string, (event: unknown) => void>()
  const stored = new Map<string, Response>()
  const cache = {
    put: async (key: string, response: Response) => { stored.set(key, response.clone()) },
    match: async (key: string | { url: string }) => stored.get(typeof key === 'string' ? key : key.url)?.clone(),
  }
  const caches = { open: async () => cache, keys: async () => ['another-app', 'napominalki-offline:/napominalki/:v0', 'napominalki-offline:/napominalki/:v1'], delete: vi.fn() }
  const fetch = vi.fn(async () => new Response('<head></head><body>Offline</body>', { headers: { 'content-type': 'text/html', 'content-length': '100', 'content-encoding': 'gzip' } }))
  const self = { registration: { scope: 'https://example.test/napominalki/' }, addEventListener: (type: string, fn: (event: unknown) => void) => handlers.set(type, fn), skipWaiting: vi.fn(), clients: { claim: vi.fn() } }
  // Execute the actual browser script with isolated worker/cache/network dependencies.
  new Function('self', 'fetch', 'caches', 'URL', 'Response', 'Headers', source)(self, fetch, caches, URL, Response, Headers)
  let installed: Promise<unknown> | undefined
  handlers.get('install')?.({ waitUntil: (p: Promise<unknown>) => { installed = p } })
  await installed
  function request(url: string, mode = 'navigate', method = 'GET') {
    let response: Promise<Response> | undefined
    handlers.get('fetch')?.({ request: { url, mode, method }, respondWith: (p: Promise<Response>) => { response = p } })
    return response
  }
  return { handlers, caches, fetch, stored, request }
}

it('prepares only four public fallback assets with the correct base for deep URLs', async () => {
  const { stored, fetch } = await worker()
  expect([...stored.keys()].map(url => url.split('/').pop()).sort()).toEqual(['connection-illustration.png', 'connection.css', 'offline-retry.js', 'offline.html'])
  const page = stored.get('https://example.test/napominalki/offline.html')!
  expect(await page.text()).toContain('<base href="/napominalki/">')
  expect(page.headers.has('content-encoding')).toBe(false)
  expect(page.headers.has('content-length')).toBe(false)
  expect(fetch.mock.calls).toHaveLength(4)
})

it('uses network for navigation and falls back on transport failure without caching user pages', async () => {
  const { request, fetch, stored } = await worker()
  fetch.mockRejectedValueOnce(new TypeError('offline'))
  const response = await request('https://example.test/napominalki/lk/notes?q=test')
  expect(await response?.text()).toContain('Offline')
  expect(stored.size).toBe(4)
  fetch.mockResolvedValueOnce(new Response('server error', { status: 503 }))
  expect((await request('https://example.test/napominalki/login'))?.status).toBe(503)
})

it('never intercepts writes, API, app bundles, storage or other applications', async () => {
  const { request, fetch } = await worker()
  fetch.mockClear()
  for (const path of ['api/v1/notes', 'assets/bundle.js', 'storage/avatar', 'release.json']) {
    expect(request('https://example.test/napominalki/' + path)).toBeUndefined()
  }
  expect(request('https://example.test/napominalki/lk', 'navigate', 'POST')).toBeUndefined()
  expect(request('https://example.test/other-app/')).toBeUndefined()
  expect(request('https://other.test/napominalki/lk')).toBeUndefined()
  expect(fetch).not.toHaveBeenCalled()
})

it('serves the cached illustration offline and cleans up only its own old cache', async () => {
  const { request, fetch, caches, handlers } = await worker()
  fetch.mockClear()
  expect((await request('https://example.test/napominalki/connection-illustration.png', 'no-cors'))?.status).toBe(200)
  expect(fetch).not.toHaveBeenCalled()
  let activated: Promise<unknown> | undefined
  handlers.get('activate')?.({ waitUntil: (p: Promise<unknown>) => { activated = p } })
  await activated
  expect(caches.delete).toHaveBeenCalledExactlyOnceWith('napominalki-offline:/napominalki/:v0')
})
