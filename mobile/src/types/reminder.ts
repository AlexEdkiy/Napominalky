export interface Reminder {
  uuid: string
  title: string
  notes: string | null
  remind_at: string
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly'
  is_completed: boolean
  completed_at: string | null
  snoozed_until: string | null
  source_uuid: string | null
  source_type: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
