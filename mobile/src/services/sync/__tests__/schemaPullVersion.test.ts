// Изолируем тест от нативного expo-sqlite: функции syncMeta принимают db явно.
jest.mock('@/db/client', () => ({ db: {} }))

import {
  CURRENT_SCHEMA_PULL_VERSION,
  LAST_PULLED_REVISION,
  SCHEMA_PULL_VERSION,
  ensureSchemaPullVersion,
} from '../syncMeta'

/**
 * Фейк key-value хранилища sync_meta поверх Map: select читает store,
 * insert().values().onConflictDoUpdate() пишет (upsert), фиксируя ключи.
 */
const createFakeMetaDb = (initial: Record<string, string> = {}) => {
  const store = new Map<string, string>(Object.entries(initial))
  const writes: Array<{ key: string; value: string }> = []
  let selectedKey = ''

  const db = {
    select: () => ({
      from: () => ({
        where: (cond: { key: string }) => {
          selectedKey = cond.key
          return {
            limit: async () => {
              const value = store.get(selectedKey)
              return value === undefined ? [] : [{ value }]
            },
          }
        },
      }),
    }),
    insert: () => ({
      values: (row: { key: string; value: string }) => ({
        onConflictDoUpdate: async () => {
          store.set(row.key, row.value)
          writes.push({ key: row.key, value: row.value })
        },
      }),
    }),
  }
  return { db: db as never, store, writes }
}

// eq(syncMeta.key, key) замокан: where() получает { key } и фейк читает Map.
jest.mock('drizzle-orm', () => ({
  ...jest.requireActual('drizzle-orm'),
  eq: (_col: unknown, value: string) => ({ key: value }),
}))

describe('ensureSchemaPullVersion — одноразовый сброс pull-курсора при апдейте схемы', () => {
  it('первый запуск после апдейта: сбрасывает курсор в 0 и фиксирует версию', async () => {
    const { db, store } = createFakeMetaDb({ [LAST_PULLED_REVISION]: '777' })

    const didReset = await ensureSchemaPullVersion(db)

    expect(didReset).toBe(true)
    expect(store.get(LAST_PULLED_REVISION)).toBe('0')
    expect(store.get(SCHEMA_PULL_VERSION)).toBe(String(CURRENT_SCHEMA_PULL_VERSION))
  })

  it('повторный вызов — no-op (версия уже актуальна, курсор не трогается)', async () => {
    const { db, store, writes } = createFakeMetaDb({
      [LAST_PULLED_REVISION]: '42',
      [SCHEMA_PULL_VERSION]: String(CURRENT_SCHEMA_PULL_VERSION),
    })

    const didReset = await ensureSchemaPullVersion(db)

    expect(didReset).toBe(false)
    expect(store.get(LAST_PULLED_REVISION)).toBe('42')
    expect(writes).toHaveLength(0)
  })

  it('устаревшая сохранённая версия (< текущей) → сброс и повышение версии', async () => {
    const { db, store } = createFakeMetaDb({
      [LAST_PULLED_REVISION]: '100',
      [SCHEMA_PULL_VERSION]: '5',
    })

    const didReset = await ensureSchemaPullVersion(db)

    expect(didReset).toBe(true)
    expect(store.get(LAST_PULLED_REVISION)).toBe('0')
    expect(store.get(SCHEMA_PULL_VERSION)).toBe(String(CURRENT_SCHEMA_PULL_VERSION))
  })

  it('мусорное значение версии трактуется как 0 → сброс выполняется', async () => {
    const { db, store } = createFakeMetaDb({ [SCHEMA_PULL_VERSION]: 'bogus' })

    const didReset = await ensureSchemaPullVersion(db)

    expect(didReset).toBe(true)
    expect(store.get(LAST_PULLED_REVISION)).toBe('0')
  })

  it('переход 11→12: пользователь после апдейта комментариев сбрасывает курсор ещё раз', async () => {
    // Регресс 0010: статусы требуют повторного полного pull даже у тех, кто
    // уже прошёл сброс версии 11 (комментарии).
    const { db, store } = createFakeMetaDb({
      [LAST_PULLED_REVISION]: '500',
      [SCHEMA_PULL_VERSION]: '11',
    })

    const didReset = await ensureSchemaPullVersion(db)

    expect(didReset).toBe(true)
    expect(store.get(LAST_PULLED_REVISION)).toBe('0')
    expect(store.get(SCHEMA_PULL_VERSION)).toBe('12')
  })

  it('свежая установка («перескочила» 11): курсор и так 0 — лишнего pull нет', async () => {
    // Версии в sync_meta нет вовсе → фиксация текущей версии; курсор остаётся
    // 0 (полный pull первого запуска и есть штатное поведение, не лишний).
    const { db, store } = createFakeMetaDb()

    const didReset = await ensureSchemaPullVersion(db)

    expect(didReset).toBe(true)
    expect(store.get(LAST_PULLED_REVISION)).toBe('0')
    expect(store.get(SCHEMA_PULL_VERSION)).toBe(String(CURRENT_SCHEMA_PULL_VERSION))

    // Повторный запуск на той же версии — no-op (сброс одноразовый).
    expect(await ensureSchemaPullVersion(db)).toBe(false)
  })

  it('идемпотентность: два вызова подряд — второй ничего не пишет', async () => {
    const { db, writes } = createFakeMetaDb({ [LAST_PULLED_REVISION]: '9' })

    await ensureSchemaPullVersion(db)
    const writesAfterFirst = writes.length
    await ensureSchemaPullVersion(db)

    expect(writes.length).toBe(writesAfterFirst)
  })
})
