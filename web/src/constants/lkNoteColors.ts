/**
 * Пастельная палитра стикеров раздела «Заметки» (see `web-lk-redesign.md` /
 * `web-lk-phase4.md`): мягкие тона той же палитры, что используется для
 * тегов/категорий (`lkTagColors.ts`, `lkCategoryColors.ts`) — amber, teal,
 * blue, светлые olive/lilac. Цвет назначается детерминированно по `uuid`
 * заметки (тот же приём хэша, что и в `lkTagColors.ts`), поэтому карточка
 * одной и той же заметки всегда выглядит одинаково между перерисовками.
 */
export interface LkNoteColor {
  bg: string
  accent: string
}

const NOTE_PALETTE: LkNoteColor[] = [
  { bg: '#f7ebd5', accent: '#c98a2b' },
  { bg: '#d8ebe4', accent: '#17897a' },
  { bg: '#dde6f3', accent: '#4067a8' },
  { bg: '#e6efd7', accent: '#6a8a37' },
  { bg: '#e6e1f5', accent: '#7b6bb0' },
  { bg: '#d7ecec', accent: '#2b8a8a' },
]

const DEFAULT_NOTE_COLOR: LkNoteColor = { bg: '#eef1f0', accent: '#6b716e' }

/** Простой детерминированный хэш строки (для стабильного выбора цвета). */
function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

/**
 * Стабильный пастельный цвет стикера заметки по её `uuid`: один и тот же
 * `uuid` всегда попадает в один и тот же цвет палитры.
 */
export function colorForNote(uuid: string): LkNoteColor {
  const index = hashString(uuid) % NOTE_PALETTE.length
  return NOTE_PALETTE[index] ?? DEFAULT_NOTE_COLOR
}
