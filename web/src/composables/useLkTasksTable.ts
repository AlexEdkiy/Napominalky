import { computed, ref } from 'vue'

import { shoppingListsApi } from '@/api/shoppingListsApi'
import { useShoppingLists } from '@/composables/useShoppingLists'
import { LK_STATUS_ORDER } from '@/constants/lkStatusColors'
import type { ShoppingList, ShoppingListItem, ShoppingListType, TaskStatus, UpdateShoppingListPayload } from '@/types/shoppingList'
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
export type LkTasksSortKey = 'title' | 'status' | 'tags' | 'date' | 'reminder'

/**
 * Ранг статуса для сортировки колонки СТАТУС (по `LK_STATUS_ORDER`).
 * У goods статусов нет (колонка показывает «—») — `null`, всегда в конце.
 */
function statusRank(list: ShoppingList): number | null {
  return list.type === 'tasks' ? LK_STATUS_ORDER.indexOf(list.status) : null
}

/**
 * Комментарий треда пункта, «сплющенный» для попапа таблицы «Задачи и
 * списки»: содержит имя пункта, чтобы попап мог сгруппировать тред по
 * строкам списка.
 */
export interface LkListCommentPreview {
  uuid: string
  itemName: string
  author_name: string
  body: string
  created_at: string
}

/**
 * Производные данные списка из его пунктов: даты для колонок ДАТА /
 * НАПОМИНАНИЕ и комментарии для 💬-попапа колонки ЗАДАЧА.
 *
 * Для tasks общие даты возвращает сервер (WEB-54); у старого API и goods
 * используется производная дата пунктов. В tasks учитываются только
 * невыполненные пункты, включая просроченные даты.
 */
export interface LkListDerivedDates {
  deadline: string | null
  reminderAt: string | null
  /** Суммарное число комментариев тредов всех пунктов списка. */
  commentsCount: number
  /** Плоский список комментариев (в порядке пунктов, внутри пункта — ASC). */
  comments: LkListCommentPreview[]
  /** Имена и статусы пунктов для подсказки задач; без тел комментариев. */
  items?: Pick<ShoppingListItem, 'uuid' | 'name' | 'is_checked' | 'status'>[]
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

/** Самый ранний срок активных пунктов, в том числе просроченный. */
function earliestIso(values: (string | null)[]): string | null {
  return values.filter((value): value is string => value !== null && !Number.isNaN(Date.parse(value)))
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null
}

/** Начало суток в ms — для сравнения дат без учёта времени. */
function startOfDayTime(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
}

/** Разница в целых днях между `iso` и `now` (0 — сегодня, 1 — завтра); null — нет даты/мусор. */
function dayDiff(iso: string | null, now: Date): number | null {
  if (iso === null) {
    return null
  }
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T00:00:00' : iso)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return Math.round((startOfDayTime(date) - startOfDayTime(now)) / (24 * 60 * 60 * 1000))
}

/**
 * Дата приходится на «сегодня»? Единое правило и для метки «Сегодня» в
 * таблице задач (`lkTableDateLabel`), и для быстрого фильтра «Сделать
 * сегодня» панели «Задачи» на Обзоре (`LkOverviewTasksPanel`).
 */
export function isLkDateToday(iso: string | null, now: Date): boolean {
  return dayDiff(iso, now) === 0
}

/** Метка колонки ДАТА: «Сегодня» / «Завтра» / «15 июля»; пустая строка для null. */
export function lkTableDateLabel(iso: string | null, now: Date): string {
  if (iso === null) {
    return ''
  }
  const diffDays = dayDiff(iso, now)
  if (diffDays === null) {
    return ''
  }
  if (diffDays === 0) {
    return 'Сегодня'
  }
  if (diffDays === 1) {
    return 'Завтра'
  }
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T00:00:00' : iso)
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

/** Комментарии пунктов «в плоском виде» для 💬-попапа таблицы (embed из fetchItems). */
function flattenItemComments(items: ShoppingListItem[]): LkListCommentPreview[] {
  return items.flatMap((item) =>
    item.comments.map((comment) => ({
      uuid: comment.uuid,
      itemName: item.name,
      author_name: comment.author_name,
      body: comment.body,
      created_at: comment.created_at,
    })),
  )
}

/** Производные данные одного списка из его пунктов; null — ошибка загрузки пунктов. */
async function deriveListDates(
  list: ShoppingList,
  now: Date,
): Promise<[string, LkListDerivedDates] | null> {
  try {
    const items = await shoppingListsApi.fetchItems(list.uuid)
    const active = list.type === 'tasks' ? items.filter((item) => !item.is_checked) : items
    const chooseDate = (values: (string | null)[]): string | null =>
      list.type === 'tasks' ? earliestIso(values) : nearestIso(values, now)
    return [
      list.uuid,
      {
        deadline: list.type === 'tasks' && list.deadline !== undefined
          ? list.deadline : chooseDate(active.map((item) => item.deadline)),
        reminderAt: list.type === 'tasks' && list.reminder_at !== undefined
          ? list.reminder_at : chooseDate(active.map((item) => item.reminder_at)),
        items: items.map(({ uuid, name, is_checked, status }) => ({ uuid, name, is_checked, status })),
        commentsCount: items.reduce((sum, item) => sum + item.comments_count, 0),
        comments: flattenItemComments(items),
      },
    ]
  } catch {
    return null
  }
}

/**
 * Подгружает пункты списков параллельно и вычисляет ближайшие
 * `deadline`/`reminder_at` на список — общий механизм производных дат для
 * таблицы «Задачи и списки» и панели «Задачи» Обзора (`useLkDashboard`).
 * Уже известные записи (`known`) не перезапрашиваются; ошибки отдельных
 * списков игнорируются — их записи просто не появятся в результате.
 */
export async function fetchListsDerivedDates(
  lists: ShoppingList[],
  known: ReadonlyMap<string, LkListDerivedDates>,
): Promise<Map<string, LkListDerivedDates>> {
  const now = new Date()
  const targets = lists.filter((list) => !known.has(list.uuid))
  const entries = await Promise.all(targets.map((list) => deriveListDates(list, now)))
  const next = new Map(known)
  for (const entry of entries) {
    if (entry !== null) {
      next.set(entry[0], entry[1])
    }
  }
  return next
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
  const savingLists = ref(new Set<string>())
  let loadGeneration = 0

  function toggleSort(key: LkTasksSortKey): void {
    if (sortKey.value === key) {
      sortAsc.value = !sortAsc.value
      return
    }
    sortKey.value = key
    sortAsc.value = true
  }

  function derivedFor(uuid: string): LkListDerivedDates | undefined {
    const derived = derivedDates.value.get(uuid)
    const list = lists.value.find((item) => item.uuid === uuid)
    if (list?.type !== 'tasks' || (list.deadline === undefined && list.reminder_at === undefined)) {
      return derived
    }
    return {
      ...derived,
      deadline: list.deadline !== undefined ? list.deadline : derived?.deadline ?? null,
      reminderAt: list.reminder_at !== undefined ? list.reminder_at : derived?.reminderAt ?? null,
      comments: derived?.comments ?? [],
      commentsCount: derived?.commentsCount ?? 0,
    }
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
    if (key === 'status') {
      const rankA = statusRank(a)
      const rankB = statusRank(b)
      if (rankA === null || rankB === null) {
        return rankA === rankB ? 0 : rankA === null ? 1 : -1
      }
      return (rankA - rankB) * direction
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
   * Ленивая подгрузка производных дат пунктов (см. `fetchListsDerivedDates`)
   * — фоном, не блокирует рендер строк. Ошибки игнорируются: колонки
   * Дата/Напоминание — второстепенный источник, при сбое строка показывает «—».
   */
  async function loadDerivedDates(): Promise<void> {
    const generation = loadGeneration
    const result = await fetchListsDerivedDates(lists.value, derivedDates.value)
    if (generation === loadGeneration) derivedDates.value = result
  }

  /** Полная перезагрузка таблицы: списки — блокирующе, производные даты — фоном. */
  async function reload(): Promise<void> {
    loadGeneration += 1
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

  /** Сохраняем ответ API без оптимистичной подмены; ошибку обрабатывает редактор. */
  async function updateFields(list: ShoppingList, patch: UpdateShoppingListPayload): Promise<void> {
    if (list.type !== 'tasks') return
    if (savingLists.value.has(list.uuid)) throw new Error('Сохранение этой задачи уже выполняется')
    savingLists.value = new Set(savingLists.value).add(list.uuid)
    try {
      const updated = await shoppingListsApi.updateList(list.uuid, patch)
      const index = lists.value.findIndex((item) => item.uuid === list.uuid)
      if (index !== -1) lists.value.splice(index, 1, updated)
    } finally {
      const next = new Set(savingLists.value)
      next.delete(list.uuid)
      savingLists.value = next
    }
  }

  function isSaving(uuid: string): boolean {
    return savingLists.value.has(uuid)
  }

  /**
   * Смена статуса задачи из бейджа колонки СТАТУС (только tasks): выбор
   * статуса — PUT `{ status }` (сервер закрепит его как ручной и сведёт
   * `is_completed` для done); «Авто» — PUT `{ status_is_manual: false }`
   * (сброс закрепления, сервер вернёт статус, выведенный из пунктов).
   */
  async function changeStatus(list: ShoppingList, value: TaskStatus | 'auto'): Promise<void> {
    if (value === 'auto') {
      await updateFields(list, { status_is_manual: false })
      return
    }
    await updateFields(list, { status: value })
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
    changeStatus,
    updateFields,
    isSaving,
    remove,
  }
}
