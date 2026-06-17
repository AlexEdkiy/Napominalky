import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { formatDateTime } from '@/utils/datetime'
import { typography } from '@/theme/typography'
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
        {reminder.isCompleted ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Выполнено</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.time}>{formatDateTime(reminder.remindAt)}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    gap: 6,
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    ...typography.cardTitle,
    color: '#1B2733',
  },
  done: { textDecorationLine: 'line-through', color: '#9AA6B2' },
  badge: {
    backgroundColor: '#DDF1ED',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  badgeText: { ...typography.bodySm, color: '#0D9488', fontWeight: '600' },
  time: { ...typography.body, color: '#76828F' },
})

export default ReminderCard
