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
// колонку и значения: фейк-db применяет реальную семантику удаления.
jest.mock('drizzle-orm', () => ({
  ...jest.requireActual('drizzle-orm'),
  inArray: (column: unknown, values: readonly unknown[]) => ({ column, values: [...values] }),
}))

import { syncApi } from '@/api/syncApi'
import { syncOutbox } from '@/db/schema/syncOutbox'
import { AxiosError } from 'axios'
import type { SyncChange, SyncPushResult } from '@/types/sync'
import { pushChanges } from '../pushChanges'

const mockedPush = syncApi.pushChanges as jest.MockedFunction<typeof syncApi.pushChanges>

interface FakeOutboxState {
  rows: Array<Record<string, unknown>>
  /** ID удалённых строк очереди, включая удаление по UUID в старом коде. */
  deletedIds: number[][]
}

/**
 * Фейк db: select из outbox отдаёт rows (в порядке orderBy), delete фиксирует
 * удалённые строки из where(inArray(...)) — для проверки сохранности очереди.
 */
const createFakeDb = (state: FakeOutboxState): unknown => ({
  select: () => ({
    from: () => ({ orderBy: async () => [...state.rows] }),
  }),
  delete: () => ({
    where: async (cond: { column: unknown; values: unknown[] }) => {
      const field = cond.column === syncOutbox.id ? 'id' : 'entityUuid'
      const removed = state.rows.filter((row) => cond.values.includes(row[field]))
      state.deletedIds.push(removed.map((row) => row.id as number))
      state.rows = state.rows.filter((row) => !cond.values.includes(row[field]))
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
  rows: rows.map((row, index) => ({ ...row, id: index + 1 })),
  deletedIds: [],
})

beforeEach(() => {
  jest.clearAllMocks()
  mockedPush.mockReset()
})

describe('pushChanges — пустой outbox', () => {
  it('возвращает null и не вызывает syncApi при пустой очереди', async () => {
    const state = newState([])
    const db = createFakeDb(state) as never

    await expect(pushChanges(db)).resolves.toBeNull()

    expect(mockedPush).not.toHaveBeenCalled()
    expect(state.deletedIds).toHaveLength(0)
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

    expect(state.deletedIds).toHaveLength(1)
    const removed = state.deletedIds[0] ?? []
    expect(removed).toEqual([1, 2])
    expect(state.rows.map((row) => row.entityUuid)).toEqual(['pending-1'])
    expect(result?.applied).toEqual(['applied-1'])
  })

  it('не вызывает delete, если applied и conflicts пусты', async () => {
    const state = newState([outboxRow({ entityUuid: 'n1' })])
    mockedPush.mockResolvedValue(pushResult({ applied: [], conflicts: [] }))

    await pushChanges(createFakeDb(state) as never)

    expect(state.deletedIds).toHaveLength(0)
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

    expect(state.deletedIds[0]).toEqual([1])
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
    expect(state.deletedIds).toHaveLength(0)
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
    expect(state.deletedIds).toHaveLength(0)
  })
})

describe('pushChanges — ограниченные батчи и сохранность очереди', () => {
  it.each([500, 501, 1001])('отправляет %i изменений батчами не больше 500', async (count) => {
    const rows = Array.from({ length: count }, (_, index) => outboxRow({ entityUuid: `n${index}` }))
    const state = newState(rows)
    let cursor = 0
    mockedPush.mockImplementation(async (_, __, changes) => {
      if (changes.length > 500) throw new Error('422: changes exceeds max:500')
      return pushResult({ applied: changes.map((change) => change.uuid), cursor: ++cursor })
    })

    const result = await pushChanges(createFakeDb(state) as never)

    expect(mockedPush).toHaveBeenCalledTimes(Math.ceil(count / 500))
    expect(mockedPush.mock.calls.flatMap((call) => call[2].map((change) => change.uuid)))
      .toEqual(rows.map((row) => row.entityUuid))
    expect(result?.applied).toHaveLength(count)
    expect(result?.cursor).toBe(Math.ceil(count / 500))
    expect(state.rows).toEqual([])
  })

  it('сохраняет новую правку той же сущности, появившуюся во время запроса', async () => {
    const state = newState([outboxRow({ entityUuid: 'n1' })])
    mockedPush.mockImplementation(async () => {
      state.rows.push(outboxRow({ entityUuid: 'n1', id: 2, payload: '{"title":"new edit"}' }))
      return pushResult({ applied: ['n1'] })
    })

    await pushChanges(createFakeDb(state) as never)

    expect(state.deletedIds).toEqual([[1]])
    expect(state.rows).toEqual([expect.objectContaining({ id: 2, entityUuid: 'n1' })])
  })

  it('сохраняет неотправленную правку за границей батча при сбое следующего запроса', async () => {
    const rows = Array.from({ length: 501 }, () => outboxRow({ entityUuid: 'same-note' }))
    const state = newState(rows)
    mockedPush.mockResolvedValueOnce(pushResult({ applied: ['same-note'] }))
      .mockRejectedValueOnce(new Error('second batch failed'))

    await expect(pushChanges(createFakeDb(state) as never)).rejects.toThrow('second batch failed')

    expect(state.deletedIds[0]).toHaveLength(500)
    expect(state.rows.map((row) => row.id)).toEqual([501])
    mockedPush.mockResolvedValueOnce(pushResult({ applied: ['same-note'] }))
    await pushChanges(createFakeDb(state) as never)
    expect(mockedPush.mock.calls[2]?.[2]).toHaveLength(1)
    expect(state.rows).toEqual([])
  })

  it('объединяет конфликты батчей и сохраняет неподтверждённые записи', async () => {
    const rows = Array.from({ length: 501 }, (_, index) => outboxRow({ entityUuid: `n${index}` }))
    const state = newState(rows)
    const conflict = (uuid: string) => ({
      entity_type: 'note' as const, entity_uuid: uuid, server_payload: {}, client_payload: {},
    })
    mockedPush.mockResolvedValueOnce(pushResult({ conflicts: [conflict('n0')], cursor: 4 }))
      .mockResolvedValueOnce(pushResult({ conflicts: [conflict('n500')], cursor: 7 }))

    const result = await pushChanges(createFakeDb(state) as never)

    expect(result?.conflicts.map((entry) => entry.entity_uuid)).toEqual(['n0', 'n500'])
    expect(result?.cursor).toBe(7)
    expect(state.rows).toHaveLength(499)
    expect(state.deletedIds).toEqual([[1], [501]])
    expect(mockedPush).toHaveBeenCalledTimes(2)
  })

  it('не удаляет другую сущность с тем же UUID по чужому конфликту', async () => {
    const state = newState([outboxRow({ entityUuid: 'shared', entityType: 'note' })])
    mockedPush.mockResolvedValue(pushResult({ conflicts: [{
      entity_type: 'reminder', entity_uuid: 'shared', server_payload: {}, client_payload: {},
    }] }))

    await pushChanges(createFakeDb(state) as never)

    expect(state.deletedIds).toEqual([])
    expect(state.rows).toHaveLength(1)
  })
})
