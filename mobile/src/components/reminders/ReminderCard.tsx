import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { formatDateTime } from '@/utils/datetime'
import type { Reminder } from '@/db/repositories/remindersRepo'

interface ReminderCardProps {
  reminder: Reminder
  onPress: (uuid: string) => void
}

const ReminderCard: React.FC<ReminderCardProps> = ({ reminder, onPress }) => {
  const title = reminder.title.trim().length > 0 ? reminder.title : 'Без названия'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(reminder.uuid)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text numberOfLines={1} style={[styles.title, reminder.isCompleted && styles.done]}>
          {title}
        </Text>
        {reminder.isCompleted ? <Text style={styles.badge}>Выполнено</Text> : null}
      </View>
      <Text style={styles.time}>{formatDateTime(reminder.remindAt)}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 16,
    gap: 6,
  },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  done: { textDecorationLine: 'line-through', color: '#9a9a9a' },
  badge: { fontSize: 12, color: '#16a34a', marginLeft: 8 },
  time: { fontSize: 14, color: '#71717a' },
})

export default ReminderCard
