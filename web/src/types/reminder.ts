/**
 * Тип повторения напоминания.
 */
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly'

/**
 * Допустимые интервалы откладывания (snooze).
 */
export type SnoozeOption = '10m' | '1h'

/**
 * Статус-фильтр списка напоминаний (GET /reminders).
 */
export type ReminderStatusFilter = 'pending' | 'completed' | 'all'

/**
 * Напоминание — зеркало ReminderResource (snake_case).
 */
export interface Reminder {
  uuid: string
  title: string
  notes: string | null
  remind_at: string
  recurrence: RecurrenceType
  is_completed: boolean
  completed_at: string | null
  snoozed_until: string | null
  source_uuid: string | null
  source_type: string | null
  created_at: string
  updated_at: string
}

/**
 * Полезная нагрузка создания напоминания (POST /reminders).
 * `uuid` опционален — клиент может задать его для офлайн-синхронизации.
 */
export interface CreateReminderPayload {
  title: string
  notes?: string | null
  remind_at: string
  recurrence?: RecurrenceType
  uuid?: string
}

/**
 * Полезная нагрузка частичного обновления напоминания (PUT /reminders/{uuid}).
 */
export interface UpdateReminderPayload {
  title?: string
  notes?: string | null
  remind_at?: string
  recurrence?: RecurrenceType
}

/**
 * Параметры запроса списка напоминаний (GET /reminders).
 */
export interface ReminderListParams {
  status?: ReminderStatusFilter
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}
