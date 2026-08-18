// Изолируем тест от нативного expo-sqlite: репозиторий принимает db явно.
jest.mock('../../client', () => ({ db: {} }))

// expo-notifications мокается глобально в jest.setup.js

// parseTags / serializeTags экспортируются из репозитория


import { ShoppingListsRepository, parseTags, serializeTags } from '../shoppingListsRepo'

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
  quantity: 1,
  deadline: null,
  reminderAt: null,
  link: null,
  comment: null,
  tags: null,
  isChecked: 0,
  position: 0,
  notificationId: null,
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
  type: 'goods',
  serverRevision: null,
  createdAt: 't',
  updatedAt: 't',
  deletedAt: null,
  ...over,
})

describe('ShoppingListsRepository.createList', () => {
  it('создаёт список с type=goods по умолчанию, пишет create в outbox, прогресс 0/0', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(createFakeDb(inserts) as never)

    const list = await repo.createList({ title: 'Продукты' })

    expect(inserts).toHaveLength(2)
    const domain = inserts[0]?.values as Record<string, unknown>
    expect(domain.title).toBe('Продукты')
    expect(domain.type).toBe('goods')
    const outbox = inserts[1]?.values as Record<string, unknown>
    expect(outbox.entityType).toBe('shopping_list')
    expect(outbox.operation).toBe('create')
    expect(list.itemsCount).toBe(0)
    expect(list.checkedItemsCount).toBe(0)
  })

  it('создаёт список с type=tasks при явной передаче', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(createFakeDb(inserts) as never)

    await repo.createList({ title: 'Задачи', type: 'tasks' })

    const domain = inserts[0]?.values as Record<string, unknown>
    expect(domain.type).toBe('tasks')
  })
})

describe('ShoppingListsRepository.addItem', () => {
  it('хранит is_checked 0/1, quantity, deadline; наследует position (max+1) и user_id', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(
      createFakeDb(inserts, { projection: [{ value: 2, userId: 'owner' }] }) as never,
    )

    const item = await repo.addItem('l1', {
      name: 'Молоко',
      isChecked: true,
      quantity: 3,
      deadline: '2024-12-31',
    })

    const domain = inserts[0]?.values as Record<string, unknown>
    expect(domain.position).toBe(3)
    expect(domain.userId).toBe('owner')
    expect(domain.isChecked).toBe(1)
    expect(domain.category).toBe('other')
    expect(domain.quantity).toBe(3)
    expect(domain.deadline).toBe('2024-12-31')

    const outbox = inserts[1]?.values as Record<string, unknown>
    expect(outbox.entityType).toBe('shopping_list_item')
    expect(item.isChecked).toBe(true)
    expect(item.quantity).toBe(3)
    expect(item.deadline).toBe('2024-12-31')
  })

  it('position = 0, quantity = 1, deadline = null по умолчанию', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(
      createFakeDb(inserts, { projection: [{ value: null, userId: null }] }) as never,
    )

    await repo.addItem('l1', { name: 'Соль', category: 'products' })

    const domain = inserts[0]?.values as Record<string, unknown>
    expect(domain.position).toBe(0)
    expect(domain.category).toBe('products')
    expect(domain.quantity).toBe(1)
    expect(domain.deadline).toBeNull()
  })
})

describe('ShoppingListsRepository.updateItem', () => {
  it('обновляет quantity и deadline', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(createFakeDb(inserts) as never)

    const item = await repo.updateItem('i1', { quantity: 5, deadline: '2025-01-15' })

    expect(inserts).toHaveLength(1)
    const outbox = inserts[0]?.values as Record<string, unknown>
    expect(outbox.operation).toBe('update')
    // item вернул данные из fake update (isChecked=undefined → bool(0)=false)
    expect(item?.quantity).toBe(5)
    expect(item?.deadline).toBe('2025-01-15')
  })

  it('обновляет name (редактирование названия) и пишет update с name в outbox', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(createFakeDb(inserts) as never)

    const item = await repo.updateItem('i1', { name: 'Новое название' })

    expect(item?.name).toBe('Новое название')
    expect(inserts).toHaveLength(1)
    const outbox = inserts[0]?.values as Record<string, unknown>
    expect(outbox.operation).toBe('update')
    expect(outbox.entityType).toBe('shopping_list_item')
    expect(outbox.entityUuid).toBe('i1')
    // payload — полная строка в snake_case: новое имя уедет на сервер
    const payload = JSON.parse(outbox.payload as string) as Record<string, unknown>
    expect(payload.name).toBe('Новое название')
  })
})

describe('ShoppingListsRepository.checkItem', () => {
  it('обновляет is_checked и пишет update в outbox', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(createFakeDb(inserts) as never)

    const item = await repo.checkItem('i1', true)

    expect(inserts).toHaveLength(1)
    const outbox = inserts[0]?.values as Record<string, unknown>
    expect(outbox.operation).toBe('update')
    expect(outbox.entityUuid).toBe('i1')
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
  it('конвертирует 0/1 в booleans, маппит quantity и deadline', async () => {
    const repo = new ShoppingListsRepository(
      createFakeDb([], {
        rows: [itemRow({ isChecked: 1, category: 'pharmacy', quantity: 2, deadline: '2024-06-01' })],
      }) as never,
    )

    const result = await repo.listItems('l1')

    expect(result).toHaveLength(1)
    expect(result[0]?.isChecked).toBe(true)
    expect(result[0]?.category).toBe('pharmacy')
    expect(result[0]?.quantity).toBe(2)
    expect(result[0]?.deadline).toBe('2024-06-01')
  })
})

describe('ShoppingListsRepository.getListByUuid', () => {
  it('возвращает тип списка и считает прогресс checked/total', async () => {
    const repo = new ShoppingListsRepository(
      createFakeDb([], { rows: [listRow({ type: 'tasks' })] }) as never,
    )

    const list = await repo.getListByUuid('l1')

    expect(list).not.toBeNull()
    expect(list?.title).toBe('Продукты')
    expect(list?.type).toBe('tasks')
    expect(list?.checkedItemsCount).toBe(0)
    expect(list?.itemsCount).toBe(1)
  })
})

describe('ShoppingListsRepository.listLists', () => {
  it('возвращает активные списки с типом и рассчитанным прогрессом', async () => {
    const repo = new ShoppingListsRepository(
      createFakeDb([], { rows: [listRow()] }) as never,
    )

    const lists = await repo.listLists()

    expect(lists).toHaveLength(1)
    expect(lists[0]?.title).toBe('Продукты')
    expect(lists[0]?.type).toBe('goods')
    expect(lists[0]?.itemsCount).toBe(1)
    expect(lists[0]?.checkedItemsCount).toBe(0)
  })
})

// ---- Уведомления пунктов (notificationId) ------------------------------------

import * as Notifications from 'expo-notifications'

const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock
const futureIso = (): string => new Date(Date.now() + 60_000).toISOString()
const pastIso = (): string => new Date(Date.now() - 60_000).toISOString()

/**
 * Расширенный fakeDb для тестов уведомлений: update возвращает строку из rows
 * (чтобы toItem получал полный контекст reminderAt/notificationId).
 */
const createFakeDbNotif = (inserts: InsertCall[], rows: Record<string, unknown>[] = []) => ({
  insert: () => ({
    values: (values: Record<string, unknown>) => {
      inserts.push({ values })
      return { returning: async () => [{ ...itemRow(), ...values }] }
    },
  }),
  update: () => ({
    set: (values: Record<string, unknown>) => ({
      where: () => ({ returning: async () => [{ ...rows[0], ...values }] }),
    }),
  }),
  select: (proj?: unknown) => ({
    from: () => ({
      where: (_w: unknown) => {
        const result = proj === undefined ? rows : [{ value: null, userId: null }]
        const chain = Promise.resolve(result) as Promise<Record<string, unknown>[]> & {
          orderBy: () => Promise<Record<string, unknown>[]>
          limit: () => Promise<Record<string, unknown>[]>
        }
        chain.orderBy = () => Promise.resolve(result)
        chain.limit = () => Promise.resolve(result)
        return chain
      },
    }),
  }),
})

describe('ShoppingListsRepository.addItem — уведомление при reminderAt в будущем', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('scheduleNotificationAsync вызывается; data.type=list_item, listUuid корректен', async () => {
    const inserts: InsertCall[] = []
    mockSchedule.mockResolvedValueOnce('notif-item-1')
    const repo = new ShoppingListsRepository(
      createFakeDbNotif(inserts, [itemRow()]) as never,
    )

    const item = await repo.addItem('l1', {
      name: 'Молоко',
      reminderAt: futureIso(),
    })

    expect(mockSchedule).toHaveBeenCalledTimes(1)
    const arg = mockSchedule.mock.calls[0]?.[0]
    expect(arg.content.data.type).toBe('list_item')
    expect(arg.content.data.listUuid).toBe('l1')
    expect(item.notificationId).toBe('notif-item-1')
  })

  it('прошедшая reminderAt → scheduleNotificationAsync не вызывается', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(
      createFakeDbNotif(inserts, [itemRow()]) as never,
    )

    const item = await repo.addItem('l1', { name: 'Соль', reminderAt: pastIso() })

    expect(mockSchedule).not.toHaveBeenCalled()
    expect(item.notificationId).toBeNull()
  })

  it('reminderAt = null → уведомление не планируется', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(
      createFakeDbNotif(inserts, [itemRow()]) as never,
    )

    const item = await repo.addItem('l1', { name: 'Хлеб', reminderAt: null })

    expect(mockSchedule).not.toHaveBeenCalled()
    expect(item.notificationId).toBeNull()
  })
})

describe('ShoppingListsRepository.updateItem — перепланирование при смене reminderAt', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('новая будущая reminderAt → reschedule (cancel+schedule)', async () => {
    const inserts: InsertCall[] = []
    mockSchedule.mockResolvedValueOnce('notif-new')
    const row = itemRow({ notificationId: 'notif-old', reminderAt: futureIso() })
    const repo = new ShoppingListsRepository(
      createFakeDbNotif(inserts, [row]) as never,
    )

    const item = await repo.updateItem('i1', { reminderAt: futureIso() })

    expect(mockCancel).toHaveBeenCalledWith('notif-old')
    expect(mockSchedule).toHaveBeenCalled()
    expect(item?.notificationId).toBe('notif-new')
  })

  it('reminderAt → null: cancel, notificationId = null', async () => {
    const inserts: InsertCall[] = []
    const row = itemRow({ notificationId: 'notif-old' })
    const repo = new ShoppingListsRepository(
      createFakeDbNotif(inserts, [row]) as never,
    )

    const item = await repo.updateItem('i1', { reminderAt: null })

    expect(mockCancel).toHaveBeenCalledWith('notif-old')
    expect(mockSchedule).not.toHaveBeenCalled()
    expect(item?.notificationId).toBeNull()
  })

  it('patch без reminderAt → уведомление не трогается', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(
      createFakeDbNotif(inserts, [itemRow()]) as never,
    )

    await repo.updateItem('i1', { name: 'Сыр' })

    expect(mockSchedule).not.toHaveBeenCalled()
    expect(mockCancel).not.toHaveBeenCalled()
  })
})

describe('ShoppingListsRepository.checkItem — управление уведомлением', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('checked=true: cancelReminder вызывается, notificationId → null', async () => {
    const inserts: InsertCall[] = []
    const row = itemRow({ notificationId: 'notif-1', reminderAt: futureIso() })
    const repo = new ShoppingListsRepository(
      createFakeDbNotif(inserts, [row]) as never,
    )

    const item = await repo.checkItem('i1', true)

    expect(mockCancel).toHaveBeenCalledWith('notif-1')
    expect(item?.isChecked).toBe(true)
    expect(item?.notificationId).toBeNull()
  })

  it('checked=false с будущей reminderAt → reschedule', async () => {
    const inserts: InsertCall[] = []
    mockSchedule.mockResolvedValueOnce('notif-rescheduled')
    const row = itemRow({ reminderAt: futureIso(), notificationId: null })
    const repo = new ShoppingListsRepository(
      createFakeDbNotif(inserts, [row]) as never,
    )

    const item = await repo.checkItem('i1', false)

    expect(mockSchedule).toHaveBeenCalled()
    expect(item?.notificationId).toBe('notif-rescheduled')
  })

  it('checked=false без reminderAt → уведомление не планируется', async () => {
    const inserts: InsertCall[] = []
    const row = itemRow({ reminderAt: null, notificationId: null })
    const repo = new ShoppingListsRepository(
      createFakeDbNotif(inserts, [row]) as never,
    )

    const item = await repo.checkItem('i1', false)

    expect(mockSchedule).not.toHaveBeenCalled()
    expect(item?.notificationId).toBeNull()
  })
})

describe('ShoppingListsRepository.deleteItem — отмена уведомления', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('deleteItem вызывает cancelReminder по notificationId', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(
      createFakeDbNotif(inserts, [itemRow({ notificationId: 'notif-del' })]) as never,
    )

    await repo.deleteItem('i1')

    expect(mockCancel).toHaveBeenCalledWith('notif-del')
    const outbox = inserts[0]?.values as Record<string, unknown>
    expect(outbox.operation).toBe('delete')
  })

  it('deleteItem без уведомления — не падает', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(
      createFakeDbNotif(inserts, [itemRow({ notificationId: null })]) as never,
    )

    await expect(repo.deleteItem('i1')).resolves.not.toThrow()
  })
})

// ---- rescheduleAllPendingItems (переустановка расписания при старте) -------

describe('ShoppingListsRepository.rescheduleAllPendingItems', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('переустанавливает уведомление для будущего reminderAt, отменяя старый notification_id', async () => {
    mockSchedule.mockResolvedValueOnce('notif-new')
    const row = itemRow({ reminderAt: futureIso(), notificationId: 'notif-old' })
    const repo = new ShoppingListsRepository(createFakeDbNotif([], [row]) as never)

    const count = await repo.rescheduleAllPendingItems()

    expect(mockCancel).toHaveBeenCalledWith('notif-old')
    expect(mockSchedule).toHaveBeenCalledTimes(1)
    expect(count).toBe(1)
  })

  it('не трогает пункты без reminderAt', async () => {
    const row = itemRow({ reminderAt: null })
    const repo = new ShoppingListsRepository(createFakeDbNotif([], [row]) as never)

    const count = await repo.rescheduleAllPendingItems()

    expect(mockSchedule).not.toHaveBeenCalled()
    expect(count).toBe(0)
  })

  it('не трогает пункты с прошедшим reminderAt', async () => {
    const row = itemRow({ reminderAt: pastIso() })
    const repo = new ShoppingListsRepository(createFakeDbNotif([], [row]) as never)

    const count = await repo.rescheduleAllPendingItems()

    expect(mockSchedule).not.toHaveBeenCalled()
    expect(count).toBe(0)
  })
})

// ---- ShoppingListsRepository.setItemNotificationId --------------------------

describe('ShoppingListsRepository.setItemNotificationId', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('пишет notification_id напрямую без записи в outbox', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(
      createFakeDbNotif(inserts, [itemRow()]) as never,
    )

    const item = await repo.setItemNotificationId('i1', 'notif-123')

    expect(item?.notificationId).toBe('notif-123')
    expect(inserts).toHaveLength(0)
  })
})

// ---- parseTags / serializeTags -----------------------------------------------

describe('parseTags', () => {
  it('null → пустой массив', () => {
    expect(parseTags(null)).toEqual([])
  })

  it('валидный JSON-массив тегов', () => {
    expect(parseTags('["обувь","одежда"]')).toEqual(['обувь', 'одежда'])
  })

  it('пустой JSON-массив', () => {
    expect(parseTags('[]')).toEqual([])
  })

  it('невалидный JSON → пустой массив', () => {
    expect(parseTags('not-json')).toEqual([])
  })

  it('JSON не-массив → пустой массив', () => {
    expect(parseTags('{"key":"val"}')).toEqual([])
  })
})

describe('serializeTags', () => {
  it('пустой массив → null', () => {
    expect(serializeTags([])).toBeNull()
  })

  it('массив тегов → JSON-строка', () => {
    expect(serializeTags(['обувь', 'одежда'])).toBe('["обувь","одежда"]')
  })

  it('один тег', () => {
    expect(serializeTags(['акция'])).toBe('["акция"]')
  })
})

// ---- Маппинг новых полей в toItem ------------------------------------------

describe('ShoppingListsRepository.listItems — маппинг мета-полей', () => {
  it('маппит reminderAt, link, comment, tags из строки БД', async () => {
    const repo = new ShoppingListsRepository(
      createFakeDb([], {
        rows: [itemRow({
          reminderAt: '2026-07-01T18:00:00.000Z',
          link: 'https://example.com',
          comment: 'Не забыть',
          tags: '["обувь"]',
        })],
      }) as never,
    )

    const result = await repo.listItems('l1')

    expect(result[0]?.reminderAt).toBe('2026-07-01T18:00:00.000Z')
    expect(result[0]?.link).toBe('https://example.com')
    expect(result[0]?.comment).toBe('Не забыть')
    expect(result[0]?.tags).toBe('["обувь"]')
  })

  it('null-поля → null в доменном объекте', async () => {
    const repo = new ShoppingListsRepository(
      createFakeDb([], { rows: [itemRow()] }) as never,
    )

    const result = await repo.listItems('l1')

    expect(result[0]?.reminderAt).toBeNull()
    expect(result[0]?.link).toBeNull()
    expect(result[0]?.comment).toBeNull()
    expect(result[0]?.tags).toBeNull()
  })
})

// ---- addItem сохраняет мета-поля ------------------------------------------

describe('ShoppingListsRepository.addItem — мета-поля', () => {
  it('сохраняет reminderAt, link, comment, tags при создании', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(
      createFakeDb(inserts, { projection: [{ value: null, userId: null }] }) as never,
    )

    await repo.addItem('l1', {
      name: 'Кроссовки',
      reminderAt: '2026-07-01T18:00:00.000Z',
      link: 'https://shop.ru',
      comment: 'Размер 42',
      tags: '["обувь"]',
    })

    const domain = inserts[0]?.values as Record<string, unknown>
    expect(domain.reminderAt).toBe('2026-07-01T18:00:00.000Z')
    expect(domain.link).toBe('https://shop.ru')
    expect(domain.comment).toBe('Размер 42')
    expect(domain.tags).toBe('["обувь"]')
  })

  it('по умолчанию все мета-поля null', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(
      createFakeDb(inserts, { projection: [{ value: null, userId: null }] }) as never,
    )

    await repo.addItem('l1', { name: 'Хлеб' })

    const domain = inserts[0]?.values as Record<string, unknown>
    expect(domain.reminderAt).toBeNull()
    expect(domain.link).toBeNull()
    expect(domain.comment).toBeNull()
    expect(domain.tags).toBeNull()
  })
})

// ---- updateItem принимает мета-патч ----------------------------------------

describe('ShoppingListsRepository.updateItem — мета-патч', () => {
  it('передаёт reminderAt/link/comment/tags в update', async () => {
    const inserts: InsertCall[] = []
    const repo = new ShoppingListsRepository(createFakeDb(inserts) as never)

    await repo.updateItem('i1', {
      reminderAt: '2026-08-01T10:00:00.000Z',
      link: 'https://new.ru',
      comment: 'Обновлено',
      tags: '["новый"]',
    })

    // outbox insert
    const outbox = inserts[0]?.values as Record<string, unknown>
    expect(outbox.operation).toBe('update')
  })
})
