import type { Note } from '@/db/repositories/notesRepo'

/** Сортирует заметки: закреплённые наверху, остальные в исходном порядке. */
export const sortNotesPinnedFirst = (items: Note[]): Note[] => {
  const pinned = items.filter((n) => n.isPinned)
  const rest = items.filter((n) => !n.isPinned)
  return [...pinned, ...rest]
}
