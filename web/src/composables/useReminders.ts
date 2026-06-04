import { ref } from 'vue'

import { remindersApi } from '@/api/remindersApi'
import type {
  CreateReminderPayload,
  Reminder,
  ReminderListParams,
  SnoozeOption,
  UpdateReminderPayload,
} from '@/types/reminder'

/**
 * Инкапсулирует реактивное состояние списка напоминаний и операции CRUD.
 * Без внешних query-библиотек — простое состояние на ref + методы.
 */
export function useReminders() {
  const reminders = ref<Reminder[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function resolveError(e: unknown): void {
    error.value = e instanceof Error ? e.message : 'Не удалось выполнить операцию'
  }

  function replaceReminder(updated: Reminder): void {
    const index = reminders.value.findIndex((item) => item.uuid === updated.uuid)
    if (index !== -1) {
      reminders.value.splice(index, 1, updated)
    }
  }

  async function load(params?: ReminderListParams): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await remindersApi.fetchReminders(params)
      reminders.value = response.data
    } catch (e) {
      resolveError(e)
    } finally {
      isLoading.value = false
    }
  }

  async function create(payload: CreateReminderPayload): Promise<Reminder | null> {
    error.value = null
    try {
      const reminder = await remindersApi.createReminder(payload)
      reminders.value = [reminder, ...reminders.value]
      return reminder
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  async function update(uuid: string, payload: UpdateReminderPayload): Promise<Reminder | null> {
    error.value = null
    try {
      const reminder = await remindersApi.updateReminder(uuid, payload)
      replaceReminder(reminder)
      return reminder
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  async function remove(uuid: string): Promise<boolean> {
    error.value = null
    try {
      await remindersApi.deleteReminder(uuid)
      reminders.value = reminders.value.filter((item) => item.uuid !== uuid)
      return true
    } catch (e) {
      resolveError(e)
      return false
    }
  }

  async function complete(uuid: string): Promise<Reminder | null> {
    error.value = null
    try {
      const reminder = await remindersApi.completeReminder(uuid)
      replaceReminder(reminder)
      return reminder
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  async function snooze(uuid: string, option: SnoozeOption): Promise<Reminder | null> {
    error.value = null
    try {
      const reminder = await remindersApi.snoozeReminder(uuid, option)
      replaceReminder(reminder)
      return reminder
    } catch (e) {
      resolveError(e)
      return null
    }
  }

  return { reminders, isLoading, error, load, create, update, remove, complete, snooze }
}
