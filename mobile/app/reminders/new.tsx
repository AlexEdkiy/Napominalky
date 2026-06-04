import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import { router, Stack } from 'expo-router'

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Stack.Screen options={{ title: 'Новое напоминание' }} />
      <ScrollView keyboardShouldPersistTaps="handled">
        <ReminderForm
          submitLabel="Создать"
          isSaving={createReminder.isPending}
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
})
