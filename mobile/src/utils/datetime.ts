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
