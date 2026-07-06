import React from 'react'
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import type { Reminder } from '@/db/repositories/remindersRepo'
import { formatTime } from '@/utils/datetime'
import { formatDateTitle } from '@/utils/dateRange'
import { pluralizeEvents } from '@/utils/pluralize'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

interface DayRemindersSheetProps {
  date: Date
  reminders: Reminder[]
  onOpenReminder: (uuid: string) => void
}

interface ReminderRowProps {
  reminder: Reminder
  timeColor: string
  dotColor: string
  onPress: (uuid: string) => void
}

const ReminderRow: React.FC<ReminderRowProps> = ({ reminder, timeColor, dotColor, onPress }) => {
  const title = reminder.title.trim().length > 0 ? reminder.title : 'Без названия'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(reminder.uuid)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.timeCol}>
        <Text style={[styles.time, { color: timeColor }]}>{formatTime(reminder.remindAt)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.contentCol}>
        <Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowType}>Напоминание</Text>
      </View>
      <View testID={`row-dot-${reminder.uuid}`} style={[styles.dot, { backgroundColor: dotColor }]} />
    </Pressable>
  )
}

const DayRemindersSheet: React.FC<DayRemindersSheetProps> = ({
  date,
  reminders,
  onOpenReminder,
}) => {
  const { colors } = useTheme()

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>{formatDateTitle(date)}</Text>
        <Text style={[styles.countLabel, { color: colors.accent }]}>
          {pluralizeEvents(reminders.length)}
        </Text>
      </View>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => (
          <ReminderRow
            reminder={item}
            timeColor={colors.accent}
            dotColor={colors.amber}
            onPress={onOpenReminder}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Нет событий</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  heading: {
    ...typography.h1,
    fontSize: 20,
    fontWeight: '900',
    color: '#1B2733',
  },
  countLabel: {
    ...typography.bodySm,
    fontSize: 13,
    fontWeight: '700',
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
  time: { ...typography.timeLabel, fontSize: 16, fontWeight: '900' },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#EFF3F6',
    borderRadius: 1,
  },
  contentCol: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: '#1B2733', fontWeight: '600' },
  rowType: { ...typography.bodySm, color: '#76828F' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empty: {
    textAlign: 'center',
    ...typography.body,
    color: '#9AA6B2',
    paddingTop: 24,
  },
})

export default DayRemindersSheet
