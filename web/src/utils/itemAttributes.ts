import type { LkIconName } from '@/types/lkIcon'
import type { ShoppingListItem } from '@/types/shoppingList'

/**
 * Дополнительные атрибуты пункта списка (веб-аналог
 * `mobile/src/utils/itemAttributes.ts`): чипсы «добавить атрибут» →
 * инлайн-редактор → токены заданных значений. Чистые функции без побочных
 * эффектов — используются в `LkItemAttributes.vue` / `LkTaskItemRow.vue` и
 * покрыты юнит-тестами.
 */

/** Атрибут пункта, доступный через чипсы/токены в развёрнутой панели. */
export type ItemAttribute = 'deadline' | 'reminder' | 'link' | 'comment' | 'tag'

/** Текущие значения атрибутов пункта (используются токенами и редакторами). */
export interface ItemAttributeValues {
  deadline: string | null
  reminderAt: string | null
  link: string | null
  comment: string | null
  tags: string[]
}

export const ATTRIBUTE_ORDER: readonly ItemAttribute[] = [
  'deadline',
  'reminder',
  'link',
  'comment',
  'tag',
]

export const ATTRIBUTE_LABELS: Record<ItemAttribute, string> = {
  deadline: 'Дедлайн',
  reminder: 'Напоминание',
  link: 'Ссылка',
  comment: 'Комментарий',
  tag: 'Тег',
}

export const ATTRIBUTE_ICONS: Record<ItemAttribute, LkIconName> = {
  deadline: 'calendar',
  reminder: 'bell',
  link: 'link',
  comment: 'comment',
  tag: 'tag',
}

/** Собирает значения атрибутов из позиции API (snake_case → values). */
export function attributeValuesFromItem(item: ShoppingListItem): ItemAttributeValues {
  return {
    deadline: item.deadline,
    reminderAt: item.reminder_at,
    link: item.link,
    comment: item.comment,
    tags: item.tags,
  }
}

/** true, если атрибут задан (есть значение) в текущем наборе values. */
export function isAttributeSet(attribute: ItemAttribute, values: ItemAttributeValues): boolean {
  switch (attribute) {
    case 'deadline':
      return values.deadline !== null && values.deadline.length > 0
    case 'reminder':
      return values.reminderAt !== null && values.reminderAt.length > 0
    case 'link':
      return values.link !== null && values.link.length > 0
    case 'comment':
      return values.comment !== null && values.comment.length > 0
    case 'tag':
      return values.tags.length > 0
    default:
      return false
  }
}

const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
] as const

const DAY_MS = 86_400_000

/** true, если дедлайн хранит явное время (не просто 'YYYY-MM-DD'). */
export function hasDeadlineTime(dateStr: string): boolean {
  return !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)
}

function formatDayMonth(date: Date, now: Date): string {
  const month = MONTHS_SHORT[date.getMonth()] ?? ''
  const yearSuffix = date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`
  return `${date.getDate()} ${month}${yearSuffix}`
}

/**
 * Дедлайн-токен: «Сегодня»/«Завтра» (+время, если задано) либо
 * форматированная дата («10 июл[, чч:мм]»). `now` — инъекция «текущего
 * момента» для детерминированных тестов.
 */
export function formatDeadlineToken(dateStr: string, now: Date = new Date()): string {
  const withTime = hasDeadlineTime(dateStr)
  const date = new Date(withTime ? dateStr : `${dateStr}T00:00:00`)
  if (!Number.isFinite(date.getTime())) {
    return dateStr
  }
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS)
  const dayAfter = new Date(todayStart.getTime() + 2 * DAY_MS)
  const pad = (value: number): string => String(value).padStart(2, '0')
  const timeSuffix = withTime ? `, ${pad(date.getHours())}:${pad(date.getMinutes())}` : ''
  if (date >= todayStart && date < tomorrowStart) {
    return `Сегодня${timeSuffix}`
  }
  if (date >= tomorrowStart && date < dayAfter) {
    return `Завтра${timeSuffix}`
  }
  return `${formatDayMonth(date, now)}${timeSuffix}`
}

/** Напоминание-токен: «дд мес чч:мм» в локальной зоне. */
export function formatReminderToken(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) {
    return iso
  }
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${formatDayMonth(date, now)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Домен из ссылки (hostname). Для невалидного URL возвращает исходную строку. */
export function formatLinkToken(link: string): string {
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(link) ? link : `https://${link}`
    return new URL(withScheme).hostname
  } catch {
    return link
  }
}

/** Значение токена атрибута для отображения в панели атрибутов. */
export function formatAttributeToken(
  attribute: ItemAttribute,
  values: ItemAttributeValues,
  now: Date = new Date(),
): string {
  switch (attribute) {
    case 'deadline':
      return values.deadline !== null ? formatDeadlineToken(values.deadline, now) : ''
    case 'reminder':
      return values.reminderAt !== null ? formatReminderToken(values.reminderAt, now) : ''
    case 'link':
      return values.link !== null ? formatLinkToken(values.link) : ''
    case 'comment':
      return 'Есть заметка'
    case 'tag':
      return values.tags.join(', ')
    default:
      return ''
  }
}

/**
 * Валидация ссылки редактора: непустая строка, разбираемая как URL
 * (протокол опционален — добавляется https://).
 */
export function isValidLink(link: string): boolean {
  const trimmed = link.trim()
  if (trimmed === '' || /\s/.test(trimmed)) {
    return false
  }
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(withScheme)
    return url.hostname.includes('.') || url.hostname === 'localhost'
  } catch {
    return false
  }
}
