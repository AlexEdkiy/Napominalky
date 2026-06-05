jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('@/api/syncApi', () => ({
  syncApi: { pushChanges: jest.fn(), getChanges: jest.fn() },
}))
jest.mock('../applyChanges', () => ({ applyChanges: jest.fn() }))
jest.mock('../syncMeta', () => ({
  getOrCreateDeviceUuid: jest.fn(async () => 'dev-1'),
  getDeviceName: jest.fn(async () => null),
  getLastPulledRevision: jest.fn(async () => 0),
}))

import { syncApi } from '@/api/syncApi'
import type { SyncChangesResponse, SyncPushResult } from '@/types/sync'
import { applyChanges } from '../applyChanges'
import { getLastPulledRevision } from '../syncMeta'
import { pullChanges } from '../pullChanges'
import { pushChanges } from '../pushChanges'

const mockedPush = syncApi.pushChanges as jest.MockedFunction<typeof syncApi.pushChanges>
const mockedGet = syncApi.getChanges as jest.MockedFunction<typeof syncApi.getChanges>
const mockedApply = applyChanges as jest.MockedFunction<typeof applyChanges>
const mockedRevision = getLastPulledRevision as jest.MockedFunction<
  typeof getLastPulledRevision
>

interface FakeOutboxState {
  rows: Array<Record<string, unknown>>
  deleted: number
}

/** Минимальный фейк db: select из outbox отдаёт rows, delete считается. */
const createFakeDb = (state: FakeOutboxState): unknown => ({
  select: () => ({
    from: () => ({ orderBy: async () => state.rows }),
  }),
  delete: () => ({ where: async () => void (state.deleted += 1) }),
})

const outboxRow = (uuid: string): Record<string, unknown> => ({
  id: 1,
  entityType: 'note',
  entityUuid: uuid,
  operation: 'update',
  payload: JSON.stringify({ uuid, title: 't' }),
  updatedAt: '2026-01-01T00:00:00Z',
  attempts: 0,
  createdAt: '2026-01-01T00:00:00Z',
})

const pushResult = (over: Partial<SyncPushResult> = {}): SyncPushResult => ({
  applied: [],
  conflicts: [],
  cursor: 1,
  ...over,
})

const changesResponse = (cursor: number, hasMore: boolean): SyncChangesResponse => ({
  data: { notes: [], shopping_lists: [], shopping_list_items: [], reminders: [] },
  meta: { cursor, has_more: hasMore },
})

beforeEach(() => jest.clearAllMocks())

describe('pushChanges', () => {
  it('возвращает null при пустом outbox', async () => {
    const db = createFakeDb({ rows: [], deleted: 0 }) as never
    await expect(pushChanges(db)).resolves.toBeNull()
    expect(mockedPush).not.toHaveBeenCalled()
  })

  it('пушит изменения и очищает applied + conflicts', async () => {
    const state: FakeOutboxState = { rows: [outboxRow('n1')], deleted: 0 }
    mockedPush.mockResolvedValue(
      pushResult({
        applied: ['n1'],
        conflicts: [
          { entity_type: 'note', entity_uuid: 'n2', server_payload: {}, client_payload: {} },
        ],
      }),
    )

    const result = await pushChanges(createFakeDb(state) as never)

    expect(mockedPush).toHaveBeenCalledWith('dev-1', null, [
      expect.objectContaining({ uuid: 'n1', entity_type: 'note' }),
    ])
    expect(state.deleted).toBe(1)
    expect(result?.applied).toEqual(['n1'])
  })
})

describe('pullChanges', () => {
  it('применяет изменения и идёт по страницам, пока has_more', async () => {
    mockedRevision.mockResolvedValue(0)
    mockedGet
      .mockResolvedValueOnce(changesResponse(5, true))
      .mockResolvedValueOnce(changesResponse(9, false))

    await pullChanges({} as never)

    expect(mockedGet).toHaveBeenNthCalledWith(1, 0)
    expect(mockedGet).toHaveBeenNthCalledWith(2, 5)
    expect(mockedApply).toHaveBeenCalledTimes(2)
  })

  it('прерывается при незыблемом курсоре (защита от зацикливания)', async () => {
    mockedRevision.mockResolvedValue(0)
    mockedGet.mockResolvedValue(changesResponse(0, true))

    await pullChanges({} as never)

    expect(mockedGet).toHaveBeenCalledTimes(1)
  })
})
