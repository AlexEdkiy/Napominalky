import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { QueryKeys } from '@/constants/QueryKeys'
import {
  shoppingListsRepo,
  type CreateListData,
  type ShoppingList,
  type UpdateListPatch,
} from '@/db/repositories/shoppingListsRepo'

interface UpdateListVariables {
  uuid: string
  patch: UpdateListPatch
}

/** TanStack Query поверх локального shoppingListsRepo (SQLite, local-first). */
export function useShoppingLists() {
  const queryClient = useQueryClient()
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: QueryKeys.lists.all })
  }

  const query = useQuery<ShoppingList[]>({
    queryKey: QueryKeys.lists.list({}),
    queryFn: () => shoppingListsRepo.listLists(),
  })

  const createList = useMutation({
    mutationFn: (data: CreateListData) => shoppingListsRepo.createList(data),
    onSuccess: invalidate,
  })

  const updateList = useMutation({
    mutationFn: ({ uuid, patch }: UpdateListVariables) =>
      shoppingListsRepo.updateList(uuid, patch),
    onSuccess: invalidate,
  })

  const deleteList = useMutation({
    mutationFn: (uuid: string) => shoppingListsRepo.deleteList(uuid),
    onSuccess: invalidate,
  })

  return {
    lists: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    createList,
    updateList,
    deleteList,
  }
}

/** Загрузка одного списка по uuid (название + прогресс) для детального экрана. */
export function useShoppingList(uuid: string) {
  return useQuery<ShoppingList | null>({
    queryKey: QueryKeys.lists.detail(uuid),
    queryFn: () => shoppingListsRepo.getListByUuid(uuid),
    enabled: uuid.length > 0,
  })
}
