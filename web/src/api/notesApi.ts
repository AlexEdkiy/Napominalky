import { apiClient } from '@/api/client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { CreateNotePayload, Note, NoteListParams, UpdateNotePayload } from '@/types/note'

function buildQueryParams(params?: NoteListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {}
  if (params?.search) {
    query.search = params.search
  }
  if (params?.archived !== undefined) {
    query['filter[archived]'] = params.archived ? 1 : 0
  }
  if (params?.page !== undefined) {
    query.page = params.page
  }
  if (params?.per_page !== undefined) {
    query.per_page = params.per_page
  }
  return query
}

export const notesApi = {
  fetchNotes: async (params?: NoteListParams): Promise<PaginatedResponse<Note>> => {
    const { data } = await apiClient.get<PaginatedResponse<Note>>('/notes', {
      params: buildQueryParams(params),
    })
    return data
  },

  fetchNote: async (uuid: string): Promise<Note> => {
    const { data } = await apiClient.get<ApiResponse<Note>>(`/notes/${uuid}`)
    return data.data
  },

  createNote: async (payload: CreateNotePayload): Promise<Note> => {
    const { data } = await apiClient.post<ApiResponse<Note>>('/notes', payload)
    return data.data
  },

  updateNote: async (uuid: string, payload: UpdateNotePayload): Promise<Note> => {
    const { data } = await apiClient.put<ApiResponse<Note>>(`/notes/${uuid}`, payload)
    return data.data
  },

  deleteNote: async (uuid: string): Promise<void> => {
    await apiClient.delete(`/notes/${uuid}`)
  },

  togglePin: async (uuid: string, isPinned: boolean): Promise<Note> => {
    const { data } = await apiClient.post<ApiResponse<Note>>(`/notes/${uuid}/pin`, {
      is_pinned: isPinned,
    })
    return data.data
  },

  toggleArchive: async (uuid: string, isArchived: boolean): Promise<Note> => {
    const { data } = await apiClient.post<ApiResponse<Note>>(`/notes/${uuid}/archive`, {
      is_archived: isArchived,
    })
    return data.data
  },
}
