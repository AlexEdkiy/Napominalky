import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Reminder } from '@/db/repositories/remindersRepo'
import { chunkWeeks, findWeekIndex, getCalendarDays, sameDay, ymd } from '@/utils/dateRange'
import { typography } from '@/theme/typography'
import DayCell from './DayCell'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

interface MonthGridProps {
  year: number
  month: number
  byDay: Map<string, Reminder[]>
  selectedDate: Date
  /** Свёрнут ли календарь до одной недели (с выбранной датой). */
  collapsed: boolean
  onSelectDay: (date: Date) => void
}

/**
 * Сетка месяца по неделям-строкам. В свёрнутом виде рендерится только
 * строка, содержащая selectedDate; если такой недели нет в текущей сетке
 * (например, после навигации по месяцам без смены выбранной даты) —
 * показывается первая неделя, чтобы карточка не оставалась пустой.
 */
const MonthGrid: React.FC<MonthGridProps> = ({
  year,
  month,
  byDay,
  selectedDate,
  collapsed,
  onSelectDay,
}) => {
  const today = new Date()
  const weeks = chunkWeeks(getCalendarDays(year, month))
  const foundIndex = findWeekIndex(weeks, selectedDate)
  const activeWeekIndex = foundIndex === -1 ? 0 : foundIndex

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
        {weeks.map((week, weekIndex) => {
          if (collapsed && weekIndex !== activeWeekIndex) return null
          return (
            <View key={`week-${week[0] !== undefined ? ymd(week[0].date) : weekIndex}`} style={styles.weekLine}>
              {week.map(({ date, inMonth }) => (
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
          )
        })}
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
  grid: {},
  weekLine: { flexDirection: 'row' },
})

export default MonthGrid
