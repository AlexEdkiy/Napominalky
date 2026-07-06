import { ref } from 'vue'

import { notesApi } from '@/api/notesApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'

/**
 * Кол-во списков покупок, запрашиваемое для подсчёта бейджа «активных задач».
 * Публичного агрегирующего эндпоинта нет — считаем по доступной первой
 * странице списков (см. design-бриф: «используй доступные данные»).
 */
const NAV_COUNTS_LISTS_PER_PAGE = 100

/**
 * Лёгкие бейджи навигации ЛК: число активных (невыполненных) пунктов списков
 * покупок и число заметок (`meta.total`, точное независимо от пагинации).
 * Ошибки не выбрасывает — бейджи необязательны и не должны блокировать
 * рендер оболочки.
 */
export function useLkNavCounts() {
  const activeTasksCount = ref<number | null>(null)
  const notesCount = ref<number | null>(null)

  async function load(): Promise<void> {
    try {
      const [listsResponse, notesResponse] = await Promise.all([
        shoppingListsApi.fetchLists({ per_page: NAV_COUNTS_LISTS_PER_PAGE }),
        notesApi.fetchNotes({ per_page: 1 }),
      ])
      activeTasksCount.value = listsResponse.data.reduce(
        (sum, list) => sum + (list.items_count - list.checked_items_count),
        0,
      )
      notesCount.value = notesResponse.meta.total
    } catch {
      // Бейджи необязательны — тихо игнорируем сетевую ошибку.
    }
  }

  return { activeTasksCount, notesCount, load }
}
