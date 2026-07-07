import type { ShoppingCategory } from '@/types/shoppingList'

/**
 * Цвет pill'а для категории пункта списка покупок (`category_label`).
 *
 * ВАЖНО (отклонение от макета, см. web-lk-phase2.md раздел B): в API у
 * `ShoppingListItem` нет отдельного поля «тег» — есть только `category`
 * (products/household/pharmacy/other). Категория используется как замена
 * тега: цвет назначен по палитре тегов из design-брифа (products ≈ «Покупки»
 * teal, household ≈ «Дом» olive, pharmacy ≈ «Здоровье» teal-green, other —
 * нейтральный lilac). Это назначение цвета, а не выдуманное поле данных —
 * сама категория приходит из API как есть.
 */
export interface LkCategoryColor {
  bg: string
  fg: string
}

export const SHOPPING_CATEGORY_COLORS: Record<ShoppingCategory, LkCategoryColor> = {
  products: { bg: '#d8ebe4', fg: '#17897a' },
  household: { bg: '#e6efd7', fg: '#6a8a37' },
  pharmacy: { bg: '#d7ecec', fg: '#2b8a8a' },
  other: { bg: '#e6e1f5', fg: '#7b6bb0' },
}
