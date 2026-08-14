import { doneWordByType, listStatusLabel } from '../lists'
import type { ShoppingList } from '@/db/repositories/shoppingListsRepo'

const makeList = (overrides: Partial<ShoppingList> = {}): ShoppingList => ({
  uuid: 'list-1',
  userId: null,
  title: 'Продукты',
  type: 'goods',
  tags: null,
  status: 'new',
  statusIsManual: false,
  isCompleted: false,
  serverRevision: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
  itemsCount: 5,
  checkedItemsCount: 2,
  ...overrides,
})

describe('doneWordByType', () => {
  it('возвращает «сделано» для tasks', () => {
    expect(doneWordByType('tasks')).toBe('сделано')
  })

  it('возвращает «куплено» для goods', () => {
    expect(doneWordByType('goods')).toBe('куплено')
  })
})

describe('listStatusLabel', () => {
  it('goods: «N пунктов · M куплено»', () => {
    expect(listStatusLabel(makeList({ type: 'goods', itemsCount: 5, checkedItemsCount: 2 }))).toBe(
      '5 пунктов · 2 куплено',
    )
  })

  it('tasks: «N пунктов · M сделано»', () => {
    expect(
      listStatusLabel(makeList({ type: 'tasks', itemsCount: 4, checkedItemsCount: 1 })),
    ).toBe('4 пунктов · 1 сделано')
  })

  it('itemsCount=0 → «Задача»', () => {
    expect(listStatusLabel(makeList({ itemsCount: 0, checkedItemsCount: 0 }))).toBe('Задача')
  })
})
