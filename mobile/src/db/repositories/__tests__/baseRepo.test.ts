import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Изолируем тест от нативного expo-sqlite: baseRepo принимает db явно.
jest.mock('../../client', () => ({ db: {} }))

import { BaseRepository, type SyncTable } from '../baseRepo'

// Тестовая синхронизируемая таблица с обязательными sync-полями.
const notes = sqliteTable('notes', {
  uuid: text('uuid').primaryKey(),
  title: text('title').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
})

interface InsertCall {
  values: Record<string, unknown>
}

/** Минимальный фейк Drizzle-db: фиксирует insert-вызовы и возвращает строку. */
const createFakeDb = (inserts: InsertCall[]) => ({
  insert: () => ({
    values: (values: Record<string, unknown>) => {
      inserts.push({ values })
      return { returning: async () => [values] }
    },
  }),
})

describe('BaseRepository.insert', () => {
  it('генерирует uuid + updated_at и пишет create-запись в outbox', async () => {
    const inserts: InsertCall[] = []
    const fakeDb = createFakeDb(inserts) as never
    const repo = new BaseRepository(notes as unknown as SyncTable, 'note', fakeDb)

    const row = await repo.insert({ title: 'Купить хлеб' } as never)

    // Первый insert — доменная строка, второй — запись в sync_outbox.
    expect(inserts).toHaveLength(2)

    const domain = inserts[0]?.values as Record<string, unknown>
    expect(domain.uuid).toBe('00000000-0000-4000-8000-000000000000')
    expect(typeof domain.updatedAt).toBe('string')
    expect(domain.title).toBe('Купить хлеб')

    const outbox = inserts[1]?.values as Record<string, unknown>
    expect(outbox.entityType).toBe('note')
    expect(outbox.entityUuid).toBe(domain.uuid)
    expect(outbox.operation).toBe('create')
    expect(outbox.updatedAt).toBe(domain.updatedAt)
    expect(JSON.parse(outbox.payload as string)).toMatchObject({
      uuid: domain.uuid,
      title: 'Купить хлеб',
    })

    expect((row as { title: string }).title).toBe('Купить хлеб')
  })
})
