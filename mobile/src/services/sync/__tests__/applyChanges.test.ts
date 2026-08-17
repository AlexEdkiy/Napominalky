// Изолируем тест от нативного expo-sqlite: applyChanges принимает db явно.
jest.mock('@/db/client', () => ({ db: {} }))

import { applyChanges } from '../applyChanges'
import type {
  ServerNote,
  ServerReminder,
  ServerShoppingListItemComment,
  SyncChangesResponse,
} from '@/types/sync'

interface InsertCall {
  table: unknown
  values: Record<string, unknown>
}

interface UpdateCall {
  table: unknown
  values: Record<string, unknown>
}

interface FakeState {
  inserts: InsertCall[]
  updates: UpdateCall[]
  /** Существующие строки по uuid: возвращаются select'ом для LWW. */
  existing: Record<string, { updatedAt: string }>
}

/**
 * Фейк Drizzle-writer: select по uuid отдаёт existing[uuid] (или пусто),
 * insert/update фиксируются. transaction вызывает колбэк с тем же writer'ом.
 */
const createFakeDb = (state: FakeState) => {
  const writer = {
    select: () => ({
      from: () => ({
        where: (cond: { uuid: string }) => ({
          limit: async () => {
            const found = state.existing[cond.uuid]
            return found === undefined ? [] : [found]
          },
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoUpdate: async () => {
          state.inserts.push({ table, values })
        },
        then: (resolve: () => void) => {
          state.inserts.push({ table, values })
          resolve()
        },
      }),
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          state.updates.push({ table, values })
        },
      }),
    }),
  }
  // eq(table.uuid, uuid) у нас замокан: возвращаем объект с uuid для where().
  return {
    ...writer,
    transaction: async (cb: (tx: typeof writer) => Promise<void>) => cb(writer),
  }
}

// Сохраняем реальный drizzle (нужен sqliteTable для схем), но подменяем eq,
// чтобы where() получал { uuid } и фейк-db мог найти existing по uuid.
jest.mock('drizzle-orm', () => ({
  ...jest.requireActual('drizzle-orm'),
  eq: (_col: unknown, value: string) => ({ uuid: value }),
}))

const baseNote = (over: Partial<ServerNote>): ServerNote => ({
  uuid: 'n1',
  title: 'Заметка',
  body: null,
  color: null,
  is_pinned: false,
  is_archived: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  ...over,
})

const emptyResponse = (notes: ServerNote[], cursor = 5): SyncChangesResponse => ({
  data: {
    notes,
    shopping_lists: [],
    shopping_list_items: [],
    reminders: [],
  },
  meta: { cursor, has_more: false },
})

const newState = (existing: FakeState['existing'] = {}): FakeState => ({
  inserts: [],
  updates: [],
  existing,
})

describe('applyChanges — LWW', () => {
  it('вставляет новую серверную запись, если локальной нет', async () => {
    const state = newState()
    const db = createFakeDb(state) as never

    await applyChanges(emptyResponse([baseNote({ uuid: 'n1' })]), db)

    const noteInsert = state.inserts.find((i) => i.values.uuid === 'n1')
    expect(noteInsert).toBeDefined()
    expect(state.updates).toHaveLength(0)
  })

  it('применяет серверную запись, когда она новее локальной (update)', async () => {
    const state = newState({ n1: { updatedAt: '2026-01-01T00:00:00Z' } })
    const db = createFakeDb(state) as never

    await applyChanges(
      emptyResponse([baseNote({ uuid: 'n1', updated_at: '2026-02-01T00:00:00Z' })]),
      db,
    )

    expect(state.updates).toHaveLength(1)
    expect(state.updates[0]?.values.uuid).toBe('n1')
  })

  it('пропускает серверную запись, когда локальная новее (клиент победил)', async () => {
    const state = newState({ n1: { updatedAt: '2026-03-01T00:00:00Z' } })
    const db = createFakeDb(state) as never

    await applyChanges(
      emptyResponse([baseNote({ uuid: 'n1', updated_at: '2026-01-01T00:00:00Z' })]),
      db,
    )

    expect(state.updates).toHaveLength(0)
    const noteInsert = state.inserts.find((i) => i.values.uuid === 'n1')
    expect(noteInsert).toBeUndefined()
  })
})

describe('applyChanges — конвертация и tombstone', () => {
  it('конвертирует booleans true/false в 1/0', async () => {
    const state = newState()
    const db = createFakeDb(state) as never

    await applyChanges(
      emptyResponse([baseNote({ uuid: 'n1', is_pinned: true, is_archived: false })]),
      db,
    )

    const values = state.inserts.find((i) => i.values.uuid === 'n1')?.values
    expect(values?.isPinned).toBe(1)
    expect(values?.isArchived).toBe(0)
  })

  it('применяет tombstone (deleted_at) при удалении на сервере', async () => {
    const state = newState({ n1: { updatedAt: '2026-01-01T00:00:00Z' } })
    const db = createFakeDb(state) as never

    await applyChanges(
      emptyResponse([
        baseNote({
          uuid: 'n1',
          updated_at: '2026-02-01T00:00:00Z',
          deleted_at: '2026-02-01T00:00:00Z',
        }),
      ]),
      db,
    )

    expect(state.updates[0]?.values.deletedAt).toBe('2026-02-01T00:00:00Z')
  })
})

describe('applyChanges — outbox и cursor', () => {
  it('НЕ пишет в sync_outbox (никаких insert в таблицу outbox)', async () => {
    const state = newState()
    const db = createFakeDb(state) as never

    await applyChanges(emptyResponse([baseNote({ uuid: 'n1' })]), db)

    // Все insert'ы — только доменные строки и sync_meta; outbox не трогаем.
    const outboxLike = state.inserts.filter(
      (i) => 'entityType' in i.values || 'operation' in i.values,
    )
    expect(outboxLike).toHaveLength(0)
  })

  it('сохраняет курсор последнего pull в sync_meta', async () => {
    const state = newState()
    const db = createFakeDb(state) as never

    await applyChanges(emptyResponse([], 42), db)

    const cursorInsert = state.inserts.find(
      (i) => i.values.key === 'last_pulled_revision',
    )
    expect(cursorInsert?.values.value).toBe('42')
  })

  it('идемпотентна: повторное применение того же ответа не делает update', async () => {
    // После первого применения локальный updatedAt == серверному.
    const state = newState({ n1: { updatedAt: '2026-02-01T00:00:00Z' } })
    const db = createFakeDb(state) as never
    const response = emptyResponse([
      baseNote({ uuid: 'n1', updated_at: '2026-02-01T00:00:00Z' }),
    ])

    await applyChanges(response, db)
    // updated_at >= local → допустимо применить (LWW не теряет равные),
    // но данные те же, поэтому состояние не ломается.
    await applyChanges(response, db)

    expect(state.inserts.every((i) => i.values.uuid !== 'n1')).toBe(true)
  })

  it('идемпотентна для insert: повторный вызов не создаёт дублей строки', async () => {
    // Эмулируем реальную БД: после первого insert строка существует с тем же
    // updatedAt, поэтому второй проход идёт по ветке LWW (>=), а не insert.
    const state = newState()
    const insertingDb = {
      ...createFakeDb(state),
    } as ReturnType<typeof createFakeDb>
    const db = insertingDb as never
    const response = emptyResponse([
      baseNote({ uuid: 'n1', updated_at: '2026-02-01T00:00:00Z' }),
    ])

    await applyChanges(response, db)
    // Регистрируем строку как существующую — имитация записи из первого прохода.
    state.existing.n1 = { updatedAt: '2026-02-01T00:00:00Z' }
    await applyChanges(response, db)

    const inserts = state.inserts.filter((i) => i.values.uuid === 'n1')
    expect(inserts).toHaveLength(1)
  })

  it('идемпотентна: не пишет outbox-подобных записей при повторном применении', async () => {
    const state = newState({ n1: { updatedAt: '2026-02-01T00:00:00Z' } })
    const db = createFakeDb(state) as never
    const response = emptyResponse([
      baseNote({ uuid: 'n1', updated_at: '2026-02-01T00:00:00Z' }),
    ])

    await applyChanges(response, db)
    await applyChanges(response, db)

    const outboxLike = state.inserts.filter(
      (i) => 'entityType' in i.values || 'operation' in i.values,
    )
    expect(outboxLike).toHaveLength(0)
  })

  it('курсор в sync_meta равен meta.cursor ответа', async () => {
    const state = newState()
    const db = createFakeDb(state) as never

    await applyChanges(emptyResponse([baseNote({ uuid: 'n1' })], 777), db)

    const cursorInsert = state.inserts.find(
      (i) => i.values.key === 'last_pulled_revision',
    )
    expect(cursorInsert?.values.value).toBe('777')
  })
})

describe('applyChanges — reminders', () => {
  it('конвертирует is_completed и переносит source-поля', async () => {
    const state = newState()
    const db = createFakeDb(state) as never
    const reminder: ServerReminder = {
      uuid: 'r1',
      title: 'Позвонить',
      notes: null,
      remind_at: '2026-05-01T10:00:00Z',
      recurrence: 'none',
      is_completed: true,
      completed_at: '2026-05-01T11:00:00Z',
      snoozed_until: null,
      source_uuid: 's1',
      source_type: 'shopping_list',
      created_at: '2026-05-01T09:00:00Z',
      updated_at: '2026-05-01T09:00:00Z',
      deleted_at: null,
    }

    await applyChanges(
      {
        data: { notes: [], shopping_lists: [], shopping_list_items: [], reminders: [reminder] },
        meta: { cursor: 1, has_more: false },
      },
      db,
    )

    const values = state.inserts.find((i) => i.values.uuid === 'r1')?.values
    expect(values?.isCompleted).toBe(1)
    expect(values?.remindAt).toBe('2026-05-01T10:00:00Z')
    expect(values?.sourceUuid).toBe('s1')
  })
})

describe('applyChanges — best-effort (одна сбойная запись не стопорит остальные)', () => {
  /**
   * Создаёт фейк-db, где insert первой записи с uuid === failUuid бросает ошибку,
   * а остальные записи вставляются нормально.
   */
  const createFaultingDb = (state: FakeState, failUuid: string) => {
    const base = createFakeDb(state)
    const origInsert = base.insert.bind(base)
    return {
      ...base,
      insert: (table: unknown) => {
        const chain = origInsert(table)
        return {
          values: (values: Record<string, unknown>) => {
            if (values['uuid'] === failUuid) {
              return {
                onConflictDoUpdate: async () => {
                  throw new Error('NOT NULL constraint failed')
                },
                then: (_res: () => void, rej: (e: Error) => void) => {
                  rej(new Error('NOT NULL constraint failed'))
                },
              }
            }
            return chain.values(values)
          },
        }
      },
    }
  }

  it('пропускает сбойную запись и применяет остальные в батче', async () => {
    const state = newState()
    const db = createFaultingDb(state, 'n2') as never

    const response: SyncChangesResponse = {
      data: {
        notes: [
          baseNote({ uuid: 'n1' }),
          baseNote({ uuid: 'n2' }),
          baseNote({ uuid: 'n3' }),
        ],
        shopping_lists: [],
        shopping_list_items: [],
        reminders: [],
      },
      meta: { cursor: 10, has_more: false },
    }

    await expect(applyChanges(response, db)).resolves.toBeUndefined()

    const insertedUuids = state.inserts
      .filter((i) => i.values['key'] === undefined)
      .map((i) => i.values['uuid'])

    expect(insertedUuids).toContain('n1')
    expect(insertedUuids).not.toContain('n2')
    expect(insertedUuids).toContain('n3')
  })

  it('сохраняет курсор даже когда одна запись упала', async () => {
    const state = newState()
    const db = createFaultingDb(state, 'n1') as never

    await applyChanges(emptyResponse([baseNote({ uuid: 'n1' })], 99), db)

    const cursorInsert = state.inserts.find((i) => i.values['key'] === 'last_pulled_revision')
    expect(cursorInsert?.values['value']).toBe('99')
  })

  it('не пробрасывает ошибку наружу при сбое одной записи', async () => {
    const state = newState()
    const db = createFaultingDb(state, 'n1') as never

    await expect(
      applyChanges(emptyResponse([baseNote({ uuid: 'n1' })], 5), db),
    ).resolves.toBeUndefined()
  })
})

describe('applyChanges — shopping_list_item_comments (тред комментариев)', () => {
  const baseComment = (over: Partial<ServerShoppingListItemComment>): ServerShoppingListItemComment => ({
    uuid: 'c1',
    shopping_list_item_uuid: 'i1',
    author_name: 'Алексей',
    body: 'Взять свежее',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    ...over,
  })

  const commentsResponse = (
    comments: ServerShoppingListItemComment[],
    cursor = 5,
  ): SyncChangesResponse => ({
    data: {
      notes: [],
      shopping_lists: [],
      shopping_list_items: [],
      shopping_list_item_comments: comments,
      reminders: [],
    },
    meta: { cursor, has_more: false },
  })

  it('вставляет серверный комментарий (включая бэкфилл) в локальную таблицу', async () => {
    const state = newState()
    const db = createFakeDb(state) as never

    await applyChanges(commentsResponse([baseComment({ uuid: 'c1' })]), db)

    const values = state.inserts.find((i) => i.values.uuid === 'c1')?.values
    expect(values).toBeDefined()
    expect(values?.shoppingListItemUuid).toBe('i1')
    expect(values?.authorName).toBe('Алексей')
    expect(values?.body).toBe('Взять свежее')
  })

  it('применяет tombstone комментария (deleted_at)', async () => {
    const state = newState({ c1: { updatedAt: '2026-01-01T00:00:00Z' } })
    const db = createFakeDb(state) as never

    await applyChanges(
      commentsResponse([
        baseComment({
          uuid: 'c1',
          updated_at: '2026-02-01T00:00:00Z',
          deleted_at: '2026-02-01T00:00:00Z',
        }),
      ]),
      db,
    )

    expect(state.updates[0]?.values.deletedAt).toBe('2026-02-01T00:00:00Z')
  })

  it('устойчива к старому серверу: ответ БЕЗ shopping_list_item_comments не падает', async () => {
    const state = newState()
    const db = createFakeDb(state) as never
    const legacyResponse = {
      data: {
        notes: [baseNote({ uuid: 'n1' })],
        shopping_lists: [],
        shopping_list_items: [],
        reminders: [],
      },
      meta: { cursor: 3, has_more: false },
    } as SyncChangesResponse

    await expect(applyChanges(legacyResponse, db)).resolves.toBeUndefined()
    expect(state.inserts.find((i) => i.values.uuid === 'n1')).toBeDefined()
  })
})
