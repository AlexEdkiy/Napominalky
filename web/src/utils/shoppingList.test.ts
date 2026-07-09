import { describe, expect, it } from 'vitest'

import type { ShoppingList } from '@/types/shoppingList'
import { isShoppingListCompleted, shoppingListAccent, shoppingListStatus } from '@/utils/shoppingList'

function makeList(overrides: Partial<ShoppingList>): ShoppingList {
  return {
    uuid: 'l-1',
    title: 'Продукты',
    type: 'goods',
    tags: [],
    items_count: 4,
    checked_items_count: 0,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

describe('shoppingListStatus', () => {
  it('returns "new" when no items are checked', () => {
    expect(shoppingListStatus(makeList({ items_count: 4, checked_items_count: 0 }))).toBe('new')
  })

  it('returns "new" for an empty list without any items', () => {
    expect(shoppingListStatus(makeList({ items_count: 0, checked_items_count: 0 }))).toBe('new')
  })

  it('returns "active" when some but not all items are checked', () => {
    expect(shoppingListStatus(makeList({ items_count: 4, checked_items_count: 2 }))).toBe('active')
  })

  it('returns "done" when every item is checked', () => {
    expect(shoppingListStatus(makeList({ items_count: 4, checked_items_count: 4 }))).toBe('done')
  })
})

describe('isShoppingListCompleted', () => {
  it('agrees with shoppingListStatus === "done"', () => {
    const done = makeList({ items_count: 3, checked_items_count: 3 })
    const active = makeList({ items_count: 3, checked_items_count: 1 })
    const empty = makeList({ items_count: 0, checked_items_count: 0 })

    expect(isShoppingListCompleted(done)).toBe(true)
    expect(isShoppingListCompleted(active)).toBe(false)
    expect(isShoppingListCompleted(empty)).toBe(false)
  })
})

describe('shoppingListAccent', () => {
  it('returns the teal accent for goods lists', () => {
    expect(shoppingListAccent('goods')).toEqual({ color: '#17897a', soft: '#d8ebe4' })
  })

  it('returns the amber accent for tasks lists', () => {
    expect(shoppingListAccent('tasks')).toEqual({ color: '#c98a2b', soft: '#f7ebd5' })
  })
})
