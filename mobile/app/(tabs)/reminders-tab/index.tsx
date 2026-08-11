import { useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'

import DarkHeader from '@/components/ui/DarkHeader'
import ReminderListItem from '@/components/reminders/ReminderListItem'
import ReminderSegmentedFilter, {
  type ReminderSegment,
} from '@/components/reminders/ReminderSegmentedFilter'
import { useReminders } from '@/hooks/useReminders'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { groupPlanned, overdueLabel, splitByOverdue } from '@/utils/reminderGrouping'
import type { Reminder } from '@/db/repositories/remindersRepo'

interface ListSection {
  title: string
  data: Reminder[]
}

const EMPTY_TEXT: Record<ReminderSegment, { title: string; hint: string }> = {
  overdue: { title: 'Нет просроченных', hint: 'Все напоминания под контролем' },
  planned: { title: 'Ничего не запланировано', hint: 'Создайте напоминание кнопкой «+»' },
}

const filterByTitle = (items: Reminder[], q: string): Reminder[] => {
  const query = q.trim().toLowerCase()
  if (query.length === 0) return items
  return items.filter((i) => i.title.toLowerCase().includes(query))
}

export default function RemindersScreen(): React.JSX.Element {
  const { colors } = useTheme()
  const [segment, setSegment] = useState<ReminderSegment>('overdue')
  const [search, setSearch] = useState('')
  const { reminders, isLoading, completeReminder } = useReminders({ status: 'pending' })

  const now = new Date()
  const { overdue, planned } = splitByOverdue(filterByTitle(reminders, search), now)
  // По макету над карточками просроченных есть секционный лейбл «ПРОСРОЧЕННЫЕ»
  // (uppercase даёт typography.sectionLabel).
  const sections: ListSection[] = segment === 'overdue'
    ? (overdue.length > 0 ? [{ title: 'Просроченные', data: overdue }] : [])
    : groupPlanned(planned, now)
  const empty = EMPTY_TEXT[segment]

  const handleOpen = (uuid: string): void => {
    router.push(`/reminders/${uuid}`)
  }

  const handleComplete = (uuid: string): void => {
    completeReminder.mutate(uuid)
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBg }]}>
      <StatusBar style="light" />
      <DarkHeader
        title="Напоминания"
        onAvatarPress={() => router.push('/(tabs)/profile')}
        collapsibleSearch
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Открыть календарь"
        onPress={() => router.push('/reminders-tab/calendar')}
        style={({ pressed }) => [
          styles.calendarLink,
          { backgroundColor: colors.surface },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.calendarIcon, { backgroundColor: colors.accentSoftBg }]}>
          <Ionicons name="calendar" size={18} color={colors.accent} />
        </View>
        <Text style={[styles.calendarLinkText, { color: colors.textPrimary }]}>
          Открыть календарь
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>

      <View style={styles.filterWrap}>
        <ReminderSegmentedFilter
          active={segment}
          overdueCount={overdue.length}
          plannedCount={planned.length}
          onChange={setSegment}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.uuid}
          renderItem={({ item }) => (
            <ReminderListItem
              reminder={item}
              overdueText={segment === 'overdue' ? overdueLabel(item.remindAt, now) : null}
              onPress={handleOpen}
              onComplete={handleComplete}
            />
          )}
          renderSectionHeader={({ section }) => (
            section.title.length > 0 ? (
              <Text
                testID="reminders-section-title"
                style={[styles.sectionTitle, { color: colors.textSecondary }]}
              >
                {section.title}
              </Text>
            ) : null
          )}
          stickySectionHeadersEnabled={false}
          // Секций мало и карточки лёгкие: рендерим первую порцию целиком,
          // чтобы «Позже» не появлялась с задержкой при переключении сегмента.
          initialNumToRender={24}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {empty.title}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                {empty.hint}
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pressed: { opacity: 0.85 },
  calendarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  calendarIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarLinkText: { ...typography.bodyMd, fontWeight: '700', flex: 1 },
  filterWrap: { marginHorizontal: 16, marginTop: 12 },
  loader: { marginTop: 32 },
  listContent: { padding: 16, paddingBottom: 96, gap: 10 },
  sectionTitle: {
    ...typography.sectionLabel,
    marginTop: 8,
    marginBottom: 2,
  },
  empty: { alignItems: 'center', paddingTop: 56, gap: 8 },
  emptyTitle: { ...typography.cardTitle },
  emptyHint: { ...typography.body },
})
