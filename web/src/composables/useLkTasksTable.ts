import { computed, ref } from 'vue'

import { shoppingListsApi } from '@/api/shoppingListsApi'
import { useShoppingLists } from '@/composables/useShoppingLists'
import type { ShoppingList, ShoppingListType } from '@/types/shoppingList'
import { isShoppingListCompleted } from '@/utils/shoppingList'

/**
 * Сколько списков запрашивать за раз в таблице «Задачи и списки»
 * (максимум, разрешённый валидацией API: per_page max:100).
 */
export const LK_TASKS_TABLE_PER_PAGE = 100

/** Вкладка тулбара: Все / Активные / Выполненные (по флагу `is_completed`). */
export type LkTasksTab = 'all' | 'active' | 'completed'

/** Быстрый фильтр тулбара по типу списка: Все / Покупки (goods) / Задачи (tasks). */
export type LkTasksTypeFilter = 'all' | ShoppingListType

/** Сортируемые колонки таблицы. */
export type LkTasksSortKey = 'title' | 'tags' | 'date' | 'reminder'

/**
 * Производные даты списка для колонок ДАТА / НАПОМИНАНИЕ.
 *
 * ВРЕМЕННОЕ РЕШЕНИЕ (по решению пользователя): у списка нет собственных
 * полей даты/напоминания на бэкенде, поэтому значения выводятся из
 * `deadline`/`reminder_at` ПУНКТОВ списка (только чтение) — ближайшие
 * к текущему моменту, см. `nearestIso`.
 */
export interface LkListDerivedDates {
  deadline: string | null
  reminderAt: string | null
}

/**
 * «Ближайшее» значение среди дат: минимальное из будущих (включая сегодня).
 * Прошедшие значения (просроченные дедлайны, уже сработавшие напоминания)
 * игнорируются — если будущих нет, возвращается `null`.
 */
export function nearestIso(values: (string | null)[], now: Date): string | null {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  let bestFuture: { time: number; iso: string } | null = null
  for (const iso of values) {
    if (iso === null) {
      continue
    }
    const time = new Date(iso).getTime()
    if (Number.isNaN(time) || time < startOfToday) {
      continue
    }
    if (bestFuture === null || time < bestFuture.time) {
      bestFuture = { time, iso }
    }
  }
  return bestFuture?.iso ?? null
}

/** Метка колонки ДАТА: «Сегодня» / «Завтра» / «15 июля»; пустая строка для null. */
export function lkTableDateLabel(iso: string | null, now: Date): string {
  if (iso === null) {
    return ''
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const startOfDay = (value: Date): number =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const diffDays = Math.round((startOfDay(date) - startOfDay(now)) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) {
    return 'Сегодня'
  }
  if (diffDays === 1) {
    return 'Завтра'
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

/** Метка колонки НАПОМИНАНИЕ: локальное время «HH:MM»; пустая строка для null. */
export function lkTableTimeLabel(iso: string | null): string {
  if (iso === null) {
    return ''
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function matchesTab(list: ShoppingList, tab: LkTasksTab): boolean {
  if (tab === 'active') {
    return !isShoppingListCompleted(list)
  }
  if (tab === 'completed') {
    return isShoppingListCompleted(list)
  }
  return true
}

/** Второе измерение фильтра: тип списка. Комбинируется со статус-вкладкой по AND. */
function matchesType(list: ShoppingList, filter: LkTasksTypeFilter): boolean {
  return filter === 'all' || list.type === filter
}

/** Время для сортировки по производной дате; NaN — «нет значения». */
function sortTime(iso: string | null | undefined): number {
  return iso === null || iso === undefined ? Number.NaN : new Date(iso).getTime()
}

/**
 * Плоская таблица «Задачи и списки»: загрузка списков (`useShoppingLists`),
 * вкладки Все/Активные/Выполненные по флагу `is_completed`, клиентская
 * сортировка по колонкам (повторный клик — реверс, пустые значения всегда
 * в конце) и ленивое вычисление производных дат пунктов (см.
 * `LkListDerivedDates`) — не блокирует рендер строк.
 */
export function useLkTasksTable() {
  const { lists, meta, isLoading, error, load, loadMore, update, remove } = useShoppingLists()

  const tab = ref<LkTasksTab>('all')
  const typeFilter = ref<LkTasksTypeFilter>('all')
  const sortKey = ref<LkTasksSortKey | null>(null)
  const sortAsc = ref(true)
  const derivedDates = ref<Map<string, LkListDerivedDates>>(new Map())

  function toggleSort(key: LkTasksSortKey): void {
    if (sortKey.value === key) {
      sortAsc.value = !sortAsc.value
      return
    }
    sortKey.value = key
    sortAsc.value = true
  }

  function derivedFor(uuid: string): LkListDerivedDates | undefined {
    return derivedDates.value.get(uuid)
  }

  /**
   * Компаратор по активной колонке. Пустые значения (без тегов/дат) — всегда
   * в конец, независимо от направления сортировки.
   */
  function compare(a: ShoppingList, b: ShoppingList): number {
    const key = sortKey.value
    if (key === null) {
      return 0
    }
    const direction = sortAsc.value ? 1 : -1
    if (key === 'title') {
      return a.title.localeCompare(b.title, 'ru') * direction
    }
    if (key === 'tags') {
      const tagA = a.tags[0] ?? null
      const tagB = b.tags[0] ?? null
      if (tagA === null || tagB === null) {
        return tagA === tagB ? 0 : tagA === null ? 1 : -1
      }
      return tagA.localeCompare(tagB, 'ru') * direction
    }
    const field = key === 'date' ? 'deadline' : 'reminderAt'
    const timeA = sortTime(derivedFor(a.uuid)?.[field])
    const timeB = sortTime(derivedFor(b.uuid)?.[field])
    if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
      return Number.isNaN(timeA) === Number.isNaN(timeB) ? 0 : Number.isNaN(timeA) ? 1 : -1
    }
    return (timeA - timeB) * direction
  }

  const visibleLists = computed<ShoppingList[]>(() => {
    const filtered = lists.value.filter(
      (list) => matchesTab(list, tab.value) && matchesType(list, typeFilter.value),
    )
    return sortKey.value === null ? filtered : [...filtered].sort((a, b) => compare(a, b))
  })

  const hasMore = computed<boolean>(
    () => meta.value !== null && meta.value.current_page < meta.value.last_page,
  )

  /**
   * Ленивая подгрузка пунктов всех списков параллельно (как в `useLkCalendar`)
   * и вычисление ближайших `deadline`/`reminder_at` на список. Ошибки
   * игнорируются: колонки Дата/Напоминание — второстепенный источник, при
   * сбое строка просто показывает «—».
   */
  async function loadDerivedDates(): Promise<void> {
    const now = new Date()
    const targets = lists.value.filter((list) => !derivedDates.value.has(list.uuid))
    const entries = await Promise.all(
      targets.map(async (list): Promise<[string, LkListDerivedDates] | null> => {
        try {
          const items = await shoppingListsApi.fetchItems(list.uuid)
          return [
            list.uuid,
            {
              deadline: nearestIso(items.map((item) => item.deadline), now),
              reminderAt: nearestIso(items.map((item) => item.reminder_at), now),
            },
          ]
        } catch {
          return null
        }
      }),
    )
    const next = new Map(derivedDates.value)
    for (const entry of entries) {
      if (entry !== null) {
        next.set(entry[0], entry[1])
      }
    }
    derivedDates.value = next
  }

  /** Полная перезагрузка таблицы: списки — блокирующе, производные даты — фоном. */
  async function reload(): Promise<void> {
    derivedDates.value = new Map()
    await load({ per_page: LK_TASKS_TABLE_PER_PAGE })
    void loadDerivedDates()
  }

  async function loadNextPage(): Promise<void> {
    await loadMore()
    void loadDerivedDates()
  }

  /** Чекбокс строки: переключает флаг `is_completed` через PUT /shopping-lists/{uuid}. */
  async function toggleCompleted(list: ShoppingList): Promise<void> {
    await update(list.uuid, { is_completed: !list.is_completed })
  }

  return {
    lists,
    visibleLists,
    isLoading,
    error,
    hasMore,
    tab,
    typeFilter,
    sortKey,
    sortAsc,
    derivedFor,
    toggleSort,
    reload,
    loadNextPage,
    toggleCompleted,
    remove,
  }
}
