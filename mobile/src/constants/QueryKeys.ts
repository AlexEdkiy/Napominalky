interface ReminderListParams {
  status?: 'pending' | 'completed'
  sort?: 'remind_at'
  order?: 'asc' | 'desc'
}

interface NoteListParams {
  archived?: boolean
  search?: string
  sort?: string
}

export const QueryKeys = {
  reminders: {
    all: ['reminders'] as const,
    list: (params: ReminderListParams) => ['reminders', 'list', params] as const,
    detail: (uuid: string) => ['reminders', uuid] as const,
  },
  notes: {
    all: ['notes'] as const,
    list: (params: NoteListParams) => ['notes', 'list', params] as const,
    detail: (uuid: string) => ['notes', uuid] as const,
  },
  shoppingLists: {
    all: ['shopping-lists'] as const,
    detail: (uuid: string) => ['shopping-lists', uuid] as const,
    items: (listUuid: string) => ['shopping-lists', listUuid, 'items'] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  sync: {
    conflicts: ['sync', 'conflicts'] as const,
  },
} as const
