/**
 * Цвет стикера заметки — бэкенд принимает только эти 4 значения (nullable).
 * См. `App\Http\Requests\Note\StoreNoteRequest`/`UpdateNoteRequest`.
 */
export type NoteColor = 'teal' | 'coral' | 'amber' | 'purple'

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
