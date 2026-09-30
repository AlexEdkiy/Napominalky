import { returningRows } from '../../testing/returningRows'

// Изолируем тест от нативного expo-sqlite: репозиторий принимает db явно.
jest.mock('../../client', () => ({ db: {} }))

// expo-notifications мокается глобально в jest.setup.js

import { ShoppingListsRepository } from '../shoppingListsRepo'
import { shoppingLists } from '../../schema/shoppingLists'
import { shoppingListItems } from '../../schema/shoppingListItems'
import { syncOutbox } from '../../schema/syncOutbox'

type Row = Record<string, unknown>

interface FakeState {
  lists: Row[]
  items: Row[]
}

interface UpdateLog {
  table: 'lists' | 'items' | 'other'
  values: Row
}

interface OutboxLog {
  entityType: string
  operation: string
  payload: Row
}

/**
 * Табличный фейк Drizzle-db: различает таблицы по identity схем
 * (shoppingLists/shoppingListItems/syncOutbox). update применяет patch к
 * ПЕРВОЙ строке таблицы (сценарии одноцелевые), select() возвращает строки
 * таблицы, outbox-вставки складываются в отдельный журнал.
 */
const createFakeDb = (state: FakeState, updates: UpdateLog[], outbox: OutboxLog[]) => {
  const tableKind = (table: unknown): 'lists' | 'items' | 'other' => {
    if (table === shoppingLists) return 'lists'
    if (table === shoppingListItems) return 'items'
    return 'other'
  }
  const rowsOf = (table: unknown): Row[] =>
    tableKind(table) === 'lists' ? state.lists : state.items

  const chain = (result: Row[]) => {
    const where = (_w: unknown) => {
      const p = Promise.resolve(result) as Promise<Row[]> & {
        orderBy: (o: unknown) => Promise<Row[]>
        limit: (n: number) => Promise<Row[]>
      }
      p.orderBy = () => Promise.resolve(result)
      p.limit = () => Promise.resolve(result.slice(0, 1))
      return p
    }
    return { where, orderBy: () => Promise.resolve(result) }
  }

  return {
    transaction<T>(fn: (tx: unknown) => T): T { return fn(this) },
    insert: (table: unknown) => ({
      values: (values: Row) => {
        if (table === syncOutbox) {
          outbox.push({
            entityType: values.entityType as string,
            operation: values.operation as string,
            payload: JSON.parse(values.payload as string) as Row,
          })
        }
        return { run: () => undefined, returning: () => returningRows(() => [values]) }
      },
    }),
    update: (table: unknown) => ({
      set: (values: Row) => ({
        where: () => ({
          run: () => undefined,
          returning: () => returningRows(() => {
            const rows = rowsOf(table)
            const target = rows[0]
            if (target === undefined) return []
            Object.assign(target, values)
            updates.push({ table: tableKind(table), values })
            return [{ ...target }]
          }),
        }),
      }),
    }),
    select: (proj?: unknown) => ({
      from: (table: unknown) => chain(proj === undefined ? rowsOf(table) : []),
    }),
  }
}

const listRow = (over: Row = {}): Row => ({
  uuid: 'l1',
  userId: null,
  title: 'Дела',
  type: 'tasks',
  tags: null,
  status: 'new',
  statusIsManual: 0,
  isCompleted: 0,
  serverRevision: null,
  createdAt: 't',
  updatedAt: 't',
  deletedAt: null,
  ...over,
})

const itemRow = (over: Row = {}): Row => ({
  uuid: 'i1',
  shoppingListUuid: 'l1',
  userId: null,
  name: 'Пункт',
  category: 'other',
  quantity: 1,
  deadline: null,
  reminderAt: null,
  link: null,
  comment: null,
  tags: null,
  isChecked: 0,
  status: 'new',
  position: 0,
  notificationId: null,
  serverRevision: null,
  createdAt: 't',
  updatedAt: 't',
  deletedAt: null,
  ...over,
})

interface Setup {
  repo: ShoppingListsRepository
  state: FakeState
  updates: UpdateLog[]
  outbox: OutboxLog[]
}

const setup = (state: FakeState): Setup => {
  const updates: UpdateLog[] = []
  const outbox: OutboxLog[] = []
  const repo = new ShoppingListsRepository(createFakeDb(state, updates, outbox) as never)
  return { repo, state, updates, outbox }
}

describe('checkItem — инвариант status ⇔ is_checked', () => {
  it('checked=true → status=done + is_checked=1', async () => {
    const { repo, state } = setup({ lists: [listRow()], items: [itemRow()] })

    const item = await repo.checkItem('i1', true)

    expect(item?.isChecked).toBe(true)
    expect(item?.status).toBe('done')
    expect(state.items[0]?.status).toBe('done')
  })

  it('uncheck: done сбрасывается в new', async () => {
    const { repo } = setup({
      lists: [listRow({ status: 'done', isCompleted: 1 })],
      items: [itemRow({ status: 'done', isChecked: 1 })],
    })

    const item = await repo.checkItem('i1', false)

    expect(item?.status).toBe('new')
    expect(item?.isChecked).toBe(false)
  })

  it('uncheck: postponed сохраняется (не сбрасывается)', async () => {
    const { repo } = setup({
      lists: [listRow()],
      items: [itemRow({ status: 'postponed', isChecked: 1 })],
    })

    const item = await repo.checkItem('i1', false)
    expect(item?.status).toBe('postponed')
  })
})

describe('setItemStatus — явная смена статуса пункта', () => {
  it('done → is_checked=1; in_progress → is_checked=0', async () => {
    const first = setup({ lists: [listRow()], items: [itemRow()] })
    const done = await first.repo.setItemStatus('i1', 'done')
    expect(done?.isChecked).toBe(true)

    const second = setup({
      lists: [listRow()],
      items: [itemRow({ status: 'done', isChecked: 1 })],
    })
    const inProgress = await second.repo.setItemStatus('i1', 'in_progress')
    expect(inProgress?.isChecked).toBe(false)
    expect(inProgress?.status).toBe('in_progress')
  })

  it('пересчитывает статус задачи: пункт in_progress → задача in_progress', async () => {
    const { repo, state, updates } = setup({
      lists: [listRow()],
      items: [itemRow(), itemRow({ uuid: 'i2', status: 'done', isChecked: 1 })],
    })

    await repo.setItemStatus('i1', 'in_progress')

    expect(state.lists[0]?.status).toBe('in_progress')
    expect(state.lists[0]?.isCompleted).toBe(0)
    expect(updates.some((u) => u.table === 'lists')).toBe(true)
  })

  it('все пункты done → задача done + is_completed=1', async () => {
    const { repo, state } = setup({
      lists: [listRow()],
      items: [itemRow(), itemRow({ uuid: 'i2', status: 'done', isChecked: 1 })],
    })

    await repo.setItemStatus('i1', 'done')

    expect(state.lists[0]?.status).toBe('done')
    expect(state.lists[0]?.isCompleted).toBe(1)
  })

  it('НЕ пересчитывает задачу с закреплённым вручную статусом', async () => {
    const { repo, state, updates } = setup({
      lists: [listRow({ status: 'postponed', statusIsManual: 1 })],
      items: [itemRow()],
    })

    await repo.setItemStatus('i1', 'in_progress')

    expect(state.lists[0]?.status).toBe('postponed')
    expect(updates.some((u) => u.table === 'lists')).toBe(false)
  })

  it('НЕ пересчитывает статус для goods-списка', async () => {
    const { repo, updates } = setup({
      lists: [listRow({ type: 'goods' })],
      items: [itemRow()],
    })

    await repo.checkItem('i1', true)

    expect(updates.some((u) => u.table === 'lists')).toBe(false)
  })
})

describe('setListStatus / setListStatusAuto — ручное закрепление и «Авто»', () => {
  it('ручной статус закрепляется: statusIsManual=1, isCompleted по isDone', async () => {
    const { repo, state } = setup({ lists: [listRow()], items: [] })

    const list = await repo.setListStatus('l1', 'done')

    expect(list?.status).toBe('done')
    expect(list?.statusIsManual).toBe(true)
    expect(list?.isCompleted).toBe(true)
    expect(state.lists[0]?.statusIsManual).toBe(1)
    expect(state.lists[0]?.isCompleted).toBe(1)
  })

  it('не-done ручной статус: isCompleted=0', async () => {
    const { repo } = setup({
      lists: [listRow({ status: 'done', isCompleted: 1 })],
      items: [],
    })

    const list = await repo.setListStatus('l1', 'postponed')

    expect(list?.status).toBe('postponed')
    expect(list?.isCompleted).toBe(false)
    expect(list?.statusIsManual).toBe(true)
  })

  it('«Авто» сбрасывает закрепление и пересчитывает из пунктов', async () => {
    const { repo } = setup({
      lists: [listRow({ status: 'postponed', statusIsManual: 1 })],
      items: [itemRow({ status: 'in_progress' })],
    })

    const list = await repo.setListStatusAuto('l1')

    expect(list?.status).toBe('in_progress')
    expect(list?.statusIsManual).toBe(false)
  })

  it('«Авто» при пустом списке пунктов → new', async () => {
    const { repo } = setup({
      lists: [listRow({ status: 'done', statusIsManual: 1, isCompleted: 1 })],
      items: [],
    })

    const list = await repo.setListStatusAuto('l1')

    expect(list?.status).toBe('new')
    expect(list?.isCompleted).toBe(false)
  })
})

describe('push-payload (outbox) содержит новые поля', () => {
  it('setListStatus пишет в outbox status/status_is_manual/is_completed (snake_case)', async () => {
    const { repo, outbox } = setup({ lists: [listRow()], items: [] })

    await repo.setListStatus('l1', 'in_progress')

    const entry = outbox.find((o) => o.entityType === 'shopping_list')
    expect(entry).toBeDefined()
    expect(entry?.operation).toBe('update')
    expect(entry?.payload.status).toBe('in_progress')
    expect(entry?.payload.status_is_manual).toBe(1)
    expect(entry?.payload.is_completed).toBe(0)
  })

  it('checkItem пишет в outbox пункт со status и is_checked', async () => {
    const { repo, outbox } = setup({ lists: [listRow()], items: [itemRow()] })

    await repo.checkItem('i1', true)

    const entry = outbox.find((o) => o.entityType === 'shopping_list_item')
    expect(entry?.payload.status).toBe('done')
    expect(entry?.payload.is_checked).toBe(1)
  })

  it('пересчёт статуса задачи также уходит в outbox (shopping_list update)', async () => {
    const { repo, outbox } = setup({ lists: [listRow()], items: [itemRow()] })

    await repo.setItemStatus('i1', 'in_progress')

    const entry = outbox.find((o) => o.entityType === 'shopping_list')
    expect(entry?.payload.status).toBe('in_progress')
  })
})
