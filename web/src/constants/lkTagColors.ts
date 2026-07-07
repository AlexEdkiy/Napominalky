export interface LkTagColor {
  bg: string
  fg: string
}

/**
 * Именованная палитра тегов из design-брифа (`web-lk-redesign.md`):
 * Покупки — teal, Дом — olive, Личное — blue, Важное — red, Звонки — lilac,
 * Счета — amber, Здоровье — teal-green. Ключ — точное имя тега (как хранится
 * на сервере).
 */
const NAMED_TAG_COLORS: Record<string, LkTagColor> = {
  Покупки: { bg: '#d8ebe4', fg: '#17897a' },
  Дом: { bg: '#e6efd7', fg: '#6a8a37' },
  Личное: { bg: '#dde6f3', fg: '#4067a8' },
  Важное: { bg: '#f6dfda', fg: '#cf5b4a' },
  Звонки: { bg: '#e6e1f5', fg: '#7b6bb0' },
  Счета: { bg: '#f7ebd5', fg: '#c98a2b' },
  Здоровье: { bg: '#d7ecec', fg: '#2b8a8a' },
}

/** Тона той же палитры для тегов, чьё имя не входит в `NAMED_TAG_COLORS`. */
const FALLBACK_PALETTE: LkTagColor[] = [
  { bg: '#d8ebe4', fg: '#17897a' },
  { bg: '#e6efd7', fg: '#6a8a37' },
  { bg: '#dde6f3', fg: '#4067a8' },
  { bg: '#f6dfda', fg: '#cf5b4a' },
  { bg: '#e6e1f5', fg: '#7b6bb0' },
  { bg: '#f7ebd5', fg: '#c98a2b' },
  { bg: '#d7ecec', fg: '#2b8a8a' },
]

const DEFAULT_TAG_COLOR: LkTagColor = { bg: '#eef1f0', fg: '#6b716e' }

/** Простой детерминированный хэш строки (для стабильного выбора цвета). */
function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

/**
 * Цвет pill'а для произвольного имени тега: точное совпадение по палитре
 * брифа, иначе — стабильный (детерминированный по имени) цвет из той же
 * палитры, чтобы один и тот же тег всегда выглядел одинаково.
 */
export function colorForTag(tag: string): LkTagColor {
  const named = NAMED_TAG_COLORS[tag]
  if (named) {
    return named
  }
  const index = hashString(tag) % FALLBACK_PALETTE.length
  return FALLBACK_PALETTE[index] ?? DEFAULT_TAG_COLOR
}
