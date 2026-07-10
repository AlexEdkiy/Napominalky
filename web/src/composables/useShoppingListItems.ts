import { computed, ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import { shoppingListsApi } from '@/api/shoppingListsApi'
import type {
  CreateShoppingListItemPayload,
  ShoppingListItem,
  UpdateShoppingListItemPayload,
} from '@/types/shoppingList'

/**
 * Инкапсулирует реактивное состояние позиций конкретного списка покупок.
 * Принимает uuid списка как `MaybeRefOrGetter` и резолвит его через
 * `toValue()` ВНУТРИ каждого метода — иначе при навигации между деталями
 * двух списков (компонент переиспользуется Vue) методы продолжили бы
 * работать со старым uuid, замкнутым при первом монтировании.
 */
export function useShoppingListItems(listUuid: MaybeRefOrGetter<string>) {
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
      items.value = await shoppingListsApi.fetchItems(toValue(listUuid))
    } catch (e) {
      resolveError(e)
    } finally {
      isLoading.value = false
    }
  }

  async function add(payload: CreateShoppingListItemPayload): Promise<ShoppingListItem | null> {
    error.value = null
    try {
      const item = await shoppingListsApi.addItem(toValue(listUuid), payload)
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
      const item = await shoppingListsApi.updateItem(toValue(listUuid), itemUuid, payload)
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
      await shoppingListsApi.deleteItem(toValue(listUuid), itemUuid)
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
      const item = await shoppingListsApi.checkItem(toValue(listUuid), itemUuid, isChecked)
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
