import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { QueryKeys } from '@/constants/QueryKeys'
import {
  remindersRepo,
  type CreateReminderData,
  type Reminder,
  type ReminderStatus,
  type UpdateReminderPatch,
} from '@/db/repositories/remindersRepo'

interface UseRemindersOptions {
  status?: 'pending' | 'completed'
}

interface UpdateReminderVariables {
  uuid: string
  patch: UpdateReminderPatch
}

interface SnoozeVariables {
  uuid: string
  snoozedUntil: string
}

/** TanStack Query поверх локального remindersRepo (SQLite, local-first). */
export function useReminders(options: UseRemindersOptions = {}) {
  const queryClient = useQueryClient()
  const status: ReminderStatus = options.status ?? 'all'
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: QueryKeys.reminders.all })
  }

  const listParams = options.status ? { status: options.status } : {}
  const query = useQuery<Reminder[]>({
    queryKey: QueryKeys.reminders.list(listParams),
    queryFn: () => remindersRepo.listReminders({ status }),
  })

  const createReminder = useMutation({
    mutationFn: (data: CreateReminderData) => remindersRepo.createReminder(data),
    onSuccess: invalidate,
  })

  const updateReminder = useMutation({
    mutationFn: ({ uuid, patch }: UpdateReminderVariables) =>
      remindersRepo.updateReminder(uuid, patch),
    onSuccess: invalidate,
  })

  const deleteReminder = useMutation({
    mutationFn: (uuid: string) => remindersRepo.deleteReminder(uuid),
    onSuccess: invalidate,
  })

  const completeReminder = useMutation({
    mutationFn: (uuid: string) => remindersRepo.completeReminder(uuid),
    onSuccess: invalidate,
  })

  const snoozeReminder = useMutation({
    mutationFn: ({ uuid, snoozedUntil }: SnoozeVariables) =>
      remindersRepo.snoozeReminder(uuid, snoozedUntil),
    onSuccess: invalidate,
  })

  return {
    reminders: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    createReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    snoozeReminder,
  }
}

/** Загрузка одного напоминания по uuid для экрана редактирования. */
export function useReminder(uuid: string) {
  return useQuery<Reminder | null>({
    queryKey: QueryKeys.reminders.detail(uuid),
    queryFn: () => remindersRepo.getReminderByUuid(uuid),
    enabled: uuid.length > 0,
  })
}
