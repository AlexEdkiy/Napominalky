import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { QueryKeys } from '@/constants/QueryKeys'
import {
  notesRepo,
  type CreateNoteData,
  type Note,
  type UpdateNotePatch,
} from '@/db/repositories/notesRepo'

interface UseNotesOptions {
  archived?: boolean
}

interface UpdateNoteVariables {
  uuid: string
  patch: UpdateNotePatch
}

interface ToggleVariables {
  uuid: string
  value: boolean
}

/** TanStack Query поверх локального notesRepo (SQLite, local-first). */
export function useNotes(options: UseNotesOptions = {}) {
  const queryClient = useQueryClient()
  const archived = options.archived ?? false
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: QueryKeys.notes.all })
  }

  const query = useQuery<Note[]>({
    queryKey: QueryKeys.notes.list({ archived }),
    queryFn: () => notesRepo.listNotes({ archived }),
  })

  const createNote = useMutation({
    mutationFn: (data: CreateNoteData) => notesRepo.createNote(data),
    onSuccess: invalidate,
  })

  const updateNote = useMutation({
    mutationFn: ({ uuid, patch }: UpdateNoteVariables) => notesRepo.updateNote(uuid, patch),
    onSuccess: invalidate,
  })

  const deleteNote = useMutation({
    mutationFn: (uuid: string) => notesRepo.deleteNote(uuid),
    onSuccess: invalidate,
  })

  const togglePin = useMutation({
    mutationFn: ({ uuid, value }: ToggleVariables) => notesRepo.togglePin(uuid, value),
    onSuccess: invalidate,
  })

  const toggleArchive = useMutation({
    mutationFn: ({ uuid, value }: ToggleVariables) => notesRepo.toggleArchive(uuid, value),
    onSuccess: invalidate,
  })

  const search = (text: string): Promise<Note[]> => notesRepo.searchNotes(text)

  return {
    notes: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleArchive,
    search,
  }
}

/** Загрузка одной заметки по uuid для экрана редактирования. */
export function useNote(uuid: string) {
  return useQuery<Note | null>({
    queryKey: QueryKeys.notes.detail(uuid),
    queryFn: () => notesRepo.getNoteByUuid(uuid),
    enabled: uuid.length > 0,
  })
}
