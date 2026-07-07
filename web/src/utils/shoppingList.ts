import type { ShoppingList } from '@/types/shoppingList'

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
 * пункты отмечены выполненными. `ShoppingList` не несёт признака «категории»
 * или «тега» (в отличие от макета) — этот статус выполнения используется
 * вместо выдуманного поля как единственный реально доступный признак для
 * фильтра/pill на карточке списка.
 */
export function isShoppingListCompleted(list: ShoppingList): boolean {
  return list.items_count > 0 && list.checked_items_count === list.items_count
}
