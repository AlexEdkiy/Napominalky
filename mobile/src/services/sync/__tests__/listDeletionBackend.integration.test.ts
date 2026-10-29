/** Opt-in: real Laravel/PostgreSQL on loopback, real mobile repositories/SQLite/outbox.
 * Only HTTP transport and native modules are adapted for Node. See DEV-26 report.
 */
jest.mock('@/db/client', () => ({ get db() { return mockDb } }))
jest.mock('@/api/syncApi', () => ({ syncApi: { pushChanges: jest.fn(), getChanges: jest.fn() } }))

import { request } from 'node:http'
import { randomUUID } from 'node:crypto'
import * as Crypto from 'expo-crypto'
import { syncApi } from '@/api/syncApi'
import { createSqliteTestDb } from '@/db/testing/sqlite'
import type { Database } from '@/db/client'
import { ShoppingListsRepository } from '@/db/repositories/shoppingListsRepo'
import { syncOutbox } from '@/db/schema'
import type { SyncChangesResponse, SyncPushResult } from '@/types/sync'
import { pushChanges } from '../pushChanges'
import { pullChanges } from '../pullChanges'
import { createSyncSession } from '../syncSession'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'

const base = process.env['SYNC_INTEGRATION_URL']
const integration = base ? describe : describe.skip
const send = syncApi.pushChanges as jest.MockedFunction<typeof syncApi.pushChanges>
const receive = syncApi.getChanges as jest.MockedFunction<typeof syncApi.getChanges>
let token = ''
let mockDb: Database

const http = <T,>(path: string, method = 'GET', body?: unknown): Promise<T> => {
  const url = new URL(`${base}/api/v1${path}`)
  if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:') throw new Error('Disposable loopback API required')
  return new Promise((resolve, reject) => {
    const req = request(url, { method, headers: {
      Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
    } }, (res) => {
      let text = ''
      res.on('data', (chunk: Buffer) => { text += chunk.toString() })
      res.on('end', () => {
        if ((res.statusCode ?? 500) >= 400) { reject(new Error(`HTTP ${res.statusCode}: ${text}`)); return }
        resolve(JSON.parse(text) as T)
      })
    })
    req.on('error', reject)
    req.end(body === undefined ? undefined : JSON.stringify(body))
  })
}

integration('DEV-26 mobile SQLite → real backend → SQLite', () => {
  let fixture: ReturnType<typeof createSqliteTestDb>
  let repo: ShoppingListsRepository
  const queued = () => fixture.db.select().from(syncOutbox).all()
  const transport: typeof syncApi.pushChanges = async (device, name, changes) => {
    const result = await http<{ data: SyncPushResult }>('/sync/push', 'POST', {
      device_uuid: device, device_name: name, changes,
    })
    return result.data
  }
  beforeAll(async () => {
    token = (await http<{ data: { token: string } }>('/auth/login', 'POST', {
      email: 'dev26@example.test', password: 'test-password-26',
    })).data.token
  })
  beforeEach(() => {
    fixture = createSqliteTestDb()
    mockDb = fixture.db
    repo = new ShoppingListsRepository(fixture.db)
    ;(Crypto.randomUUID as jest.Mock).mockImplementation(randomUUID)
    send.mockReset().mockImplementation(transport)
    receive.mockReset().mockImplementation((since) => http<SyncChangesResponse>(`/sync/changes?since=${since}`))
    useAuthStore.setState({ token, accountId: 'test-owner', guestMode: false, isSwitching: false,
      syncEnabled: true, isHydrated: true })
    useSettingsStore.setState({ syncEnabled: true, isHydrated: true })
  })
  afterEach(() => { fixture.close(); jest.restoreAllMocks() })

  const create = async (count: number, manual: boolean, type: 'tasks' | 'goods' = 'tasks') => {
    const list = await repo.createList({ title: 'Synthetic deletion regression', type })
    if (manual) await repo.setListStatus(list.uuid, 'in_progress')
    for (let index = 0; index < count; index++) {
      await repo.addItem(list.uuid, { name: `Synthetic item ${index}`,
        deadline: '2026-12-25', reminderAt: '2026-12-25T09:00:00Z' })
    }
    expect((await pushChanges(fixture.db))?.conflicts).toEqual([])
    await pullChanges(fixture.db)
    send.mockClear()
    return list.uuid
  }

  it.each([[23, true, 'tasks'], [23, false, 'tasks'], [501, true, 'tasks'], [23, false, 'goods']] as const)(
    'deletes %i items (manual=%s, type=%s), survives a lost response and reaches another client', async (count, manual, type) => {
      const uuid = await create(count, manual, type)
      const other = createSqliteTestDb()
      try {
        await pullChanges(other.db)
        await repo.deleteList(uuid)
        expect(queued()).toHaveLength(count + 1)
        // Offline: no exchange happened, all mutations are still queued.
        expect(await repo.getListByUuid(uuid)).toBeNull()
        // Server commits, but the response is lost before the client can acknowledge.
        send.mockImplementationOnce(async (...args) => {
          await transport(...args)
          throw new Error('simulated lost response')
        })
        await expect(pushChanges(fixture.db)).rejects.toThrow('simulated lost response')
        expect(queued()).toHaveLength(count + 1)
        expect((await pushChanges(fixture.db))?.conflicts).toEqual([])
        expect(queued()).toHaveLength(0)
        if (count > 500) expect(send.mock.calls.map((call) => call[2].length)).toEqual([500, 500, 2])
        await pullChanges(fixture.db)
        await pullChanges(other.db)
        expect(await repo.getListByUuid(uuid)).toBeNull()
        expect(await new ShoppingListsRepository(other.db).getListByUuid(uuid)).toBeNull()
        expect(await new ShoppingListsRepository(other.db).listItems(uuid)).toEqual([])
        const web = await http<{ data: Array<{ uuid: string }> }>('/shopping-lists?per_page=100')
        expect(web.data.some((list) => list.uuid === uuid)).toBe(false)
      } finally { other.close() }
    }, 60000,
  )

  it('preserves a new edit made during the request', async () => {
    const uuid = await create(1, false)
    expect((await repo.getListByUuid(uuid))?.status).toBe('new')
    await repo.updateList(uuid, { title: 'First edit' })
    send.mockImplementationOnce(async (...args) => {
      const ack = await transport(...args)
      await repo.updateList(uuid, { title: 'Edit during request' })
      return ack
    })
    await pushChanges(fixture.db)
    expect(queued()).toHaveLength(1)
    expect((await repo.getListByUuid(uuid))?.title).toBe('Edit during request')
    await pushChanges(fixture.db)
    await pullChanges(fixture.db)
    expect((await repo.getListByUuid(uuid))?.title).toBe('Edit during request')
  })

  it('receives a derived status after a remote item edit even with a millisecond local parent clock', async () => {
    const uuid = await create(1, false)
    const item = (await repo.listItems(uuid))[0]!
    await new Promise((resolve) => setTimeout(resolve, 1100))
    await http(`/shopping-lists/${uuid}/items/${item.uuid}`, 'PUT', { status: 'done' })
    await pullChanges(fixture.db)
    expect((await repo.getListByUuid(uuid))?.status).toBe('done')
    expect((await repo.listItems(uuid))[0]?.isChecked).toBe(true)
  })

  it('preserves a real newer edit from another device when an offline deletion arrives', async () => {
    const uuid = await create(1, true)
    await repo.deleteList(uuid)
    await new Promise((resolve) => setTimeout(resolve, 1100))
    await http(`/shopping-lists/${uuid}`, 'PUT', { title: 'Newer device edit' })
    const result = await pushChanges(fixture.db)
    expect(result?.conflicts).toEqual([expect.objectContaining({ entity_uuid: uuid })])
    expect(queued()).toHaveLength(0)
    await pullChanges(fixture.db)
    expect((await repo.getListByUuid(uuid))?.title).toBe('Newer device edit')
  })

  it.each(['logout', 'switch'])('does not acknowledge an old response after %s', async (action) => {
    const uuid = await create(1, true)
    await repo.deleteList(uuid)
    const queuedBefore = queued()
    const nextAccount = createSqliteTestDb()
    const session = createSyncSession()
    try {
      send.mockImplementationOnce(async (...args) => {
        const result = await transport(...args)
        if (action === 'logout') useAuthStore.setState({ token: null, accountId: null, guestMode: true })
        else {
          mockDb = nextAccount.db
          useAuthStore.setState({ token: 'different-account-token', accountId: 'other-owner' })
        }
        return result
      })
      await expect(pushChanges(fixture.db, session)).rejects.toThrow('sync_cancelled')
      expect(queued()).toEqual(queuedBefore)
      expect(await new ShoppingListsRepository(nextAccount.db).listLists()).toEqual([])
      expect(nextAccount.db.select().from(syncOutbox).all()).toEqual([])
    } finally { session.dispose(); nextAccount.close() }
  })
})
