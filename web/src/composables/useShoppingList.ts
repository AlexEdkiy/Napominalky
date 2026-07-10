import { ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { ShoppingList } from '@/types/shoppingList'

/**
 * Метаданные одного списка покупок (заголовок, прогресс) — используется
 * страницей деталей списка (`ListDetailView`) отдельно от его пунктов
 * (`useShoppingListItems`), чтобы показать название в шапке и хлебных
 * крошках без лишнего похода за всей коллекцией списков.
 *
 * `listUuid` принимается как `MaybeRefOrGetter` и резолвится через
 * `toValue()` ВНУТРИ каждого метода: при навигации lk-list-detail →
 * lk-list-detail (другой uuid) Vue переиспользует компонент, setup не
 * выполняется заново — методы должны читать АКТУАЛЬНЫЙ uuid маршрута,
 * а не значение, замкнутое при первом монтировании.
 */
export function useShoppingList(listUuid: MaybeRefOrGetter<string>) {
  const list = ref<ShoppingList | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      list.value = await shoppingListsApi.fetchList(toValue(listUuid))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить список'
    } finally {
      isLoading.value = false
    }
  }

  async function rename(title: string): Promise<boolean> {
    try {
      list.value = await shoppingListsApi.updateList(toValue(listUuid), { title })
      return true
    } catch {
      return false
    }
  }

  return { list, isLoading, error, load, rename }
}
