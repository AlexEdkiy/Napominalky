/**
 * Форматирует ISO 8601-строку в локальную дату (без времени) для отображения.
 * Возвращает пустую строку, если значение пустое или некорректное.
 */
export function formatDate(iso: string | null): string {
  if (!iso) {
    return ''
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Форматирует ISO 8601-строку в локальную дату/время для отображения.
 * Возвращает пустую строку, если значение пустое или некорректное.
 */
export function formatDateTime(iso: string | null): string {
  if (!iso) {
    return ''
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Форматирует ISO 8601-строку в относительную дату для карточек списков
 * («Сегодня», «Вчера», «N дн. назад»), иначе — обычная дата (`formatDate`).
 * Возвращает пустую строку, если значение пустое или некорректное.
 */
export function formatRelativeDate(iso: string | null): string {
  if (!iso) {
    return ''
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const startOfDay = (value: Date): number =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) {
    return 'Сегодня'
  }
  if (diffDays === 1) {
    return 'Вчера'
  }
  if (diffDays > 1 && diffDays < 7) {
    return `${diffDays} дн. назад`
  }
  return formatDate(iso)
}

/**
 * Конвертирует ISO 8601-строку в значение для `<input type="datetime-local">`
 * (формат `YYYY-MM-DDTHH:mm` в локальной зоне).
 */
export function isoToDateTimeLocal(iso: string | null): string {
  if (!iso) {
    return ''
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (value: number): string => String(value).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Конвертирует значение `<input type="datetime-local">` (локальное время)
 * в ISO 8601-строку с зоной (UTC). Возвращает null для пустого значения.
 */
export function dateTimeLocalToIso(local: string): string | null {
  if (!local) {
    return null
  }
  const date = new Date(local)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date.toISOString()
}
