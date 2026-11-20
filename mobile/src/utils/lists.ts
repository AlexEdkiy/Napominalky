import { t, getLanguage } from '@/i18n'
import type { ListType, ShoppingList } from '@/db/repositories/shoppingListsRepo'

/** Подпись слова готовности пункта в зависимости от типа задачи. */
export const doneWordByType = (type: ListType): string =>
  type === 'tasks' ? t("сделано") : t("куплено")

/**
 * Текстовый статус карточки задачи: «N пунктов · M сделано/куплено».
 * Слово зависит от типа: tasks → «сделано», goods → «куплено».
 */
export const listStatusLabel = (list: Pick<ShoppingList, 'type' | 'itemsCount' | 'checkedItemsCount'>): string => {
  if (list.itemsCount === 0) return t("Задача")
  if (getLanguage() === 'en' && list.itemsCount === 1) {
    return `1 item · ${list.checkedItemsCount} ${doneWordByType(list.type)}`
  }
  return t("{0} пунктов · {1} {2}", [list.itemsCount, list.checkedItemsCount, doneWordByType(list.type)])
}
