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
    const { data } = await apiClient.get<PaginatedResponse<ShoppingList>>('/shopping-lists', {
      params: buildQueryParams(params),
    })
    return data
  },

  fetchList: async (uuid: string): Promise<ShoppingList> => {
    const { data } = await apiClient.get<ApiResponse<ShoppingList>>(`/shopping-lists/${uuid}`)
    return data.data
  },

  createList: async (payload: CreateShoppingListPayload): Promise<ShoppingList> => {
    const { data } = await apiClient.post<ApiResponse<ShoppingList>>('/shopping-lists', payload)
    return data.data
  },

  updateList: async (uuid: string, payload: UpdateShoppingListPayload): Promise<ShoppingList> => {
    const { data } = await apiClient.put<ApiResponse<ShoppingList>>(`/shopping-lists/${uuid}`, payload)
    return data.data
  },

  deleteList: async (uuid: string): Promise<void> => {
    await apiClient.delete(`/shopping-lists/${uuid}`)
  },

  fetchItems: async (listUuid: string): Promise<ShoppingListItem[]> => {
    const { data } = await apiClient.get<ApiResponse<ShoppingListItem[]>>(
      `/shopping-lists/${listUuid}/items`,
    )
    return data.data
  },

  addItem: async (
    listUuid: string,
    payload: CreateShoppingListItemPayload,
  ): Promise<ShoppingListItem> => {
    const { data } = await apiClient.post<ApiResponse<ShoppingListItem>>(
      `/shopping-lists/${listUuid}/items`,
      payload,
    )
    return data.data
  },

  updateItem: async (
    listUuid: string,
    itemUuid: string,
    payload: UpdateShoppingListItemPayload,
  ): Promise<ShoppingListItem> => {
    const { data } = await apiClient.put<ApiResponse<ShoppingListItem>>(
      `/shopping-lists/${listUuid}/items/${itemUuid}`,
      payload,
    )
    return data.data
  },

  deleteItem: async (listUuid: string, itemUuid: string): Promise<void> => {
    await apiClient.delete(`/shopping-lists/${listUuid}/items/${itemUuid}`)
  },

  checkItem: async (
    listUuid: string,
    itemUuid: string,
    isChecked: boolean,
  ): Promise<ShoppingListItem> => {
    const { data } = await apiClient.post<ApiResponse<ShoppingListItem>>(
      `/shopping-lists/${listUuid}/items/${itemUuid}/check`,
      { is_checked: isChecked },
    )
    return data.data
  },
}
