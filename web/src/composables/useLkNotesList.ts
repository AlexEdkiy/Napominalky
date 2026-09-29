import { computed, onUnmounted, ref, watch } from 'vue'

import { useNotes } from '@/composables/useNotes'
import type { Note, NoteListParams } from '@/types/note'

/**
 * Сколько заметок запрашивать за раз в разделе «Заметки».
 * ВАЖНО: API валидирует `per_page` заметок `max:100` (NoteIndexRequest) —
 * держим значение заметно ниже лимита (см. урок фазы 3 с календарём: 200 → 422).
 */
export const LK_NOTES_PER_PAGE = 20

/** Задержка дебаунса серверного поиска по заметкам. */
const SEARCH_DEBOUNCE_MS = 350

/**
 * Раздел «Заметки»: серверные поиск/фильтр архива (`notesApi.fetchNotes`
 * через `useNotes`), группировка закреплённых заметок над остальными и
 * пагинация «Загрузить ещё». Поиск дебаунсится, чтобы не дёргать API на
 * каждое нажатие клавиши.
 */
export function useLkNotesList() {
  const {
    notes,
    meta,
    counts,
    isLoading,
    error,
    load,
    loadMore,
    create,
    update,
    remove: removeNote,
    pin,
    archive: archiveNote,
    dropLocally,
  } = useNotes()

  const searchQuery = ref('')
  const showArchived = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  function buildParams(): NoteListParams {
    const params: NoteListParams = { archived: showArchived.value, per_page: LK_NOTES_PER_PAGE }
    const trimmed = searchQuery.value.trim()
    if (trimmed) {
      params.search = trimmed
    }
    return params
  }

  function reload(): Promise<void> {
    return load(buildParams())
  }

  watch(searchQuery, () => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      void reload()
    }, SEARCH_DEBOUNCE_MS)
  })

  watch(showArchived, () => {
    void reload()
  })

  onUnmounted(() => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer)
    }
  })

  function shiftCounts(activeDelta: number, archivedDelta: number): void {
    if (counts.value === null) {
      return
    }
    counts.value = {
      active: Math.max(0, counts.value.active + activeDelta),
      archived: Math.max(0, counts.value.archived + archivedDelta),
    }
  }

  /**
   * Архивирует / возвращает из архива. Заметка, чей `is_archived` больше не
   * совпадает с текущей вкладкой, уходит из списка сразу (без refetch), а
   * счётчики переключателя сдвигаются (WEB-52).
   */
  async function archive(uuid: string, isArchived: boolean): Promise<Note | null> {
    const note = await archiveNote(uuid, isArchived)
    if (note === null) {
      return null
    }
    if (note.is_archived !== showArchived.value) {
      dropLocally(uuid)
      shiftCounts(note.is_archived ? -1 : 1, note.is_archived ? 1 : -1)
    }
    return note
  }

  async function remove(uuid: string): Promise<boolean> {
    const ok = await removeNote(uuid)
    if (ok) {
      shiftCounts(showArchived.value ? 0 : -1, showArchived.value ? -1 : 0)
    }
    return ok
  }

  const pinnedNotes = computed<Note[]>(() => notes.value.filter((note) => note.is_pinned))
  const otherNotes = computed<Note[]>(() => notes.value.filter((note) => !note.is_pinned))
  const hasMore = computed<boolean>(() => meta.value !== null && meta.value.current_page < meta.value.last_page)

  return {
    notes,
    pinnedNotes,
    otherNotes,
    counts,
    isLoading,
    error,
    hasMore,
    searchQuery,
    showArchived,
    load: reload,
    loadMore,
    create,
    update,
    remove,
    pin,
    archive,
  }
}
