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

/**
 * Палитра РЕАЛЬНОГО поля `notes.color` (см. `types/note.ts#NoteColor`) —
 * бэкенд принимает только `teal | coral | amber | purple`. Тона переиспользуют
 * ту же палитру, что и `lkTagColors.ts` (teal, «Важное»/coral, amber, лиловый
 * «Звонки»/purple), чтобы визуальный язык оставался единым в приложении.
 */
export const NAMED_NOTE_COLORS: Record<'teal' | 'coral' | 'amber' | 'purple', LkNoteColor> = {
  teal: { bg: '#d8ebe4', accent: '#17897a' },
  coral: { bg: '#f6dfda', accent: '#cf5b4a' },
  amber: { bg: '#f7ebd5', accent: '#c98a2b' },
  purple: { bg: '#e6e1f5', accent: '#7b6bb0' },
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

/**
 * Цвет стикера по РЕАЛЬНОМУ значению `note.color` — если оно задано;
 * иначе — прежний детерминированный фолбэк по `uuid` (`colorForNote`), чтобы
 * старые заметки без цвета не «прыгали» между перерисовками.
 */
export function colorForNoteValue(color: string | null, uuid: string): LkNoteColor {
  if (color !== null && color in NAMED_NOTE_COLORS) {
    return NAMED_NOTE_COLORS[color as keyof typeof NAMED_NOTE_COLORS]
  }
  return colorForNote(uuid)
}
