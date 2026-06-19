import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import { router } from 'expo-router'

import ReminderForm, { type ReminderFormValues } from '@/components/reminders/ReminderForm'
import { useReminders } from '@/hooks/useReminders'
import { useTheme } from '@/theme'

export default function NewReminderScreen() {
  const { colors } = useTheme()
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
      style={[styles.container, { backgroundColor: colors.screenBg }]}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <ReminderForm
          submitLabel="Создать"
          isSaving={createReminder.isPending}
          onSubmit={handleSubmit}
          onBack={() => router.back()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1 },
})
