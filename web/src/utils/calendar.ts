/**
 * Чистые утилиты для построения месячной сетки календаря.
 * Неделя начинается с понедельника (Пн…Вс). Все вычисления — в локальной TZ.
 */

/**
 * Один день месячной сетки.
 */
export interface CalendarDay {
  date: Date
  /** Ключ `YYYY-MM-DD` в локальной зоне. */
  key: string
  /** День месяца (1–31). */
  dayOfMonth: number
  /** Принадлежит ли день отображаемому месяцу (иначе — «добивка» из соседних). */
  inCurrentMonth: boolean
}

/**
 * Возвращает индекс дня недели с понедельника: Пн=0 … Вс=6.
 */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

/**
 * Форматирует дату в ключ `YYYY-MM-DD` в локальной зоне.
 */
export function ymd(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Проверяет, относятся ли две даты к одному календарному дню (локальная TZ).
 */
export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Строит сетку 6×7 (42 дня) для месяца `month` (0–11) года `year`.
 * Первая ячейка — понедельник недели, содержащей 1-е число месяца.
 */
export function getCalendarDays(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1)
  const start = new Date(year, month, 1 - mondayIndex(firstOfMonth))
  const days: CalendarDay[] = []
  for (let offset = 0; offset < 42; offset += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset)
    days.push({
      date,
      key: ymd(date),
      dayOfMonth: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
    })
  }
  return days
}
