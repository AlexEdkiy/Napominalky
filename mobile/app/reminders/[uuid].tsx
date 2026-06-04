import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'

import BaseButton from '@/components/common/BaseButton'
import ReminderForm, { type ReminderFormValues } from '@/components/reminders/ReminderForm'
import SnoozeSheet from '@/components/reminders/SnoozeSheet'
import { useReminder, useReminders } from '@/hooks/useReminders'

export default function ReminderDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const reminderUuid = uuid ?? ''
  const { data: reminder, isLoading } = useReminder(reminderUuid)
  const { updateReminder, deleteReminder, completeReminder, snoozeReminder } = useReminders()
  const [snoozeVisible, setSnoozeVisible] = useState(false)

  const handleSubmit = (values: ReminderFormValues): void => {
    updateReminder.mutate({
      uuid: reminderUuid,
      patch: {
        title: values.title,
        remindAt: values.remindAt,
        notes: values.notes.length > 0 ? values.notes : null,
        recurrence: values.recurrence,
      },
    })
  }

  const confirmDelete = (): void => {
    Alert.alert('Удалить напоминание?', 'Действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteReminder.mutate(reminderUuid, { onSuccess: () => router.back() }),
      },
    ])
  }

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.loader} />
  }

  if (!reminder) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>Напоминание не найдено</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Stack.Screen options={{ title: 'Напоминание' }} />
      <ScrollView keyboardShouldPersistTaps="handled">
        <ReminderForm
          initialValues={{
            title: reminder.title,
            notes: reminder.notes ?? '',
            remindAt: reminder.remindAt,
            recurrence: reminder.recurrence,
          }}
          isSaving={updateReminder.isPending}
          onSubmit={handleSubmit}
          onDelete={confirmDelete}
        />
        <View style={styles.extra}>
          {!reminder.isCompleted ? (
            <BaseButton
              label="Выполнить"
              onPress={() => completeReminder.mutate(reminderUuid)}
              loading={completeReminder.isPending}
            />
          ) : null}
          <BaseButton
            label="Отложить"
            variant="secondary"
            onPress={() => setSnoozeVisible(true)}
          />
        </View>
      </ScrollView>
      <SnoozeSheet
        visible={snoozeVisible}
        onClose={() => setSnoozeVisible(false)}
        onSnooze={(iso) => snoozeReminder.mutate({ uuid: reminderUuid, snoozedUntil: iso })}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { marginTop: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: { fontSize: 16, color: '#71717a' },
  extra: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
})
