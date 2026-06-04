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
