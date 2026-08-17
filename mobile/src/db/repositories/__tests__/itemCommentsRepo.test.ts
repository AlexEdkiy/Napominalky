// Изолируем тест от нативного expo-sqlite: репозиторий принимает db явно.
jest.mock('../../client', () => ({ db: {} }))

// Автор комментария берётся из authStore (имя текущего пользователя).
const mockGetState = jest.fn()
jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => mockGetState() },
}))

import { ItemCommentsRepository, resolveAuthorName } from '../itemCommentsRepo'

interface InsertCall {
  values: Record<string, unknown>
}

interface DbCallLog {
  inserts: InsertCall[]
  updates: Array<{ values: Record<string, unknown> }>
  selects: number
}

type FakeRow = Record<string, unknown>

/**
 * Фейк Drizzle-db: insert/update фиксируются, select возвращает selectRows
 * (одна и та же цепочка терминируется limit/orderBy/groupBy — все async).
 */
const createFakeDb = (log: DbCallLog, selectRows: FakeRow[] = []) => ({
  insert: () => ({
    values: (values: Record<string, unknown>) => {
      log.inserts.push({ values })
      return { returning: async () => [values] }
    },
  }),
  update: () => ({
    set: (values: Record<string, unknown>) => {
      log.updates.push({ values })
      return {
        where: () => ({
          returning: async () =>
            selectRows.length > 0 ? [{ ...selectRows[0], ...values }] : [],
        }),
      }
    },
  }),
  select: () => {
    log.selects += 1
    return {
      from: () => ({
        where: () => ({
          limit: async () => selectRows,
          orderBy: async () => selectRows,
          groupBy: async () => selectRows,
        }),
      }),
    }
  },
})

const makeLog = (): DbCallLog => ({ inserts: [], updates: [], selects: 0 })

const makeRepo = (log: DbCallLog, rows: FakeRow[] = []) =>
  new ItemCommentsRepository(createFakeDb(log, rows) as never)

const commentRow = (over: Record<string, unknown> = {}): FakeRow => ({
  uuid: 'c1',
  shoppingListItemUuid: 'i1',
  userId: 'u1',
  authorName: 'Алексей',
  body: 'Взять свежее',
  serverRevision: null,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
  deletedAt: null,
  ...over,
})

beforeEach(() => {
  mockGetState.mockReturnValue({
    user: { uuid: 'u1', name: 'Алексей', email: 'a@b.ru' },
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// addComment
// ─────────────────────────────────────────────────────────────────────────────

describe('ItemCommentsRepository.addComment', () => {
  it('пишет доменную строку + outbox c entity_type shopping_list_item_comment', async () => {
    const log = makeLog()
    const repo = makeRepo(log)

    const comment = await repo.addComment('i1', 'Взять свежее')

    // Первый insert — доменная строка, второй — запись в sync_outbox.
    expect(log.inserts).toHaveLength(2)
    const domain = log.inserts[0]?.values as Record<string, unknown>
    expect(domain.shoppingListItemUuid).toBe('i1')
    expect(domain.authorName).toBe('Алексей')
    expect(domain.body).toBe('Взять свежее')
    expect(domain.uuid).toBe('00000000-0000-4000-8000-000000000000')
    expect(typeof domain.updatedAt).toBe('string')
    expect(typeof domain.createdAt).toBe('string')

    const outbox = log.inserts[1]?.values as Record<string, unknown>
    expect(outbox.entityType).toBe('shopping_list_item_comment')
    expect(outbox.operation).toBe('create')
    expect(outbox.entityUuid).toBe(domain.uuid)

    expect(comment.authorName).toBe('Алексей')
    expect(comment.body).toBe('Взять свежее')
  })

  it('payload outbox — snake_case c shopping_list_item_uuid/author_name/body', async () => {
    const log = makeLog()
    const repo = makeRepo(log)

    await repo.addComment('i1', 'Текст')

    const outbox = log.inserts[1]?.values as Record<string, unknown>
    const payload = JSON.parse(outbox.payload as string) as Record<string, unknown>
    expect(payload['shopping_list_item_uuid']).toBe('i1')
    expect(payload['author_name']).toBe('Алексей')
    expect(payload['body']).toBe('Текст')
    expect(Object.keys(payload)).not.toContain('shoppingListItemUuid')
    expect(Object.keys(payload)).not.toContain('authorName')
  })

  it('created_at проставляется ISO-строкой «сейчас» (для сортировки треда)', async () => {
    const log = makeLog()
    const repo = makeRepo(log)

    await repo.addComment('i1', 'Текст')

    const domain = log.inserts[0]?.values as Record<string, unknown>
    expect(() => new Date(domain.createdAt as string).toISOString()).not.toThrow()
  })

  it('userId нового комментария = uuid текущего пользователя', async () => {
    const log = makeLog()
    const repo = makeRepo(log)

    await repo.addComment('i1', 'Текст')

    const domain = log.inserts[0]?.values as Record<string, unknown>
    expect(domain.userId).toBe('u1')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// resolveAuthorName (фолбэки автора)
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveAuthorName', () => {
  it('имя пользователя, когда задано', () => {
    expect(resolveAuthorName()).toBe('Алексей')
  })

  it('фолбэк на email, когда имени нет', () => {
    mockGetState.mockReturnValue({ user: { uuid: 'u1', name: null, email: 'a@b.ru' } })
    expect(resolveAuthorName()).toBe('a@b.ru')
  })

  it('фолбэк «Вы» для гостя без профиля', () => {
    mockGetState.mockReturnValue({ user: null })
    expect(resolveAuthorName()).toBe('Вы')
  })

  it('пустое/пробельное имя трактуется как отсутствие', () => {
    mockGetState.mockReturnValue({ user: { uuid: 'u1', name: '   ', email: 'a@b.ru' } })
    expect(resolveAuthorName()).toBe('a@b.ru')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// listComments
// ─────────────────────────────────────────────────────────────────────────────

describe('ItemCommentsRepository.listComments', () => {
  it('возвращает доменные комментарии треда (конвертация строки)', async () => {
    const log = makeLog()
    const repo = makeRepo(log, [commentRow(), commentRow({ uuid: 'c2', body: 'Второй' })])

    const comments = await repo.listComments('i1')

    expect(comments).toHaveLength(2)
    expect(comments[0]?.uuid).toBe('c1')
    expect(comments[0]?.authorName).toBe('Алексей')
    expect(comments[1]?.body).toBe('Второй')
    expect(log.selects).toBe(1)
  })

  it('не пишет в outbox при чтении', async () => {
    const log = makeLog()
    const repo = makeRepo(log, [commentRow()])

    await repo.listComments('i1')

    expect(log.inserts).toHaveLength(0)
    expect(log.updates).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// deleteComment
// ─────────────────────────────────────────────────────────────────────────────

describe('ItemCommentsRepository.deleteComment', () => {
  it('ставит tombstone и пишет delete-запись в outbox', async () => {
    const log = makeLog()
    const repo = makeRepo(log, [commentRow()])

    const result = await repo.deleteComment('c1')

    expect(result).not.toBeNull()
    const setValues = log.updates[0]?.values as Record<string, unknown>
    expect(typeof setValues.deletedAt).toBe('string')
    expect(setValues.deletedAt).toBe(setValues.updatedAt)

    const outbox = log.inserts[0]?.values as Record<string, unknown>
    expect(outbox.entityType).toBe('shopping_list_item_comment')
    expect(outbox.operation).toBe('delete')
    expect(outbox.entityUuid).toBe('c1')
  })

  it('возвращает null и не пишет outbox, когда комментарий не найден', async () => {
    const log = makeLog()
    const repo = makeRepo(log, [])

    const result = await repo.deleteComment('missing')

    expect(result).toBeNull()
    expect(log.inserts).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// countsForItems
// ─────────────────────────────────────────────────────────────────────────────

describe('ItemCommentsRepository.countsForItems', () => {
  it('возвращает Map uuid пункта → количество комментариев', async () => {
    const log = makeLog()
    const repo = makeRepo(log, [
      { itemUuid: 'i1', total: 2 },
      { itemUuid: 'i2', total: 1 },
    ])

    const counts = await repo.countsForItems(['i1', 'i2', 'i3'])

    expect(counts.get('i1')).toBe(2)
    expect(counts.get('i2')).toBe(1)
    expect(counts.has('i3')).toBe(false)
  })

  it('пустой список пунктов → пустая Map без запроса к БД', async () => {
    const log = makeLog()
    const repo = makeRepo(log)

    const counts = await repo.countsForItems([])

    expect(counts.size).toBe(0)
    expect(log.selects).toBe(0)
  })
})
