import type { NoteColor } from '@/types/note'

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
 * единая для веба и мобилки (WEB-52): 4 именованных токена ЛК (teal, «Важное»/
 * coral, amber, лиловый «Звонки»/purple — та же палитра, что `lkTagColors.ts`)
 * и 4 hex-маркера мобильного приложения (розовый, песочный, зелёный, голубой),
 * которые раньше веб не распознавал и подменял фолбэком по uuid.
 */
export const NAMED_NOTE_COLORS: Record<NoteColor, LkNoteColor> = {
  teal: { bg: '#d8ebe4', accent: '#17897a' },
  coral: { bg: '#f6dfda', accent: '#cf5b4a' },
  amber: { bg: '#f7ebd5', accent: '#c98a2b' },
  purple: { bg: '#e6e1f5', accent: '#7b6bb0' },
  '#ea899a': { bg: '#f7d3da', accent: '#c14b63' },
  '#ffebb8': { bg: '#ffebb8', accent: '#c98a2b' },
  '#91d177': { bg: '#d9f0cc', accent: '#4f8a34' },
  '#afdafc': { bg: '#d6ebfb', accent: '#2f6fa8' },
}

/** Порядок свотчей в форме: сначала токены ЛК, затем маркеры мобилки. */
export const NOTE_COLOR_OPTIONS: NoteColor[] = [
  'teal',
  'coral',
  'amber',
  'purple',
  '#ea899a',
  '#ffebb8',
  '#91d177',
  '#afdafc',
]

export function isNoteColor(value: string | null | undefined): value is NoteColor {
  return value !== null && value !== undefined && value in NAMED_NOTE_COLORS
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
  if (isNoteColor(color)) {
    return NAMED_NOTE_COLORS[color]
  }
  return colorForNote(uuid)
}
