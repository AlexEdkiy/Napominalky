import { ref } from 'vue'

import { notesApi } from '@/api/notesApi'
import type { PaginationMeta } from '@/types/api'
import type { CreateNotePayload, Note, NoteListParams, NotesCounts, UpdateNotePayload } from '@/types/note'

/**
 * Инкапсулирует реактивное состояние списка заметок и операции CRUD.
 * Без внешних query-библиотек — простое состояние на ref + методы.
 */
export function useNotes() {
  const notes = ref<Note[]>([])
  const meta = ref<PaginationMeta | null>(null)
  // Счётчики «Активные / Архив» по текущему поиску (meta.counts ответа списка).
  const counts = ref<NotesCounts | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  // Запоминает фильтры (search/archived) последнего `load()`, чтобы `loadMore`
  // дозагружал следующую страницу с теми же фильтрами, а не сбрасывал их.
  let lastParams: NoteListParams = {}

  function resolveError(e: unknown): void {
    error.value = e instanceof Error ? e.message : 'Не удалось выполнить операцию'
  }

  function replaceNote(updated: Note): void {
    const index = notes.value.findIndex((note) => note.uuid === updated.uuid)
    if (index !== -1) {
      notes.value.splice(index, 1, updated)
    }
  }

  async function load(params?: NoteListParams): Promise<void> {
    isLoading.value = true
    error.value = null
    lastParams = params ?? {}
    try {
      const response = await notesApi.fetchNotes(params)
      notes.value = response.data
      meta.value = response.meta
      counts.value = response.meta.counts ?? null
    } catch (e) {
      resolveError(e)
    } finally {
      isLoading.value = false
    }
  }

  /** Убирает заметку из локальной коллекции без запроса к API. */
  function dropLocally(uuid: string): void {
    notes.value = notes.value.filter((note) => note.uuid !== uuid)
  }

  /**
   * Дозагружает следующую страницу заметок (с теми же search/archived, что
   * и последний `load()`) и добавляет её к уже загруженным — в отличие от
   * `load`, которая заменяет коллекцию. Не делает ничего, если страниц
   * больше нет или `load` ещё не вызывалась.
   */
  async function loadMore(): Promise<void> {
    if (meta.value === null || meta.value.current_page >= meta.value.last_page) {
      return
    }
    error.value = null
    try {
      const response = await notesApi.fetchNotes({
        ...lastParams,
        page: meta.value.current_page + 1,
        per_page: meta.value.per_page,
      })
      notes.value = [...notes.value, ...response.data]
      meta.value = response.meta
      counts.value = response.meta.counts ?? counts.value
    } catch (e) {
      resolveError(e)
    }
  }

  async function create(payload: CreateNotePayload): Promise<Note | null> {
    error.value = null
    try {
      const note = await notesApi.createNote(payload)
      notes.value = [note, ...notes.value]
      return note
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  async function update(uuid: string, payload: UpdateNotePayload): Promise<Note | null> {
    error.value = null
    try {
      const note = await notesApi.updateNote(uuid, payload)
      replaceNote(note)
      return note
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  async function remove(uuid: string): Promise<boolean> {
    error.value = null
    try {
      await notesApi.deleteNote(uuid)
      notes.value = notes.value.filter((note) => note.uuid !== uuid)
      return true
    } catch (e) {
      resolveError(e)
      return false
    }
  }

  async function pin(uuid: string, isPinned: boolean): Promise<Note | null> {
    error.value = null
    try {
      const note = await notesApi.togglePin(uuid, isPinned)
      replaceNote(note)
      return note
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  async function archive(uuid: string, isArchived: boolean): Promise<Note | null> {
    error.value = null
    try {
      const note = await notesApi.toggleArchive(uuid, isArchived)
      replaceNote(note)
      return note
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  return { notes, meta, counts, isLoading, error, load, loadMore, create, update, remove, pin, archive, dropLocally }
}
