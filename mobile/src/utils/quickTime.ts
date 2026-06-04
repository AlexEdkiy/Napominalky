/**
 * Пресеты быстрого выбора времени напоминания (FR-20). Каждая функция —
 * чистая: принимает опциональную базовую дату (по умолчанию now) для
 * тестируемости и возвращает ISO-строку, не мутируя вход.
 */

/** Час «вечера» для thisEvening. */
const EVENING_HOUR = 18
/** Час «утра» для tomorrowMorning. */
const MORNING_HOUR = 9

const atTime = (base: Date, hour: number, minute = 0): Date => {
  const date = new Date(base.getTime())
  date.setHours(hour, minute, 0, 0)
  return date
}

/** Через час от базовой даты. */
export const inOneHour = (base: Date = new Date()): string => {
  const date = new Date(base.getTime())
  date.setHours(date.getHours() + 1)
  return date.toISOString()
}

/** Сегодня вечером (18:00 базового дня). */
export const thisEvening = (base: Date = new Date()): string =>
  atTime(base, EVENING_HOUR).toISOString()

/** Завтра утром (09:00 следующего дня). */
export const tomorrowMorning = (base: Date = new Date()): string => {
  const date = atTime(base, MORNING_HOUR)
  date.setDate(date.getDate() + 1)
  return date.toISOString()
}

/** Завтра в то же время (+1 день, час/минуты базовой даты). */
export const tomorrow = (base: Date = new Date()): string => {
  const date = new Date(base.getTime())
  date.setDate(date.getDate() + 1)
  return date.toISOString()
}
