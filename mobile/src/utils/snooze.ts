/**
 * Расчёт времени отложенного напоминания (FR-25). Чистая функция: принимает
 * интервал-токен и опциональную базовую дату (по умолчанию now), возвращает
 * ISO-строку snoozed_until, не мутируя вход.
 */

/** Поддерживаемые интервалы откладывания. */
export type SnoozeInterval = '10m' | '1h'

/** Минут в каждом интервале откладывания. */
const SNOOZE_MINUTES: Record<SnoozeInterval, number> = {
  '10m': 10,
  '1h': 60,
}

/** ISO-строка момента, на который откладывается напоминание. */
export const snoozeUntil = (
  interval: SnoozeInterval,
  base: Date = new Date(),
): string => {
  const date = new Date(base.getTime())
  date.setMinutes(date.getMinutes() + SNOOZE_MINUTES[interval])
  return date.toISOString()
}
