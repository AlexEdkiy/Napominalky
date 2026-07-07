import { ref } from 'vue'

import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { PaginationMeta } from '@/types/api'
import type {
  CreateShoppingListPayload,
  ShoppingList,
  ShoppingListParams,
  UpdateShoppingListPayload,
} from '@/types/shoppingList'

/**
 * Инкапсулирует реактивное состояние списков покупок и операции CRUD.
 * Без внешних query-библиотек — простое состояние на ref + методы.
 */
export function useShoppingLists() {
  const lists = ref<ShoppingList[]>([])
  const meta = ref<PaginationMeta | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function resolveError(e: unknown): void {
    error.value = e instanceof Error ? e.message : 'Не удалось выполнить операцию'
  }

  function replaceList(updated: ShoppingList): void {
    const index = lists.value.findIndex((list) => list.uuid === updated.uuid)
    if (index !== -1) {
      lists.value.splice(index, 1, updated)
    }
  }

  async function load(params?: ShoppingListParams): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await shoppingListsApi.fetchLists(params)
      lists.value = response.data
      meta.value = response.meta
    } catch (e) {
      resolveError(e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Дозагружает следующую страницу списков и добавляет её к уже загруженным
   * (в отличие от `load`, которая заменяет коллекцию). Не делает ничего,
   * если страниц больше нет или `load` ещё не вызывалась.
   */
  async function loadMore(): Promise<void> {
    if (meta.value === null || meta.value.current_page >= meta.value.last_page) {
      return
    }
    error.value = null
    try {
      const response = await shoppingListsApi.fetchLists({
        page: meta.value.current_page + 1,
        per_page: meta.value.per_page,
      })
      lists.value = [...lists.value, ...response.data]
      meta.value = response.meta
    } catch (e) {
      resolveError(e)
    }
  }

  async function create(payload: CreateShoppingListPayload): Promise<ShoppingList | null> {
    error.value = null
    try {
      const list = await shoppingListsApi.createList(payload)
      lists.value = [list, ...lists.value]
      return list
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  async function update(
    uuid: string,
    payload: UpdateShoppingListPayload,
  ): Promise<ShoppingList | null> {
    error.value = null
    try {
      const list = await shoppingListsApi.updateList(uuid, payload)
      replaceList(list)
      return list
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  async function remove(uuid: string): Promise<boolean> {
    error.value = null
    try {
      await shoppingListsApi.deleteList(uuid)
      lists.value = lists.value.filter((list) => list.uuid !== uuid)
      return true
    } catch (e) {
      resolveError(e)
      return false
    }
  }

  return { lists, meta, isLoading, error, load, loadMore, create, update, remove }
}
