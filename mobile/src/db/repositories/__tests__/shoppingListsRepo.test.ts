// Изолируем тест от нативного expo-sqlite: репозиторий принимает db явно.
jest.mock('../../client', () => ({ db: {} }))

import { ShoppingListsRepository } from '../shoppingListsRepo'

interface InsertCall {
  values: Record<string, unknown>
}

interface FakeRows {
  /** Полные строки (select() без проекции): findById/activeItemRows/listItems. */
  rows?: Record<string, unknown>[]
  /** Проекция select({...}): nextPosition (max) и listUserId. */
  projection?: Record<string, unknown>[]
}

/**
 * Фейк Drizzle-db. Различает select() (полные строки) и select(projection)
 * (агрегаты/поля) — repo использует обе формы. Поддерживает цепочки
 * where()/where().orderBy()/where().limit() и from().orderBy().
 */
const createFakeDb = (inserts: InsertCall[], data: FakeRows = {}) => {
  const rows = data.rows ?? []
  const projection = data.projection ?? []
  const buildChain = (result: Record<string, unknown>[]) => {
    const where = (_w: unknown) => {
      const chain = Promise.resolve(result) as Promise<
        Record<string, unknown>[]
      > & {
        orderBy: (o: unknown) => Promise<Record<string, unknown>[]>
        limit: (n: number) => Promise<Record<string, unknown>[]>
      }
      chain.orderBy = () => Promise.resolve(result)
      chain.limit = () => Promise.resolve(result)
      return chain
    }
    return { where, orderBy: () => Promise.resolve(result) }
  }

  return {
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
    // select() → полные строки; select(projection) → агрегаты/поля.
    select: (proj?: unknown) => ({
      from: () => buildChain(proj === undefined ? rows : projection),
    }),
  }
}

const itemRow = (over: Partial<Record<string, unknown>> = {}) => ({
  uuid: 'i1',
  shoppingListUuid: 'l1',
  userId: null,
  name: 'Хлеб',
  category: 'products',
  isChecked: 0,
  position: 0,
  serverRevision: null,
  createdAt: 't',
  updatedAt: 't',
  deletedAt: null,
  ...over,
})

const listRow = (over: Partial<Record<string, unknown>> = {}) => ({
  uuid: 'l1',
  userId: null,
  title: 'Продукты',
  serverRevision: null,
  createdAt: 't',
  updatedAt: 't',
  deletedAt: null,
  ...over,
})

describe('ShoppingListsRepository.createList', () => {
  it('создаёт список, пишет create в outbox, прогресс 0/0', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(createFakeDb(inserts) as never)

    const list = await repo.createList({ title: 'Продукты' })

    expect(inserts).toHaveLength(2)
    expect((inserts[0]?.values as Record<string, unknown>).title).toBe('Продукты')
    const outbox = inserts[1]?.values as Record<string, unknown>
    expect(outbox.entityType).toBe('shopping_list')
    expect(outbox.operation).toBe('create')
    expect(list.itemsCount).toBe(0)
    expect(list.checkedItemsCount).toBe(0)
  })
})

describe('ShoppingListsRepository.addItem', () => {
  it('хранит is_checked 0/1, наследует position (max+1) и user_id', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(
      // projection обслуживает и nextPosition (value), и listUserId (userId).
      createFakeDb(inserts, { projection: [{ value: 2, userId: 'owner' }] }) as never,
    )

    const item = await repo.addItem('l1', { name: 'Молоко', isChecked: true })

    const domain = inserts[0]?.values as Record<string, unknown>
    expect(domain.position).toBe(3)
    expect(domain.userId).toBe('owner')
    expect(domain.isChecked).toBe(1)
    expect(domain.category).toBe('other')

    const outbox = inserts[1]?.values as Record<string, unknown>
    expect(outbox.entityType).toBe('shopping_list_item')
    expect(item.isChecked).toBe(true)
  })

  it('position = 0, когда в списке ещё нет элементов (max = null)', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(
      createFakeDb(inserts, { projection: [{ value: null, userId: null }] }) as never,
    )

    await repo.addItem('l1', { name: 'Соль', category: 'products' })

    const domain = inserts[0]?.values as Record<string, unknown>
    expect(domain.position).toBe(0)
    expect(domain.category).toBe('products')
  })
})

describe('ShoppingListsRepository.checkItem', () => {
  it('обновляет is_checked и пишет update в outbox', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(createFakeDb(inserts) as never)

    const item = await repo.checkItem('i1', true)

    // update идёт через db.update().set() (не insert) → в inserts только outbox.
    expect(inserts).toHaveLength(1)
    const outbox = inserts[0]?.values as Record<string, unknown>
    expect(outbox.operation).toBe('update')
    expect(outbox.entityUuid).toBe('i1')
    // is_checked записан как 1 в set-values → returning отдаёт его, repo → bool.
    expect(item?.isChecked).toBe(true)
  })
})

describe('ShoppingListsRepository.deleteItem', () => {
  it('пишет tombstone (deleted_at) и delete-запись в outbox', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(createFakeDb(inserts) as never)

    await repo.deleteItem('i1')

    expect(inserts).toHaveLength(1)
    const outbox = inserts[0]?.values as Record<string, unknown>
    expect(outbox.operation).toBe('delete')
    expect(outbox.entityUuid).toBe('i1')
  })
})

describe('ShoppingListsRepository.deleteList', () => {
  it('tombstone списка и его активных элементов (каскад delete в outbox)', async () => {
    const inserts: InsertCall[] = []
    // activeItemRows вернёт один элемент → его softDelete + softDelete списка.
    const repo = new ShoppingListsRepository(
      createFakeDb(inserts, { rows: [itemRow()] }) as never,
    )

    await repo.deleteList('l1')

    const deletes = inserts.filter(
      (call) => (call.values as Record<string, unknown>).operation === 'delete',
    )
    expect(deletes).toHaveLength(2)
    const entities = deletes.map(
      (call) => (call.values as Record<string, unknown>).entityType,
    )
    expect(entities).toContain('shopping_list_item')
    expect(entities).toContain('shopping_list')
  })
})

describe('ShoppingListsRepository.listItems', () => {
  it('конвертирует 0/1 в booleans и category в union для строк', async () => {
    const repo = new ShoppingListsRepository(
      createFakeDb([], { rows: [itemRow({ isChecked: 1, category: 'pharmacy' })] }) as never,
    )

    const result = await repo.listItems('l1')

    expect(result).toHaveLength(1)
    expect(result[0]?.isChecked).toBe(true)
    expect(result[0]?.category).toBe('pharmacy')
  })
})

describe('ShoppingListsRepository.getListByUuid', () => {
  it('считает прогресс checked/total из активных элементов', async () => {
    // findById (полные строки) вернёт список; activeItemRows (полные строки)
    // вернёт те же rows — потому подаём СПИСОК как первую строку и элементы
    // отдельным расчётом. Проще: rows содержат элементы, а find(limit) тоже их
    // вернёт — поэтому проверяем listLists, где список и items различимы.
    const repo = new ShoppingListsRepository(
      createFakeDb([], { rows: [listRow()] }) as never,
    )

    const list = await repo.getListByUuid('l1')

    expect(list).not.toBeNull()
    expect(list?.title).toBe('Продукты')
    // activeItemRows получит listRow без isChecked → checked 0, total 1.
    expect(list?.checkedItemsCount).toBe(0)
    expect(list?.itemsCount).toBe(1)
  })
})

describe('ShoppingListsRepository.listLists', () => {
  it('возвращает активные списки с рассчитанным прогрессом', async () => {
    const repo = new ShoppingListsRepository(
      createFakeDb([], { rows: [listRow()] }) as never,
    )

    const lists = await repo.listLists()

    expect(lists).toHaveLength(1)
    expect(lists[0]?.title).toBe('Продукты')
    expect(lists[0]?.itemsCount).toBe(1)
    expect(lists[0]?.checkedItemsCount).toBe(0)
  })
})
