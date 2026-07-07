import { computed, ref } from 'vue'

import { useShoppingLists } from '@/composables/useShoppingLists'
import type { ShoppingList, ShoppingListType } from '@/types/shoppingList'
import { isShoppingListCompleted, shoppingListProgress } from '@/utils/shoppingList'

/** Сколько списков запрашивать за раз в разделе «Задачи и списки». */
export const LK_TASKS_LISTS_PER_PAGE = 20

export type LkTasksSortBy = 'updatedAt' | 'title' | 'progress'
export type LkTasksFilterBy = 'all' | 'active' | 'completed'
/** Фильтр по типу списка: все / только «Купить» (goods) / только «Сделать» (tasks). */
export type LkTasksTypeFilter = 'all' | ShoppingListType
/** Фильтр по тегу: `'all'` — без фильтра, иначе — точное имя тега. */
export type LkTasksTagFilter = 'all' | string

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
 * применяет клиентские поиск/сортировку/фильтр по реальным полям (`title`,
 * `updated_at`, `checked_items_count`/`items_count`, `type`, `tags`) —
 * сервер их не поддерживает, поэтому фильтрация происходит на уже
 * загруженной странице.
 */
export function useLkTasksList() {
  const { lists, meta, isLoading, error, load, loadMore, create, update, remove } = useShoppingLists()

  const searchQuery = ref('')
  const sortBy = ref<LkTasksSortBy>('updatedAt')
  const filterBy = ref<LkTasksFilterBy>('all')
  const typeFilter = ref<LkTasksTypeFilter>('all')
  const tagFilter = ref<LkTasksTagFilter>('all')

  /** Уникальные имена тегов, встречающиеся среди загруженных списков (для выпадающего фильтра). */
  const availableTags = computed<string[]>(() => {
    const unique = new Set<string>()
    for (const list of lists.value) {
      for (const tag of list.tags) {
        unique.add(tag)
      }
    }
    return [...unique].sort((a, b) => a.localeCompare(b, 'ru'))
  })

  const filteredLists = computed<ShoppingList[]>(() => {
    const query = searchQuery.value.trim().toLowerCase()
    const filtered = lists.value.filter((list) => {
      if (query !== '' && !list.title.toLowerCase().includes(query)) {
        return false
      }
      if (!matchesFilter(list, filterBy.value)) {
        return false
      }
      if (typeFilter.value !== 'all' && list.type !== typeFilter.value) {
        return false
      }
      if (tagFilter.value !== 'all' && !list.tags.includes(tagFilter.value)) {
        return false
      }
      return true
    })
    return [...filtered].sort((a, b) => compareLists(a, b, sortBy.value))
  })

  const hasMore = computed<boolean>(() => meta.value !== null && meta.value.current_page < meta.value.last_page)

  function initialLoad(): Promise<void> {
    return load({ per_page: LK_TASKS_LISTS_PER_PAGE })
  }

  return {
    lists,
    filteredLists,
    availableTags,
    isLoading,
    error,
    hasMore,
    searchQuery,
    sortBy,
    filterBy,
    typeFilter,
    tagFilter,
    load: initialLoad,
    loadMore,
    create,
    update,
    remove,
  }
}
