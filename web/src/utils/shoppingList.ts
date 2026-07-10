import type { ShoppingList, ShoppingListType } from '@/types/shoppingList'

/**
 * Список считается выполненным по явному флагу `is_completed` (решение
 * пользователя): чекбокс в таблице «Задачи и списки» переключает его,
 * вкладка «Выполненные» фильтрует по нему. Флаг НЕ зависит от отметок
 * пунктов (`checked_items_count`).
 */
export function isShoppingListCompleted(list: ShoppingList): boolean {
  return list.is_completed
}

/** Акцентный цвет списка по его типу: покупки (goods) — teal, задачи (tasks) — amber. */
export interface ShoppingListAccent {
  color: string
  soft: string
}

export function shoppingListAccent(type: ShoppingListType): ShoppingListAccent {
  if (type === 'tasks') {
    return { color: '#c98a2b', soft: '#f7ebd5' }
  }
  return { color: '#17897a', soft: '#d8ebe4' }
}
