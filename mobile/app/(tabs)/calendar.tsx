import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import DayRemindersSheet from '@/components/calendar/DayRemindersSheet'
import MonthGrid from '@/components/calendar/MonthGrid'
import { useCalendar } from '@/hooks/useCalendar'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { formatMonthTitle, ymd } from '@/utils/dateRange'

const startOfMonth = (date: Date): { year: number; month: number } => ({
  year: date.getFullYear(),
  month: date.getMonth(),
})

export default function CalendarScreen() {
  const { colors } = useTheme()
  const [{ year, month }, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const { byDay } = useCalendar(year, month)

  const stepMonth = (delta: number): void => {
    const next = new Date(year, month + delta, 1)
    setMonth(startOfMonth(next))
  }

  const dayReminders = byDay.get(ymd(selectedDate)) ?? []

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.screenBg }]}>
      <View style={[styles.calCard, { backgroundColor: colors.surface }]}>
        <View style={styles.calHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Предыдущий месяц"
            onPress={() => stepMonth(-1)}
            style={styles.arrowBtn}
          >
            <Ionicons name="chevron-back" size={20} color="#3D4A57" />
          </Pressable>
          <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
            {formatMonthTitle(year, month)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Следующий месяц"
            onPress={() => stepMonth(1)}
            style={styles.arrowBtn}
          >
            <Ionicons name="chevron-forward" size={20} color="#3D4A57" />
          </Pressable>
        </View>

        <MonthGrid
          year={year}
          month={month}
          byDay={byDay}
          selectedDate={selectedDate}
          onSelectDay={setSelectedDate}
        />
      </View>

      <DayRemindersSheet
        date={selectedDate}
        reminders={dayReminders}
        onOpenReminder={(uuid) => router.push(`/reminders/${uuid}`)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  calCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    paddingBottom: 12,
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F4F7F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    ...typography.screenTitle,
    fontSize: 18,
  },
})
