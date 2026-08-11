import { Alert } from 'react-native'
import { router } from 'expo-router'

import ReminderForm, { type ReminderFormValues } from '@/components/reminders/ReminderForm'
import { useReminders } from '@/hooks/useReminders'
import { exportReminderToCalendar } from '@/services/systemCalendar'

/**
 * Экспортирует созданное напоминание в календарь и уходит назад только после
 * закрытия алерта — чтобы пользователь увидел результат экспорта.
 */
const exportThenGoBack = async (values: ReminderFormValues): Promise<void> => {
  const eventId = await exportReminderToCalendar({
    title: values.title,
    notes: values.notes.length > 0 ? values.notes : null,
    remind_at: values.remindAt,
  })
  Alert.alert(
    eventId ? 'Добавлено в календарь' : 'Не удалось',
    eventId ? 'Напоминание экспортировано.' : 'Нет разрешения или произошла ошибка.',
    [{ text: 'OK', onPress: () => router.back() }],
  )
}

export default function NewReminderScreen() {
  const { createReminder } = useReminders()

  const handleCreated = (values: ReminderFormValues): void => {
    if (values.exportToCalendar) {
      void exportThenGoBack(values)
      return
    }
    router.back()
  }

  const handleSubmit = (values: ReminderFormValues): void => {
    createReminder.mutate(
      {
        title: values.title,
        remindAt: values.remindAt,
        notes: values.notes.length > 0 ? values.notes : null,
        recurrence: values.recurrence,
      },
      { onSuccess: () => handleCreated(values) },
    )
  }

  return (
    <ReminderForm
      submitLabel="Создать"
      isSaving={createReminder.isPending}
      onSubmit={handleSubmit}
      onBack={() => router.back()}
    />
  )
}
