import React from 'react'
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import type { Reminder } from '@/db/repositories/remindersRepo'
import { formatTime } from '@/utils/datetime'
import { formatDateTitle } from '@/utils/dateRange'
import { typography } from '@/theme/typography'

interface DayRemindersSheetProps {
  date: Date
  reminders: Reminder[]
  onOpenReminder: (uuid: string) => void
}

interface ReminderRowProps {
  reminder: Reminder
  onPress: (uuid: string) => void
}

const ReminderRow: React.FC<ReminderRowProps> = ({ reminder, onPress }) => {
  const title = reminder.title.trim().length > 0 ? reminder.title : 'Без названия'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(reminder.uuid)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.timeCol}>
        <Text style={styles.time}>{formatTime(reminder.remindAt)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.contentCol}>
        <Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowType}>Напоминание</Text>
      </View>
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
      renderItem={({ item }) => (
        <ReminderRow reminder={item} onPress={onOpenReminder} />
      )}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>На этот день напоминаний нет</Text>
      }
    />
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  heading: {
    ...typography.screenTitle,
    fontSize: 20,
    color: '#1B2733',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  pressed: { opacity: 0.85 },
  timeCol: { minWidth: 48, alignItems: 'center' },
  time: { ...typography.timeLabel, color: '#0D9488' },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#EFF3F6',
    borderRadius: 1,
  },
  contentCol: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: '#1B2733', fontWeight: '600' },
  rowType: { ...typography.bodySm, color: '#76828F' },
  empty: {
    textAlign: 'center',
    ...typography.body,
    color: '#9AA6B2',
    paddingTop: 24,
  },
})

export default DayRemindersSheet
