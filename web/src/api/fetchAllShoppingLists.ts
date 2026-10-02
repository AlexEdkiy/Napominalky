import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { ShoppingList } from '@/types/shoppingList'

/** Даты фильтруются на клиенте: проверяем все страницы, а не только первые 100 списков. */
export async function fetchAllShoppingLists(): Promise<ShoppingList[]> {
  const lists = new Map<string, ShoppingList>()
  let page = 1
  while (true) {
    const response = await shoppingListsApi.fetchLists({ per_page: 100, ...(page > 1 ? { page } : {}) })
    for (const list of response.data) lists.set(list.uuid, list)
    if (page >= response.meta.last_page) return [...lists.values()]
    if (response.data.length === 0) throw new Error('Не удалось загрузить все списки. Повторите попытку.')
    page += 1
  }
}
