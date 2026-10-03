import { isLkDateToday } from '@/composables/useLkTasksTable'
import type { LkListDerivedDates } from '@/composables/useLkTasksTable'
import type { ShoppingList } from '@/types/shoppingList'

/** Любой активный пункт на сегодня учитывается, даже если общий срок уже просрочен. */
export function hasDeadlineToday(list: ShoppingList, dates: LkListDerivedDates | undefined, today: Date): boolean {
  if (list.is_completed) return false
  const parent = list.type === 'tasks' && list.deadline !== undefined ? list.deadline : null
  const deadlines = dates?.activeDeadlines ?? [dates?.deadline ?? null]
  return isLkDateToday(parent, today) || deadlines.some((value) => isLkDateToday(value, today))
}
