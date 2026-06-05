// Изолируем от нативного expo-sqlite: pushChanges принимает db явно.
jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('@/api/syncApi', () => ({
  syncApi: { pushChanges: jest.fn(), getChanges: jest.fn() },
}))
jest.mock('../syncMeta', () => ({
  getOrCreateDeviceUuid: jest.fn(async () => 'dev-1'),
  getDeviceName: jest.fn(async () => 'iPhone'),
}))
// Сохраняем реальный drizzle, но подменяем inArray, чтобы where() получал
// список uuid и фейк-db мог зафиксировать, какие именно записи удаляются.
jest.mock('drizzle-orm', () => ({
  ...jest.requireActual('drizzle-orm'),
  inArray: (_col: unknown, values: readonly string[]) => ({ uuids: [...values] }),
}))

import { syncApi } from '@/api/syncApi'
import { AxiosError } from 'axios'
import type { SyncChange, SyncPushResult } from '@/types/sync'
import { pushChanges } from '../pushChanges'

const mockedPush = syncApi.pushChanges as jest.MockedFunction<typeof syncApi.pushChanges>

interface FakeOutboxState {
  rows: Array<Record<string, unknown>>
  /** uuid-списки, переданные в каждый del/where (через мок inArray). */
  deletedUuids: string[][]
}

/**
 * Фейк db: select из outbox отдаёт rows (в порядке orderBy), delete фиксирует
 * список uuid из where(inArray(...)) — для проверки очистки outbox.
 */
const createFakeDb = (state: FakeOutboxState): unknown => ({
  select: () => ({
    from: () => ({ orderBy: async () => state.rows }),
  }),
  delete: () => ({
    where: async (cond: { uuids: string[] }) => {
      state.deletedUuids.push(cond.uuids)
    },
  }),
})

const outboxRow = (
  over: Partial<Record<string, unknown>> & { entityUuid: string },
): Record<string, unknown> => ({
  id: 1,
  entityType: 'note',
  operation: 'update',
  payload: JSON.stringify({ uuid: over.entityUuid, title: 't' }),
  updatedAt: '2026-01-01T00:00:00Z',
  attempts: 0,
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
})

const pushResult = (over: Partial<SyncPushResult> = {}): SyncPushResult => ({
  applied: [],
  conflicts: [],
  cursor: 1,
  ...over,
})

const newState = (rows: Array<Record<string, unknown>> = []): FakeOutboxState => ({
  rows,
  deletedUuids: [],
})

beforeEach(() => jest.clearAllMocks())

describe('pushChanges — пустой outbox', () => {
  it('возвращает null и не вызывает syncApi при пустой очереди', async () => {
    const state = newState([])
    const db = createFakeDb(state) as never

    await expect(pushChanges(db)).resolves.toBeNull()

    expect(mockedPush).not.toHaveBeenCalled()
    expect(state.deletedUuids).toHaveLength(0)
  })
})

describe('pushChanges — маппинг outbox → SyncChange', () => {
  it('корректно мапит entity_type/uuid/operation/payload/updated_at', async () => {
    const state = newState([
      outboxRow({
        entityUuid: 'n1',
        entityType: 'reminder',
        operation: 'create',
        payload: JSON.stringify({ uuid: 'n1', title: 'Позвонить', done: true }),
        updatedAt: '2026-05-01T10:00:00Z',
      }),
    ])
    mockedPush.mockResolvedValue(pushResult({ applied: ['n1'] }))

    await pushChanges(createFakeDb(state) as never)

    expect(mockedPush).toHaveBeenCalledTimes(1)
    const [, , changes] = mockedPush.mock.calls[0] as [string, string | null, SyncChange[]]
    expect(changes).toHaveLength(1)
    expect(changes[0]).toEqual<SyncChange>({
      entity_type: 'reminder',
      uuid: 'n1',
      operation: 'create',
      payload: { uuid: 'n1', title: 'Позвонить', done: true },
      updated_at: '2026-05-01T10:00:00Z',
    })
  })

  it('вызывает syncApi.pushChanges с device_uuid и device_name', async () => {
    const state = newState([outboxRow({ entityUuid: 'n1' })])
    mockedPush.mockResolvedValue(pushResult({ applied: ['n1'] }))

    await pushChanges(createFakeDb(state) as never)

    const [deviceUuid, deviceName] = mockedPush.mock.calls[0] as [
      string,
      string | null,
      SyncChange[],
    ]
    expect(deviceUuid).toBe('dev-1')
    expect(deviceName).toBe('iPhone')
  })

  it('сохраняет порядок записей (orderBy id) при маппинге', async () => {
    const state = newState([
      outboxRow({ entityUuid: 'a', id: 1 }),
      outboxRow({ entityUuid: 'b', id: 2 }),
      outboxRow({ entityUuid: 'c', id: 3 }),
    ])
    mockedPush.mockResolvedValue(pushResult({ applied: ['a', 'b', 'c'] }))

    await pushChanges(createFakeDb(state) as never)

    const [, , changes] = mockedPush.mock.calls[0] as [string, string | null, SyncChange[]]
    expect(changes.map((c) => c.uuid)).toEqual(['a', 'b', 'c'])
  })
})

describe('pushChanges — очистка outbox (applied ∪ conflicts)', () => {
  it('удаляет только applied и conflicts, прочие записи остаются', async () => {
    const state = newState([
      outboxRow({ entityUuid: 'applied-1' }),
      outboxRow({ entityUuid: 'conflict-1' }),
      outboxRow({ entityUuid: 'pending-1' }),
    ])
    mockedPush.mockResolvedValue(
      pushResult({
        applied: ['applied-1'],
        conflicts: [
          {
            entity_type: 'note',
            entity_uuid: 'conflict-1',
            server_payload: {},
            client_payload: {},
          },
        ],
      }),
    )

    const result = await pushChanges(createFakeDb(state) as never)

    expect(state.deletedUuids).toHaveLength(1)
    const removed = state.deletedUuids[0] ?? []
    expect(removed).toEqual(['applied-1', 'conflict-1'])
    expect(removed).not.toContain('pending-1')
    expect(result?.applied).toEqual(['applied-1'])
  })

  it('не вызывает delete, если applied и conflicts пусты', async () => {
    const state = newState([outboxRow({ entityUuid: 'n1' })])
    mockedPush.mockResolvedValue(pushResult({ applied: [], conflicts: [] }))

    await pushChanges(createFakeDb(state) as never)

    expect(state.deletedUuids).toHaveLength(0)
  })

  it('удаляет конфликтные записи (клиент проиграл LWW), чтобы не пушить вечно', async () => {
    const state = newState([outboxRow({ entityUuid: 'c1' })])
    mockedPush.mockResolvedValue(
      pushResult({
        applied: [],
        conflicts: [
          {
            entity_type: 'note',
            entity_uuid: 'c1',
            server_payload: { title: 'srv' },
            client_payload: { title: 'cli' },
          },
        ],
      }),
    )

    await pushChanges(createFakeDb(state) as never)

    expect(state.deletedUuids[0]).toEqual(['c1'])
  })
})

describe('pushChanges — сетевые ошибки', () => {
  it('пробрасывает ошибку после исчерпания backoff и не чистит outbox', async () => {
    const state = newState([outboxRow({ entityUuid: 'n1' })])
    mockedPush.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))

    // backoff не мокается: реальный withBackoff ретраит сетевую ошибку.
    // Ускоряем, перехватив setTimeout, чтобы тест не ждал реальные секунды.
    jest.useFakeTimers()
    const promise = pushChanges(createFakeDb(state) as never)
    const assertion = expect(promise).rejects.toBeInstanceOf(AxiosError)
    await jest.runAllTimersAsync()
    await assertion
    jest.useRealTimers()

    // Все 5 попыток исчерпаны, outbox не очищен.
    expect(mockedPush).toHaveBeenCalledTimes(5)
    expect(state.deletedUuids).toHaveLength(0)
  })

  it('не ретраит и сразу пробрасывает 4xx', async () => {
    const state = newState([outboxRow({ entityUuid: 'n1' })])
    const error = new AxiosError('Conflict', 'ERR_BAD_REQUEST')
    error.response = {
      status: 422,
      statusText: '',
      data: null,
      headers: {},
      config: { headers: {} as never },
    }
    mockedPush.mockRejectedValue(error)

    await expect(pushChanges(createFakeDb(state) as never)).rejects.toBe(error)

    expect(mockedPush).toHaveBeenCalledTimes(1)
    expect(state.deletedUuids).toHaveLength(0)
  })
})
