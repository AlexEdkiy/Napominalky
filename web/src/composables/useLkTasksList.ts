import { computed, ref } from 'vue'

import { useShoppingLists } from '@/composables/useShoppingLists'
import type { ShoppingList } from '@/types/shoppingList'
import { isShoppingListCompleted, shoppingListProgress } from '@/utils/shoppingList'

/** Сколько списков запрашивать за раз в разделе «Задачи и списки». */
export const LK_TASKS_LISTS_PER_PAGE = 20

export type LkTasksSortBy = 'updatedAt' | 'title' | 'progress'
export type LkTasksFilterBy = 'all' | 'active' | 'completed'

function matchesFilter(list: ShoppingList, filterBy: LkTasksFilterBy): boolean {
  if (filterBy === 'active') {
    return !isShoppingListCompleted(list)
  }
  if (filterBy === 'completed') {
    return isShoppingListCompleted(list)
  }
  return true
}

function compareLists(a: ShoppingList, b: ShoppingList, sortBy: LkTasksSortBy): number {
  if (sortBy === 'title') {
    return a.title.localeCompare(b.title, 'ru')
  }
  if (sortBy === 'progress') {
    return shoppingListProgress(b) - shoppingListProgress(a)
  }
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
}

/**
 * Раздел «Задачи и списки»: загружает списки покупок (`useShoppingLists`) и
 * применяет клиентские поиск/сортировку/фильтр по реальным полям
 * (`title`, `updated_at`, `checked_items_count`/`items_count`) — сервер их
 * не поддерживает, поэтому фильтрация происходит на уже загруженной странице.
 */
export function useLkTasksList() {
  const { lists, meta, isLoading, error, load, loadMore, create, update, remove } = useShoppingLists()

  const searchQuery = ref('')
  const sortBy = ref<LkTasksSortBy>('updatedAt')
  const filterBy = ref<LkTasksFilterBy>('all')

  const filteredLists = computed<ShoppingList[]>(() => {
    const query = searchQuery.value.trim().toLowerCase()
    const filtered = lists.value.filter(
      (list) => (query === '' || list.title.toLowerCase().includes(query)) && matchesFilter(list, filterBy.value),
    )
    return [...filtered].sort((a, b) => compareLists(a, b, sortBy.value))
  })

  const hasMore = computed<boolean>(() => meta.value !== null && meta.value.current_page < meta.value.last_page)

  function initialLoad(): Promise<void> {
    return load({ per_page: LK_TASKS_LISTS_PER_PAGE })
  }

  return {
    lists,
    filteredLists,
    isLoading,
    error,
    hasMore,
    searchQuery,
    sortBy,
    filterBy,
    load: initialLoad,
    loadMore,
    create,
    update,
    remove,
  }
}
