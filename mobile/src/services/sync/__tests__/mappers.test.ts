import { mappers } from '../mappers'
import type { ServerShoppingList, ServerShoppingListItem } from '@/types/sync'

const baseList: ServerShoppingList = {
  uuid: 'l1',
  title: 'Test list',
  type: 'goods',
  tags: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  deleted_at: null,
}

const baseItem: ServerShoppingListItem = {
  uuid: 'i1',
  shopping_list_uuid: 'l1',
  name: 'Item',
  category: 'products',
  quantity: 1,
  deadline: null,
  is_checked: false,
  position: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  deleted_at: null,
}

describe('shoppingListMapper', () => {
  it('маппит тип goods из сервера', () => {
    const row = mappers.shopping_list.toRow(baseList)
    expect(row.type).toBe('goods')
  })

  it('маппит тип tasks из сервера', () => {
    const row = mappers.shopping_list.toRow({ ...baseList, type: 'tasks' })
    expect(row.type).toBe('tasks')
  })

  it('подставляет goods если type отсутствует (null/undefined)', () => {
    const serverWithoutType = { ...baseList, type: undefined } as unknown as ServerShoppingList
    const row = mappers.shopping_list.toRow(serverWithoutType)
    expect(row.type).toBe('goods')
  })

  it('маппит title, uuid, даты', () => {
    const row = mappers.shopping_list.toRow(baseList)
    expect(row.uuid).toBe('l1')
    expect(row.title).toBe('Test list')
    expect(row.createdAt).toBe('2024-01-01T00:00:00Z')
    expect(row.updatedAt).toBe('2024-01-02T00:00:00Z')
    expect(row.deletedAt).toBeNull()
  })
})

describe('shoppingListItemMapper', () => {
  it('маппит quantity из сервера', () => {
    const row = mappers.shopping_list_item.toRow({ ...baseItem, quantity: 5 })
    expect(row.quantity).toBe(5)
  })

  it('подставляет quantity=1 если отсутствует', () => {
    const serverWithout = { ...baseItem, quantity: undefined } as unknown as ServerShoppingListItem
    const row = mappers.shopping_list_item.toRow(serverWithout)
    expect(row.quantity).toBe(1)
  })

  it('маппит deadline из сервера', () => {
    const row = mappers.shopping_list_item.toRow({ ...baseItem, deadline: '2024-12-31' })
    expect(row.deadline).toBe('2024-12-31')
  })

  it('маппит deadline=null если отсутствует', () => {
    const row = mappers.shopping_list_item.toRow(baseItem)
    expect(row.deadline).toBeNull()
  })

  it('конвертирует is_checked true → 1', () => {
    const row = mappers.shopping_list_item.toRow({ ...baseItem, is_checked: true })
    expect(row.isChecked).toBe(1)
  })

  it('конвертирует is_checked false → 0', () => {
    const row = mappers.shopping_list_item.toRow(baseItem)
    expect(row.isChecked).toBe(0)
  })

  it('маппит shopping_list_uuid, name, category, position', () => {
    const row = mappers.shopping_list_item.toRow(baseItem)
    expect(row.shoppingListUuid).toBe('l1')
    expect(row.name).toBe('Item')
    expect(row.category).toBe('products')
    expect(row.position).toBe(0)
  })
})
