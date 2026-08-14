import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { QueryKeys } from '@/constants/QueryKeys'
import type { TaskStatus } from '@/constants/taskStatus'
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

/** 'auto' = сброс ручного закрепления с пересчётом статуса из пунктов. */
interface SetListStatusVariables {
  uuid: string
  status: TaskStatus | 'auto'
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

  // Ручной статус задачи (закрепляется) / «Авто» (сброс + пересчёт из пунктов).
  const setListStatus = useMutation({
    mutationFn: ({ uuid, status }: SetListStatusVariables) =>
      status === 'auto'
        ? shoppingListsRepo.setListStatusAuto(uuid)
        : shoppingListsRepo.setListStatus(uuid, status),
    onSuccess: invalidate,
  })

  return {
    lists: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    createList,
    updateList,
    deleteList,
    setListStatus,
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

/**
 * Один сгруппированный запрос ближайших невыполненных дедлайнов для
 * списков-задач. Возвращает Map uuid→ISO-строка без N+1.
 */
export function useNearestDeadlines(): Map<string, string> {
  const { data } = useQuery<Map<string, string>>({
    queryKey: QueryKeys.lists.nearestDeadlines,
    queryFn: () => shoppingListsRepo.nearestDeadlines(),
    staleTime: 30_000,
  })
  return data ?? new Map()
}
