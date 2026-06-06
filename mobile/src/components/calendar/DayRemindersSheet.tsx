import React from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import type { Reminder } from '@/db/repositories/remindersRepo'
import { formatTime } from '@/utils/datetime'
import { formatDateTitle } from '@/utils/dateRange'

interface DayRemindersSheetProps {
  date: Date
  reminders: Reminder[]
  onOpenReminder: (uuid: string) => void
}

const ReminderRow: React.FC<{ reminder: Reminder; onPress: (uuid: string) => void }> = ({
  reminder,
  onPress,
}) => {
  const title = reminder.title.trim().length > 0 ? reminder.title : 'Без названия'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(reminder.uuid)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.time}>{formatTime(reminder.remindAt)}</Text>
      <Text numberOfLines={1} style={styles.rowTitle}>
        {title}
      </Text>
    </Pressable>
  )
}

const DayRemindersSheet: React.FC<DayRemindersSheetProps> = ({
  date,
  reminders,
  onOpenReminder,
}) => (
  <View style={styles.container}>
    <Text style={styles.heading}>{formatDateTitle(date)}</Text>
    <FlatList
      data={reminders}
      keyExtractor={(item) => item.uuid}
      renderItem={({ item }) => <ReminderRow reminder={item} onPress={onOpenReminder} />}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>На этот день напоминаний нет</Text>}
    />
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  heading: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', paddingHorizontal: 16 },
  list: { padding: 16, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 14,
  },
  pressed: { opacity: 0.85 },
  time: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  rowTitle: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  empty: { textAlign: 'center', color: '#71717a', paddingTop: 24, fontSize: 14 },
})

export default DayRemindersSheet
