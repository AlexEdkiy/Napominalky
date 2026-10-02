import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { notesApi } from '@/api/notesApi'
import { fetchAllShoppingLists } from '@/api/fetchAllShoppingLists'
import { fetchListsDerivedDates } from '@/composables/useLkTasksTable'
import type { LkListDerivedDates } from '@/composables/useLkTasksTable'
import type { ShoppingList } from '@/types/shoppingList'
import { hasDeadlineToday } from '@/utils/lkToday'

/** Бейджи оболочки; при ошибке сроки неизвестны, а не «всё выполнено». */
export function useLkNavCounts(today: Ref<Date> = ref(new Date())) {
  const activeTasksCount = ref<number | null>(null)
  const notesCount = ref<number | null>(null)
  const lists = ref<ShoppingList[]>([])
  const dates = ref(new Map<string, LkListDerivedDates>())
  const datesReady = ref(false)
  let generation = 0
  const todayDeadlineCount = computed(() => datesReady.value
    ? lists.value.filter((list) => hasDeadlineToday(list, dates.value.get(list.uuid), today.value)).length
    : null)

  async function load(): Promise<void> {
    const current = ++generation
    try {
      const [allLists, notesResponse] = await Promise.all([
        fetchAllShoppingLists(), notesApi.fetchNotes({ per_page: 1 }),
      ])
      if (current !== generation) return
      activeTasksCount.value = allLists.reduce((sum, list) => sum + list.items_count - list.checked_items_count, 0)
      notesCount.value = notesResponse.meta.total
      const active = allLists.filter((list) => !list.is_completed)
      const derived = await fetchListsDerivedDates(active, new Map())
      if (current !== generation) return
      lists.value = active
      dates.value = derived
      datesReady.value = active.every((list) => derived.has(list.uuid))
    } catch {
      if (current === generation) datesReady.value = false
    }
  }
  return { activeTasksCount, notesCount, todayDeadlineCount, load }
}
