import { describe, expect, it } from 'vitest'

import type { ShoppingList } from '@/types/shoppingList'
import { isShoppingListCompleted, shoppingListAccent } from '@/utils/shoppingList'

function makeList(overrides: Partial<ShoppingList>): ShoppingList {
  return {
    uuid: 'l-1',
    title: 'Продукты',
    type: 'goods',
    tags: [],
    items_count: 4,
    checked_items_count: 0,
    is_completed: false,
    status: 'new',
    status_label: 'Новая',
    status_is_manual: false,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

describe('isShoppingListCompleted', () => {
  it('follows the explicit is_completed flag, not the checked items counters', () => {
    // Флаг важнее счётчиков: все пункты куплены, но список не завершён.
    expect(
      isShoppingListCompleted(makeList({ items_count: 3, checked_items_count: 3, is_completed: false })),
    ).toBe(false)

    // И наоборот: пункты не отмечены, но список завершён вручную.
    expect(
      isShoppingListCompleted(makeList({ items_count: 3, checked_items_count: 0, is_completed: true })),
    ).toBe(true)
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
