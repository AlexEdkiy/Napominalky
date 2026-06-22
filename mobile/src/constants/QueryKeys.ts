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

interface ListParams {
  search?: string
  sort?: string
}

export const QueryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  reminders: {
    all: ['reminders'] as const,
    list: (params: ReminderListParams) => ['reminders', 'list', params] as const,
    missed: ['reminders', 'missed'] as const,
    detail: (uuid: string) => ['reminders', uuid] as const,
  },
  notes: {
    all: ['notes'] as const,
    list: (params: NoteListParams) => ['notes', 'list', params] as const,
    detail: (uuid: string) => ['notes', uuid] as const,
  },
  lists: {
    all: ['shopping-lists'] as const,
    list: (params: ListParams) => ['shopping-lists', 'list', params] as const,
    detail: (uuid: string) => ['shopping-lists', uuid] as const,
    items: (listUuid: string) => ['shopping-lists', listUuid, 'items'] as const,
    nearestDeadlines: ['shopping-lists', 'nearest-deadlines'] as const,
  },
  sync: {
    conflicts: ['sync', 'conflicts'] as const,
    changes: (cursor: number) => ['sync', 'changes', cursor] as const,
  },
  calendar: {
    all: ['calendar'] as const,
    range: (from: string, to: string) => ['calendar', from, to] as const,
  },
} as const
