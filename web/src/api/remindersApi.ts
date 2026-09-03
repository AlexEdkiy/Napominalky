import { apiClient } from '@/api/client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  CreateReminderPayload,
  Reminder,
  ReminderListParams,
  SnoozeOption,
  UpdateReminderPayload,
} from '@/types/reminder'

function buildQueryParams(params?: ReminderListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {}
  if (params?.status !== undefined) {
    query['filter[status]'] = params.status
  }
  if (params?.sort !== undefined) {
    query.sort = params.sort
  }
  if (params?.order !== undefined) {
    query.order = params.order
  }
  if (params?.page !== undefined) {
    query.page = params.page
  }
  if (params?.per_page !== undefined) {
    query.per_page = params.per_page
  }
  return query
}

export const remindersApi = {
  fetchReminders: async (params?: ReminderListParams): Promise<PaginatedResponse<Reminder>> => {
    const { data } = await apiClient.get<PaginatedResponse<Reminder>>('/reminders', {
      params: buildQueryParams(params),
    })
    return data
  },

  fetchReminder: async (uuid: string): Promise<Reminder> => {
    const { data } = await apiClient.get<ApiResponse<Reminder>>(`/reminders/${uuid}`)
    return data.data
  },

  createReminder: async (payload: CreateReminderPayload): Promise<Reminder> => {
    const { data } = await apiClient.post<ApiResponse<Reminder>>('/reminders', payload)
    return data.data
  },

  updateReminder: async (uuid: string, payload: UpdateReminderPayload): Promise<Reminder> => {
    const { data } = await apiClient.put<ApiResponse<Reminder>>(`/reminders/${uuid}`, payload)
    return data.data
  },

  deleteReminder: async (uuid: string): Promise<void> => {
    await apiClient.delete(`/reminders/${uuid}`)
  },

  completeReminder: async (uuid: string): Promise<Reminder> => {
    const { data } = await apiClient.post<ApiResponse<Reminder>>(`/reminders/${uuid}/complete`, {})
    return data.data
  },

  snoozeReminder: async (uuid: string, snooze: SnoozeOption): Promise<Reminder> => {
    const { data } = await apiClient.post<ApiResponse<Reminder>>(`/reminders/${uuid}/snooze`, {
      snooze,
    })
    return data.data
  },

  /** Откладывание до своего времени: POST {snoozed_until: ISO} (строго в будущем). */
  snoozeReminderUntil: async (uuid: string, snoozedUntilIso: string): Promise<Reminder> => {
    const { data } = await apiClient.post<ApiResponse<Reminder>>(`/reminders/${uuid}/snooze`, {
      snoozed_until: snoozedUntilIso,
    })
    return data.data
  },
}
