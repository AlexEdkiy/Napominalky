/**
 * Чистые функции для месячного календаря (без сторонних либ, нативный Date).
 * Неделя начинается с понедельника (Пн Вт Ср Чт Пт Сб Вс).
 * Группировка/ключи дня используют локальные компоненты даты — согласованно
 * с отображением remind_at через utils/datetime.ts.
 */

const DAYS_IN_WEEK = 7
const WEEKS_IN_GRID = 6
const GRID_SIZE = DAYS_IN_WEEK * WEEKS_IN_GRID
const PAD = 2

const pad = (value: number): string => String(value).padStart(PAD, '0')

/** День сетки: дата и флаг принадлежности отображаемому месяцу. */
export interface CalendarDay {
  date: Date
  inMonth: boolean
}

/** Границы месяца [первый день 00:00; первый день след. месяца 00:00) в ISO. */
export const monthRange = (
  year: number,
  month: number,
): { startIso: string; endIso: string } => {
  const start = new Date(year, month, 1, 0, 0, 0, 0)
  const end = new Date(year, month + 1, 1, 0, 0, 0, 0)
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

/** Смещение первого дня месяца от понедельника (Пн=0 … Вс=6). */
const mondayOffset = (date: Date): number => (date.getDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK

/**
 * Сетка месяца 6×7 c добивкой днями предыдущего/следующего месяца.
 * Первая ячейка — понедельник недели, в которую попадает 1-е число.
 */
export const getCalendarDays = (year: number, month: number): CalendarDay[] => {
  const first = new Date(year, month, 1, 0, 0, 0, 0)
  const startDay = first.getDate() - mondayOffset(first)
  const days: CalendarDay[] = []
  for (let i = 0; i < GRID_SIZE; i += 1) {
    const date = new Date(year, month, startDay + i, 0, 0, 0, 0)
    days.push({ date, inMonth: date.getMonth() === month })
  }
  return days
}

/** true, если a и b — один календарный день (локально). */
export const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/** Разбивает плоскую сетку CalendarDay[] (кратную 7) на недели-строки. */
export const chunkWeeks = (days: CalendarDay[]): CalendarDay[][] => {
  const weeks: CalendarDay[][] = []
  for (let i = 0; i < days.length; i += DAYS_IN_WEEK) {
    weeks.push(days.slice(i, i + DAYS_IN_WEEK))
  }
  return weeks
}

/** Индекс недели (строки), содержащей date; -1, если date не входит в сетку. */
export const findWeekIndex = (weeks: CalendarDay[][], date: Date): number =>
  weeks.findIndex((week) => week.some((day) => sameDay(day.date, date)))

/** Ключ дня YYYY-MM-DD по локальным компонентам даты. */
export const ymd = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
] as const

const MONTHS_NOMINATIVE = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const

/** Заголовок дня «4 июня 2026» по локальным компонентам. */
export const formatDateTitle = (date: Date): string => {
  const month = MONTHS_GENITIVE[date.getMonth()] ?? ''
  return `${date.getDate()} ${month} ${date.getFullYear()}`
}

/** Заголовок месяца «Июнь 2026». */
export const formatMonthTitle = (year: number, month: number): string => {
  const name = MONTHS_NOMINATIVE[((month % 12) + 12) % 12] ?? ''
  return `${name} ${year}`
}
