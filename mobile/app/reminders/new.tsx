import { router } from 'expo-router'

import ReminderForm, { type ReminderFormValues } from '@/components/reminders/ReminderForm'
import { useReminders } from '@/hooks/useReminders'

export default function NewReminderScreen() {
  const { createReminder } = useReminders()

  const handleSubmit = (values: ReminderFormValues): void => {
    createReminder.mutate(
      {
        title: values.title,
        remindAt: values.remindAt,
        notes: values.notes.length > 0 ? values.notes : null,
        recurrence: values.recurrence,
      },
      { onSuccess: (reminder) => router.replace(`/reminders/${reminder.uuid}`) },
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
