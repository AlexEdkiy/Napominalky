export type SyncEntityType = 'note' | 'shopping_list' | 'shopping_list_item' | 'reminder'
export type SyncOperation = 'create' | 'update' | 'delete'

export interface SyncChange {
  entity_type: SyncEntityType
  uuid: string
  operation: SyncOperation
  payload: Record<string, unknown>
  updated_at: string
}

export interface SyncChangesResponse {
  data: {
    notes: unknown[]
    shopping_lists: unknown[]
    shopping_list_items: unknown[]
    reminders: unknown[]
  }
  meta: {
    cursor: number
    has_more: boolean
  }
}

export interface SyncPushResponse {
  data: {
    applied: string[]
    conflicts: SyncConflict[]
    cursor: number
  }
}

export interface SyncConflict {
  uuid: string
  entity_type: SyncEntityType
  entity_uuid: string
  server_payload: Record<string, unknown>
  client_payload: Record<string, unknown>
  resolved_at: string | null
}
