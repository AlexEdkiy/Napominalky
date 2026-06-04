/**
 * Тип повторения напоминания. Согласован с backend RecurrenceType
 * (none/daily/weekly/monthly) и колонкой reminders.recurrence.
 */
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly'

/** Все варианты повторения — для валидации/рендера селектов. */
export const RECURRENCE_TYPES: readonly RecurrenceType[] = [
  'none',
  'daily',
  'weekly',
  'monthly',
] as const

/**
 * Следующее вхождение относительно даты fromIso (ISO-строка).
 *
 * Согласовано с backend RecurrenceType::nextOccurrence: none → null,
 * daily → +1 день, weekly → +1 неделя, monthly → +1 месяц. Чистая функция:
 * исходная дата не мутируется, возвращается новая ISO-строка либо null.
 * Используется в completeReminder для повторяющихся напоминаний.
 */
export const nextOccurrence = (
  recurrence: RecurrenceType,
  fromIso: string,
): string | null => {
  if (recurrence === 'none') return null

  const date = new Date(fromIso)
  switch (recurrence) {
    case 'daily':
      date.setDate(date.getDate() + 1)
      break
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
  }
  return date.toISOString()
}
