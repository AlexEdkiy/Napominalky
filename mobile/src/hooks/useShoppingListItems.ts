import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { QueryKeys } from '@/constants/QueryKeys'
import {
  shoppingListsRepo,
  type CreateItemData,
  type ShoppingListItem,
  type UpdateItemPatch,
} from '@/db/repositories/shoppingListsRepo'

interface UpdateItemVariables {
  uuid: string
  patch: UpdateItemPatch
}

interface CheckItemVariables {
  uuid: string
  checked: boolean
}

/**
 * TanStack Query поверх элементов списка покупок: инвалидирует и кеш элементов,
 * и кеш списков (прогресс checked/total меняется при любой мутации элемента).
 */
export function useShoppingListItems(listUuid: string) {
  const queryClient = useQueryClient()
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: QueryKeys.lists.items(listUuid) })
    void queryClient.invalidateQueries({ queryKey: QueryKeys.lists.all })
  }

  const query = useQuery<ShoppingListItem[]>({
    queryKey: QueryKeys.lists.items(listUuid),
    queryFn: () => shoppingListsRepo.listItems(listUuid),
    enabled: listUuid.length > 0,
  })

  const addItem = useMutation({
    mutationFn: (data: CreateItemData) => shoppingListsRepo.addItem(listUuid, data),
    onSuccess: invalidate,
  })

  const updateItem = useMutation({
    mutationFn: ({ uuid, patch }: UpdateItemVariables) =>
      shoppingListsRepo.updateItem(uuid, patch),
    onSuccess: invalidate,
  })

  const deleteItem = useMutation({
    mutationFn: (uuid: string) => shoppingListsRepo.deleteItem(uuid),
    onSuccess: invalidate,
  })

  const checkItem = useMutation({
    mutationFn: ({ uuid, checked }: CheckItemVariables) =>
      shoppingListsRepo.checkItem(uuid, checked),
    onSuccess: invalidate,
  })

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    addItem,
    updateItem,
    deleteItem,
    checkItem,
  }
}
