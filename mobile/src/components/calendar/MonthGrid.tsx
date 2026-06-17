import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Reminder } from '@/db/repositories/remindersRepo'
import { getCalendarDays, sameDay, ymd } from '@/utils/dateRange'
import { typography } from '@/theme/typography'
import DayCell from './DayCell'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

interface MonthGridProps {
  year: number
  month: number
  byDay: Map<string, Reminder[]>
  selectedDate: Date
  onSelectDay: (date: Date) => void
}

const MonthGrid: React.FC<MonthGridProps> = ({
  year,
  month,
  byDay,
  selectedDate,
  onSelectDay,
}) => {
  const today = new Date()
  const days = getCalendarDays(year, month)

  return (
    <View style={styles.container}>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map(({ date, inMonth }) => (
          <DayCell
            key={ymd(date)}
            date={date}
            inMonth={inMonth}
            isToday={sameDay(date, today)}
            isSelected={sameDay(date, selectedDate)}
            count={byDay.get(ymd(date))?.length ?? 0}
            onPress={onSelectDay}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 8, paddingTop: 8 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: {
    flex: 1,
    textAlign: 'center',
    ...typography.sectionLabel,
    color: '#9AA6B2',
    paddingVertical: 6,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
})

export default MonthGrid
