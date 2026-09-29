import type { PaginatedResponse, PaginationMeta } from '@/types/api'

/**
 * Цвет стикера заметки — единая палитра веб + мобилка (WEB-52 / MBE-23):
 * 4 именованных токена веб-ЛК и 4 hex-токена мобильного приложения.
 * Бэкенд (`App\Support\NoteColor`) принимает ровно эти 8 значений (nullable).
 */
export type NoteColor =
  | 'teal'
  | 'coral'
  | 'amber'
  | 'purple'
  | '#ea899a'
  | '#ffebb8'
  | '#91d177'
  | '#afdafc'

/** Счётчики переключателя «Активные / Архив» (meta.counts списка заметок). */
export interface NotesCounts {
  active: number
  archived: number
}

/**
 * Заметка — зеркало NoteResource (snake_case).
 */
export interface Note {
  uuid: string
  title: string
  body: string | null
  color: NoteColor | null
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

/**
 * Полезная нагрузка создания заметки (POST /notes).
 * `uuid` опционален — клиент может задать его для офлайн-синхронизации.
 */
export interface CreateNotePayload {
  title: string
  body?: string | null
  color?: NoteColor | null
  uuid?: string
  is_pinned?: boolean
  is_archived?: boolean
}

/**
 * Полезная нагрузка частичного обновления заметки (PUT /notes/{uuid}).
 */
export interface UpdateNotePayload {
  title?: string
  body?: string | null
  color?: NoteColor | null
  is_pinned?: boolean
  is_archived?: boolean
}

/**
 * Параметры запроса списка заметок (GET /notes).
 */
export interface NoteListParams {
  search?: string
  archived?: boolean
  page?: number
  per_page?: number
}

/**
 * Ответ GET /notes: пагинация + счётчики активных/архивных по текущему поиску.
 */
export interface NotesResponse extends PaginatedResponse<Note> {
  meta: PaginationMeta & { counts?: NotesCounts }
}
