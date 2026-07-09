import type { ShoppingList, ShoppingListType } from '@/types/shoppingList'

/**
 * Доля выполненных пунктов списка (0..1). 0 для пустого списка.
 */
export function shoppingListProgress(list: ShoppingList): number {
  if (list.items_count <= 0) {
    return 0
  }
  return list.checked_items_count / list.items_count
}

/**
 * Прогресс списка в процентах (0..100), округлённый до целого.
 */
export function shoppingListProgressPercent(list: ShoppingList): number {
  return Math.round(shoppingListProgress(list) * 100)
}

/**
 * Список считается завершённым, если в нём есть хотя бы один пункт и все
 * пункты отмечены выполненными. Используется для фильтра «завершённые» и
 * статус-pill на карточке списка (независимо от реальных `type`/`tags`,
 * которые отображаются отдельными pill'ами — см. `LkShoppingListCard.vue`).
 */
export function isShoppingListCompleted(list: ShoppingList): boolean {
  return list.items_count > 0 && list.checked_items_count === list.items_count
}

/** Статус списка: «новый» (нет выполненных пунктов), «в работе», «завершён». */
export type ShoppingListStatus = 'new' | 'active' | 'done'

/**
 * Статус списка по факту выполнения пунктов:
 * - `done` — есть хотя бы один пункт, и все они отмечены выполненными;
 * - `new` — ни один пункт не отмечен (в том числе пустой список без пунктов);
 * - `active` — часть пунктов выполнена, но не все.
 */
export function shoppingListStatus(list: ShoppingList): ShoppingListStatus {
  if (isShoppingListCompleted(list)) {
    return 'done'
  }
  if (list.checked_items_count === 0) {
    return 'new'
  }
  return 'active'
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
