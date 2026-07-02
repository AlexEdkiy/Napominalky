import type { ListType, ShoppingList } from '@/db/repositories/shoppingListsRepo'

/** Подпись слова готовности пункта в зависимости от типа задачи. */
export const doneWordByType = (type: ListType): 'сделано' | 'куплено' =>
  type === 'tasks' ? 'сделано' : 'куплено'

/**
 * Текстовый статус карточки задачи: «N пунктов · M сделано/куплено».
 * Слово зависит от типа: tasks → «сделано», goods → «куплено».
 */
export const listStatusLabel = (list: Pick<ShoppingList, 'type' | 'itemsCount' | 'checkedItemsCount'>): string => {
  if (list.itemsCount === 0) return 'Задача'
  return `${list.itemsCount} пунктов · ${list.checkedItemsCount} ${doneWordByType(list.type)}`
}
