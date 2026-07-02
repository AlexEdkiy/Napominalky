/**
 * Общие типы/хелперы для редизайна атрибутов пункта задачи (чипсы → шторка → токены).
 * Чистые функции без побочных эффектов — переиспользуются в AttributeChips,
 * AttributeSheet, ItemRow и композере нового пункта.
 */

/** Атрибут пункта, доступный через чипсы/шторку. */
export type ItemAttribute = 'deadline' | 'reminder' | 'link' | 'comment' | 'tag'

/** Значение, редактируемое в AttributeSheet (тип зависит от attribute). */
export type AttributeSheetValue = string | string[] | null

/** Черновик атрибутов пункта (используется и в композере, и как «текущие значения» пункта). */
export interface ItemAttributeValues {
  deadline: string | null
  reminderAt: string | null
  link: string | null
  comment: string | null
  tags: string[]
}

export const EMPTY_ATTRIBUTE_VALUES: ItemAttributeValues = {
  deadline: null,
  reminderAt: null,
  link: null,
  comment: null,
  tags: [],
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

export const ATTRIBUTE_ICONS: Record<ItemAttribute, string> = {
  deadline: 'calendar-outline',
  reminder: 'notifications-outline',
  link: 'link-outline',
  comment: 'chatbubble-outline',
  tag: 'pricetag-outline',
}

/** true, если атрибут задан (есть значение) в текущем наборе values. */
export const isAttributeSet = (attribute: ItemAttribute, values: ItemAttributeValues): boolean => {
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

/** true, если дедлайн хранит явное время (не просто 'YYYY-MM-DD'). */
export const hasDeadlineTime = (dateStr: string): boolean => !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)

/** Дедлайн-токен: «Сегодня»/«Завтра» (+время, если задано) либо форматированная дата («10 июл[, чч:мм]»). */
export const formatDeadlineToken = (dateStr: string): string => {
  const withTime = hasDeadlineTime(dateStr)
  const normalized = withTime ? dateStr : `${dateStr}T00:00:00`
  const date = new Date(normalized)
  if (!Number.isFinite(date.getTime())) return dateStr
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000)
  const dayAfter = new Date(todayStart.getTime() + 2 * 86_400_000)
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const timeSuffix = withTime ? `, ${h}:${m}` : ''
  if (date >= todayStart && date < tomorrowStart) return `Сегодня${timeSuffix}`
  if (date >= tomorrowStart && date < dayAfter) return `Завтра${timeSuffix}`
  const month = MONTHS_SHORT[date.getMonth()]
  const year = date.getFullYear()
  const currentYear = now.getFullYear()
  const datePart =
    year === currentYear ? `${date.getDate()} ${month ?? ''}` : `${date.getDate()} ${month ?? ''} ${year}`
  return `${datePart}${timeSuffix}`
}

/** Напоминание-токен: относительный лейбл пресета, если совпадает, иначе «дд мес чч:мм». */
export const formatReminderToken = (iso: string): string => {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return iso
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const ONE_MIN = 60_000
  if (diffMs > 0 && diffMs <= 11 * ONE_MIN) return 'За 10 минут'
  if (diffMs > 11 * ONE_MIN && diffMs <= 61 * ONE_MIN) return 'За 1 час'
  const day = String(date.getDate()).padStart(2, '0')
  const month = MONTHS_SHORT[date.getMonth()] ?? ''
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${h}:${m}`
}

/** Домен из ссылки (hostname). Для невалидного URL возвращает исходную строку. */
export const formatLinkToken = (link: string): string => {
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(link) ? link : `https://${link}`
    return new URL(withScheme).hostname
  } catch {
    return link
  }
}

/** Значение токена атрибута для отображения в AttributeChips. */
export const formatAttributeToken = (attribute: ItemAttribute, values: ItemAttributeValues): string => {
  switch (attribute) {
    case 'deadline':
      return values.deadline !== null ? formatDeadlineToken(values.deadline) : ''
    case 'reminder':
      return values.reminderAt !== null ? formatReminderToken(values.reminderAt) : ''
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

// ---- Пресеты дедлайна -------------------------------------------------------

export type DeadlinePresetKey = 'today' | 'tomorrow' | 'weekend' | 'nextWeek'

export interface DeadlinePreset {
  key: DeadlinePresetKey
  label: string
}

export const DEADLINE_PRESETS: readonly DeadlinePreset[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'tomorrow', label: 'Завтра' },
  { key: 'weekend', label: 'В выходные' },
  { key: 'nextWeek', label: 'Через неделю' },
]

const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Вычисляет 'YYYY-MM-DD' для пресета дедлайна относительно текущей даты. */
export const resolveDeadlinePreset = (key: DeadlinePresetKey, now: Date = new Date()): string => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (key === 'today') return formatDateLocal(today)
  if (key === 'tomorrow') return formatDateLocal(new Date(today.getTime() + 86_400_000))
  if (key === 'weekend') {
    const day = today.getDay()
    // Суббота (6) — ближайшая; если сегодня суббота/воскресенье, берём следующую субботу.
    const daysToSaturday = day === 6 ? 7 : (6 - day + 7) % 7 || 7
    const offset = day === 6 || day === 0 ? (day === 6 ? 7 : 6) : daysToSaturday
    return formatDateLocal(new Date(today.getTime() + offset * 86_400_000))
  }
  return formatDateLocal(new Date(today.getTime() + 7 * 86_400_000))
}

/** Определяет активный пресет дедлайна по текущему значению (null, если не совпадает). */
export const matchDeadlinePreset = (
  deadline: string | null,
  now: Date = new Date(),
): DeadlinePresetKey | null => {
  if (deadline === null) return null
  for (const preset of DEADLINE_PRESETS) {
    if (resolveDeadlinePreset(preset.key, now) === deadline) return preset.key
  }
  return null
}

// ---- Пресеты напоминания -----------------------------------------------------

export type ReminderPresetKey = '10m' | '1h' | '1d'

export interface ReminderPreset {
  key: ReminderPresetKey
  label: string
  offsetMs: number
}

export const REMINDER_PRESETS: readonly ReminderPreset[] = [
  { key: '10m', label: 'За 10 минут', offsetMs: 10 * 60_000 },
  { key: '1h', label: 'За 1 час', offsetMs: 60 * 60_000 },
  { key: '1d', label: 'За день', offsetMs: 24 * 60 * 60_000 },
]

const REMINDER_DEFAULT_HOUR = 9

/**
 * Вычисляет ISO-момент напоминания для пресета.
 * Если задан дедлайн со своим временем — базой служит это время дедлайна минус смещение.
 * Если дедлайн задан без времени — базой служит дедлайн в REMINDER_DEFAULT_HOUR:00 минус смещение.
 * Если дедлайна нет — базой служит «сейчас» плюс небольшой запас минус смещение
 * (чтобы не уйти в прошлое).
 */
export const resolveReminderPreset = (
  key: ReminderPresetKey,
  deadline: string | null,
  now: Date = new Date(),
): string => {
  const preset = REMINDER_PRESETS.find((p) => p.key === key)
  const offsetMs = preset?.offsetMs ?? 0
  if (deadline !== null && deadline.length > 0) {
    const withTime = hasDeadlineTime(deadline)
    const normalized = withTime ? deadline : `${deadline}T00:00:00`
    const base = new Date(normalized)
    if (Number.isFinite(base.getTime())) {
      if (!withTime) base.setHours(REMINDER_DEFAULT_HOUR, 0, 0, 0)
      return new Date(base.getTime() - offsetMs).toISOString()
    }
  }
  return new Date(now.getTime() + offsetMs).toISOString()
}
