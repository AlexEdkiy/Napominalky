export interface Note {
  uuid: string
  title: string
  body: string | null
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}
