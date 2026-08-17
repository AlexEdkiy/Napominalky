import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { QueryKeys } from '@/constants/QueryKeys'
import {
  itemCommentsRepo,
  type ShoppingListItemComment,
} from '@/db/repositories/itemCommentsRepo'

/**
 * Тред комментариев одного пункта: чтение (ASC по created_at) + добавление и
 * удаление. Мутации инвалидируют и тред, и счётчики 💬 списка (бейдж в строке).
 */
export function useItemComments(itemUuid: string, listUuid: string) {
  const queryClient = useQueryClient()
  const invalidate = (): void => {
    void queryClient.invalidateQueries({
      queryKey: QueryKeys.lists.itemComments(itemUuid),
    })
    void queryClient.invalidateQueries({
      queryKey: QueryKeys.lists.itemCommentCounts(listUuid),
    })
  }

  const query = useQuery<ShoppingListItemComment[]>({
    queryKey: QueryKeys.lists.itemComments(itemUuid),
    queryFn: () => itemCommentsRepo.listComments(itemUuid),
    enabled: itemUuid.length > 0,
  })

  const addComment = useMutation({
    mutationFn: (body: string) => itemCommentsRepo.addComment(itemUuid, body),
    onSuccess: invalidate,
  })

  const deleteComment = useMutation({
    mutationFn: (uuid: string) => itemCommentsRepo.deleteComment(uuid),
    onSuccess: invalidate,
  })

  return {
    comments: query.data ?? [],
    isLoading: query.isLoading,
    addComment,
    deleteComment,
  }
}

/**
 * Счётчики комментариев пунктов списка (Map uuid пункта → количество) —
 * для иконки 💬 с числом в строке пункта. Один SQL на весь список.
 */
export function useItemCommentCounts(
  listUuid: string,
  itemUuids: readonly string[],
): Map<string, number> {
  const query = useQuery<Map<string, number>>({
    queryKey: [...QueryKeys.lists.itemCommentCounts(listUuid), ...itemUuids],
    queryFn: () => itemCommentsRepo.countsForItems(itemUuids),
    enabled: listUuid.length > 0,
  })
  return query.data ?? new Map()
}
