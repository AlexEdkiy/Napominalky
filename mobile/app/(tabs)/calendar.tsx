import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import DayRemindersSheet from '@/components/calendar/DayRemindersSheet'
import MonthGrid from '@/components/calendar/MonthGrid'
import { useCalendar } from '@/hooks/useCalendar'
import { formatMonthTitle, ymd } from '@/utils/dateRange'

const startOfMonth = (date: Date): { year: number; month: number } => ({
  year: date.getFullYear(),
  month: date.getMonth(),
})

export default function CalendarScreen() {
  const [{ year, month }, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const { byDay } = useCalendar(year, month)

  const stepMonth = (delta: number): void => {
    const next = new Date(year, month + delta, 1)
    setMonth(startOfMonth(next))
  }

  const dayReminders = byDay.get(ymd(selectedDate)) ?? []

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Предыдущий месяц"
          onPress={() => stepMonth(-1)}
          style={styles.arrow}
        >
          <Text style={styles.arrowIcon}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{formatMonthTitle(year, month)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Следующий месяц"
          onPress={() => stepMonth(1)}
          style={styles.arrow}
        >
          <Text style={styles.arrowIcon}>›</Text>
        </Pressable>
      </View>

      <MonthGrid
        year={year}
        month={month}
        byDay={byDay}
        selectedDate={selectedDate}
        onSelectDay={setSelectedDate}
      />

      <DayRemindersSheet
        date={selectedDate}
        reminders={dayReminders}
        onOpenReminder={(uuid) => router.push(`/reminders/${uuid}`)}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Создать напоминание"
        onPress={() => router.push('/reminders/new')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  arrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  arrowIcon: { fontSize: 28, color: '#2563eb', lineHeight: 30 },
  monthTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: { opacity: 0.85 },
  fabIcon: { color: '#fff', fontSize: 32, lineHeight: 36 },
})
