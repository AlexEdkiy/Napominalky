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
  const { notes, meta, isLoading, error, load, loadMore, create, update, remove, pin, archive } = useNotes()

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

  const pinnedNotes = computed<Note[]>(() => notes.value.filter((note) => note.is_pinned))
  const otherNotes = computed<Note[]>(() => notes.value.filter((note) => !note.is_pinned))
  const hasMore = computed<boolean>(() => meta.value !== null && meta.value.current_page < meta.value.last_page)

  return {
    notes,
    pinnedNotes,
    otherNotes,
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
