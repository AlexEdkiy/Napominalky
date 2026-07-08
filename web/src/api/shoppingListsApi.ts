import { apiClient } from '@/api/client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  CreateShoppingListItemPayload,
  CreateShoppingListPayload,
  ShoppingList,
  ShoppingListItem,
  ShoppingListParams,
  UpdateShoppingListItemPayload,
  UpdateShoppingListPayload,
} from '@/types/shoppingList'
import { parseTags } from '@/utils/tags'

/**
 * Форма ответа сервера «на проводе»: `tags` — непрозрачная JSON-строка
 * (или уже массив/`null`) до нормализации через `parseTags`. См. пометку в
 * `types/shoppingList.ts`.
 */
type ShoppingListWire = Omit<ShoppingList, 'tags'> & { tags: unknown }
type ShoppingListItemWire = Omit<ShoppingListItem, 'tags'> & { tags: unknown }

function normalizeList(wire: ShoppingListWire): ShoppingList {
  return { ...wire, tags: parseTags(wire.tags) }
}

function normalizeItem(wire: ShoppingListItemWire): ShoppingListItem {
  return { ...wire, tags: parseTags(wire.tags) }
}

/**
 * Сериализует `tags: string[]` в непрозрачную JSON-строку перед отправкой на
 * сервер (симметрично `parseTags` при чтении) — бэкенд хранит теги списка в
 * TEXT-колонке. Поле опускается, если `tags` не передан.
 */
function serializeTagsPayload<T extends { tags?: string[] }>(
  payload: T,
): Omit<T, 'tags'> & { tags?: string } {
  const { tags, ...rest } = payload
  if (tags === undefined) {
    return rest
  }
  return { ...rest, tags: JSON.stringify(tags) }
}

function buildQueryParams(params?: ShoppingListParams): Record<string, number> {
  const query: Record<string, number> = {}
  if (params?.page !== undefined) {
    query.page = params.page
  }
  if (params?.per_page !== undefined) {
    query.per_page = params.per_page
  }
  return query
}

export const shoppingListsApi = {
  fetchLists: async (params?: ShoppingListParams): Promise<PaginatedResponse<ShoppingList>> => {
    const { data } = await apiClient.get<PaginatedResponse<ShoppingListWire>>('/shopping-lists', {
      params: buildQueryParams(params),
    })
    return { ...data, data: data.data.map(normalizeList) }
  },

  fetchList: async (uuid: string): Promise<ShoppingList> => {
    const { data } = await apiClient.get<ApiResponse<ShoppingListWire>>(`/shopping-lists/${uuid}`)
    return normalizeList(data.data)
  },

  createList: async (payload: CreateShoppingListPayload): Promise<ShoppingList> => {
    const { data } = await apiClient.post<ApiResponse<ShoppingListWire>>(
      '/shopping-lists',
      serializeTagsPayload(payload),
    )
    return normalizeList(data.data)
  },

  updateList: async (uuid: string, payload: UpdateShoppingListPayload): Promise<ShoppingList> => {
    const { data } = await apiClient.put<ApiResponse<ShoppingListWire>>(
      `/shopping-lists/${uuid}`,
      serializeTagsPayload(payload),
    )
    return normalizeList(data.data)
  },

  deleteList: async (uuid: string): Promise<void> => {
    await apiClient.delete(`/shopping-lists/${uuid}`)
  },

  fetchItems: async (listUuid: string): Promise<ShoppingListItem[]> => {
    const { data } = await apiClient.get<ApiResponse<ShoppingListItemWire[]>>(
      `/shopping-lists/${listUuid}/items`,
    )
    return data.data.map(normalizeItem)
  },

  addItem: async (
    listUuid: string,
    payload: CreateShoppingListItemPayload,
  ): Promise<ShoppingListItem> => {
    const { data } = await apiClient.post<ApiResponse<ShoppingListItemWire>>(
      `/shopping-lists/${listUuid}/items`,
      payload,
    )
    return normalizeItem(data.data)
  },

  updateItem: async (
    listUuid: string,
    itemUuid: string,
    payload: UpdateShoppingListItemPayload,
  ): Promise<ShoppingListItem> => {
    const { data } = await apiClient.put<ApiResponse<ShoppingListItemWire>>(
      `/shopping-lists/${listUuid}/items/${itemUuid}`,
      payload,
    )
    return normalizeItem(data.data)
  },

  deleteItem: async (listUuid: string, itemUuid: string): Promise<void> => {
    await apiClient.delete(`/shopping-lists/${listUuid}/items/${itemUuid}`)
  },

  checkItem: async (
    listUuid: string,
    itemUuid: string,
    isChecked: boolean,
  ): Promise<ShoppingListItem> => {
    const { data } = await apiClient.post<ApiResponse<ShoppingListItemWire>>(
      `/shopping-lists/${listUuid}/items/${itemUuid}/check`,
      { is_checked: isChecked },
    )
    return normalizeItem(data.data)
  },
}
