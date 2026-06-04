import { computed, ref } from 'vue'

import { shoppingListsApi } from '@/api/shoppingListsApi'
import type {
  CreateShoppingListItemPayload,
  ShoppingListItem,
  UpdateShoppingListItemPayload,
} from '@/types/shoppingList'

/**
 * Инкапсулирует реактивное состояние позиций конкретного списка покупок.
 * Принимает uuid списка как аргумент.
 */
export function useShoppingListItems(listUuid: string) {
  const items = ref<ShoppingListItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const totalCount = computed<number>(() => items.value.length)
  const checkedCount = computed<number>(
    () => items.value.filter((item) => item.is_checked).length,
  )

  function resolveError(e: unknown): void {
    error.value = e instanceof Error ? e.message : 'Не удалось выполнить операцию'
  }

  function replaceItem(updated: ShoppingListItem): void {
    const index = items.value.findIndex((item) => item.uuid === updated.uuid)
    if (index !== -1) {
      items.value.splice(index, 1, updated)
    }
  }

  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      items.value = await shoppingListsApi.fetchItems(listUuid)
    } catch (e) {
      resolveError(e)
    } finally {
      isLoading.value = false
    }
  }

  async function add(payload: CreateShoppingListItemPayload): Promise<ShoppingListItem | null> {
    error.value = null
    try {
      const item = await shoppingListsApi.addItem(listUuid, payload)
      items.value = [...items.value, item]
      return item
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  async function update(
    itemUuid: string,
    payload: UpdateShoppingListItemPayload,
  ): Promise<ShoppingListItem | null> {
    error.value = null
    try {
      const item = await shoppingListsApi.updateItem(listUuid, itemUuid, payload)
      replaceItem(item)
      return item
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  async function remove(itemUuid: string): Promise<boolean> {
    error.value = null
    try {
      await shoppingListsApi.deleteItem(listUuid, itemUuid)
      items.value = items.value.filter((item) => item.uuid !== itemUuid)
      return true
    } catch (e) {
      resolveError(e)
      return false
    }
  }

  async function check(itemUuid: string, isChecked: boolean): Promise<ShoppingListItem | null> {
    error.value = null
    try {
      const item = await shoppingListsApi.checkItem(listUuid, itemUuid, isChecked)
      replaceItem(item)
      return item
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  return {
    items,
    isLoading,
    error,
    totalCount,
    checkedCount,
    load,
    add,
    update,
    remove,
    check,
  }
}
