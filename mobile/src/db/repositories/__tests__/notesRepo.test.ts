// Изолируем тест от нативного expo-sqlite: репозиторий принимает db явно.
jest.mock('../../client', () => ({ db: {} }))

import { NotesRepository } from '../notesRepo'

interface InsertCall {
  values: Record<string, unknown>
}

interface SelectQuery {
  where: unknown
  order: unknown
}

/**
 * Фейк Drizzle-db: фиксирует insert-вызовы (доменная строка + outbox),
 * select-цепочку возвращает заранее заданные строки.
 */
const createFakeDb = (
  inserts: InsertCall[],
  selectRows: Record<string, unknown>[],
  queries: SelectQuery[],
) => ({
  insert: () => ({
    values: (values: Record<string, unknown>) => {
      inserts.push({ values })
      return { returning: async () => [values] }
    },
  }),
  update: () => ({
    set: (values: Record<string, unknown>) => ({
      where: () => ({ returning: async () => [{ uuid: 'u1', ...values }] }),
    }),
  }),
  select: () => ({
    from: () => ({
      where: (where: unknown) => ({
        orderBy: (order: unknown) => {
          queries.push({ where, order })
          return Promise.resolve(selectRows)
        },
      }),
    }),
  }),
})

describe('NotesRepository.createNote', () => {
  it('хранит booleans как 0/1, пишет create в outbox, отдаёт booleans', async () => {
    const inserts: InsertCall[] = []
    const fakeDb = createFakeDb(inserts, [], []) as never
    const repo = new NotesRepository(fakeDb)

    const note = await repo.createNote({ title: 'Заметка', isPinned: true })

    expect(inserts).toHaveLength(2)
    const domain = inserts[0]?.values as Record<string, unknown>
    expect(domain.isPinned).toBe(1)
    expect(domain.isArchived).toBe(0)
    expect(domain.body).toBeNull()

    const outbox = inserts[1]?.values as Record<string, unknown>
    expect(outbox.entityType).toBe('note')
    expect(outbox.operation).toBe('create')

    // Наружу отдаются booleans, а не 0/1.
    expect(note.isPinned).toBe(true)
    expect(note.isArchived).toBe(false)
  })
})

describe('NotesRepository.deleteNote', () => {
  it('пишет tombstone (deleted_at) и delete-запись в outbox', async () => {
    const inserts: InsertCall[] = []
    const fakeDb = createFakeDb(inserts, [], []) as never
    const repo = new NotesRepository(fakeDb)

    await repo.deleteNote('u1')

    expect(inserts).toHaveLength(1)
    const outbox = inserts[0]?.values as Record<string, unknown>
    expect(outbox.operation).toBe('delete')
    expect(outbox.entityUuid).toBe('u1')
  })
})

describe('NotesRepository.searchNotes', () => {
  it('конвертирует 0/1 в booleans для найденных строк', async () => {
    const rows = [
      {
        uuid: 'u1',
        userId: null,
        title: 'Хлеб',
        body: null,
        isPinned: 1,
        isArchived: 0,
        serverRevision: null,
        createdAt: 't',
        updatedAt: 't',
        deletedAt: null,
      },
    ]
    const queries: SelectQuery[] = []
    const fakeDb = createFakeDb([], rows, queries) as never
    const repo = new NotesRepository(fakeDb)

    const result = await repo.searchNotes('хле')

    expect(result).toHaveLength(1)
    expect(result[0]?.isPinned).toBe(true)
    expect(queries).toHaveLength(1)
  })
})
