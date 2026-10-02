export type SearchType = 'all' | 'list' | 'item' | 'note' | 'reminder'

export interface SearchResult {
  type: Exclude<SearchType, 'all'>
  uuid: string
  title: string
  excerpt: string
  list_uuid: string | null
  list_title: string | null
  list_type: 'tasks' | 'goods' | null
  is_completed: boolean
  is_archived: boolean
  updated_at: string
}
