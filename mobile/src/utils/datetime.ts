/**
 * Хелперы отображения/валидации даты-времени напоминаний. Чистые функции,
 * без сторонних зависимостей (datetimepicker в проекте не установлен).
 */

const PAD = 2

const pad = (value: number): string => String(value).padStart(PAD, '0')

/** true, если строка парсится в корректную дату. */
export const isValidIso = (value: string): boolean => {
  const time = new Date(value).getTime()
  return Number.isFinite(time)
}

/**
 * Локальное «дд.мм.гггг чч:мм» для отображения. Для невалидного входа
 * возвращает исходную строку, чтобы не падать на пользовательском вводе.
 */
export const formatDateTime = (iso: string): string => {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return iso
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${day}.${month}.${date.getFullYear()} ${hours}:${minutes}`
}

/** Локальное «чч:мм» для отображения. Для невалидного входа — исходная строка. */
export const formatTime = (iso: string): string => {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return iso
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Относительная дата напоминания: «Сегодня · 15:00», «Завтра · 10:00», «10 июл · 14:30». */
export const formatRelativeReminder = (iso: string): string => {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return iso
  const now = new Date()
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const sameYear = date.getFullYear() === now.getFullYear()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000)
  const dayAfter = new Date(todayStart.getTime() + 2 * 86_400_000)
  if (date >= todayStart && date < tomorrowStart) return `Сегодня · ${time}`
  if (date >= tomorrowStart && date < dayAfter) return `Завтра · ${time}`
  const month = MONTH_NAMES[date.getMonth()]
  const year = sameYear ? '' : ` ${date.getFullYear()}`
  return `${date.getDate()} ${month ?? ''}${year} · ${time}`
}

/** true, если дата-напоминание уже наступила (прошла) или сегодня. */
export const isReminderUrgent = (iso: string): boolean => {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return false
  const now = new Date()
  const tomorrowStart = new Date(
    now.getFullYear(), now.getMonth(), now.getDate() + 1,
  )
  return date < tomorrowStart
}

/** «Изменено дд.мм.гггг» для подзаголовка заметки. */
export const formatUpdatedAt = (iso: string): string => {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ''
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  return `Изменено ${day}.${month}.${date.getFullYear()}`
}

const MONTH_NAMES = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
] as const

/**
 * Форматирует дедлайн пункта задачи в краткий вид «до DD мес»
 * (например «до 5 июл»). Принимает строку YYYY-MM-DD или ISO 8601.
 * Для невалидного входа возвращает исходную строку.
 */
export const formatDeadlineChip = (dateStr: string): string => {
  const date = new Date(dateStr)
  if (!Number.isFinite(date.getTime())) return dateStr
  const month = MONTH_NAMES[date.getMonth()]
  return `до ${date.getDate()} ${month ?? ''}`
}

/**
 * Форматирует дедлайн пункта для отображения в чипе строки и в раскрытом
 * редакторе: «10 июл» (текущий год) или «10 июл 2027» (другой год).
 * Если дата содержит время (не 'YYYY-MM-DD'), добавляет «, чч:мм»: «10 июл, 14:30».
 * Принимает строку YYYY-MM-DD или ISO с временем. Для невалидного входа — исходная строка.
 */
export const formatDeadlineDisplay = (dateStr: string): string => {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
  // YYYY-MM-DD → добавляем T00:00 чтобы избежать смещения UTC
  const normalized = dateOnly ? `${dateStr}T00:00:00` : dateStr
  const date = new Date(normalized)
  if (!Number.isFinite(date.getTime())) return dateStr
  const month = MONTH_NAMES[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  const currentYear = new Date().getFullYear()
  const datePart = year === currentYear ? `${day} ${month ?? ''}` : `${day} ${month ?? ''} ${year}`
  if (dateOnly) return datePart
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return `${datePart}, ${timePart}`
}
