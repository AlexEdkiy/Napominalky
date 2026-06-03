import { ref } from 'vue'

import { notesApi } from '@/api/notesApi'
import type { CreateNotePayload, Note, NoteListParams, UpdateNotePayload } from '@/types/note'

/**
 * Инкапсулирует реактивное состояние списка заметок и операции CRUD.
 * Без внешних query-библиотек — простое состояние на ref + методы.
 */
export function useNotes() {
  const notes = ref<Note[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

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
    try {
      const response = await notesApi.fetchNotes(params)
      notes.value = response.data
    } catch (e) {
      resolveError(e)
    } finally {
      isLoading.value = false
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

  return { notes, isLoading, error, load, create, update, remove, pin, archive }
}
