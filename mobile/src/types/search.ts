export type SearchType = 'all' | 'list' | 'item' | 'note' | 'reminder'

export interface SearchResult {
  type: Exclude<SearchType, 'all'>
  uuid: string
  title: string
  excerpt: string
  listUuid: string | null
  listTitle: string | null
  listType: string | null
  isCompleted: boolean
  isArchived: boolean
  updatedAt: string
  matchInComments: boolean
}

export interface SearchPage {
  results: SearchResult[]
  total: number
  page: number
  lastPage: number
}

export interface SearchScope {
  userId: string | null
  guest: boolean
}
