/**
 * Разбирает поле `tags` списка покупок/пункта. Сервер отдаёт его непрозрачной
 * JSON-строкой (TEXT-колонка; `null` — тегов нет) — см. `ShoppingListResource`
 * / `ShoppingListItemResource`. Устойчиво к уже готовому массиву (на случай
 * изменения контракта) и к некорректному JSON — в обоих случаях безопасно
 * возвращает `[]`, не бросая исключение.
 */
export function parseTags(raw: unknown): string[] {
  if (raw === null || raw === undefined) {
    return []
  }
  if (Array.isArray(raw)) {
    return raw.filter((tag): tag is string => typeof tag === 'string')
  }
  if (typeof raw !== 'string') {
    return []
  }
  const trimmed = raw.trim()
  if (trimmed === '') {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((tag): tag is string => typeof tag === 'string')
  } catch {
    return []
  }
}
