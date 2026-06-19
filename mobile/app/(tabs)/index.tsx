import React, { useState, useMemo } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import FeedCard from '@/components/home/FeedCard'
import FeedSection from '@/components/home/FeedSection'
import FilterChips, { type FeedFilter } from '@/components/home/FilterChips'
import { useNotes } from '@/hooks/useNotes'
import { useReminders } from '@/hooks/useReminders'
import { useShoppingLists } from '@/hooks/useShoppingLists'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { formatRelativeReminder, formatUpdatedAt, isReminderUrgent } from '@/utils/datetime'
import type { Note } from '@/db/repositories/notesRepo'
import type { Reminder } from '@/db/repositories/remindersRepo'
import type { ShoppingList } from '@/db/repositories/shoppingListsRepo'

const filterByTitle = <T extends { title: string }>(items: T[], q: string): T[] => {
  const query = q.trim().toLowerCase()
  if (query.length === 0) return items
  return items.filter((i) => i.title.toLowerCase().includes(query))
}

const listSubtitle = (list: ShoppingList): string => {
  if (list.itemsCount === 0) return 'Список'
  return `${list.itemsCount} пунктов · ${list.checkedItemsCount} куплено`
}

export default function HomeScreen() {
  const { colors } = useTheme()
  const { notes, isLoading: notesLoading } = useNotes()
  const { reminders, isLoading: remindersLoading } = useReminders({ status: 'pending' })
  const { lists, isLoading: listsLoading } = useShoppingLists()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FeedFilter>('all')

  const isLoading = notesLoading || remindersLoading || listsLoading

  const filteredNotes = useMemo(() => filterByTitle(notes, search), [notes, search])
  const filteredReminders = useMemo(() => filterByTitle(reminders, search), [reminders, search])
  const filteredLists = useMemo(() => filterByTitle(lists, search), [lists, search])

  const showLists = filter === 'all' || filter === 'lists'
  const showReminders = filter === 'all' || filter === 'reminders'
  const showNotes = filter === 'all' || filter === 'notes'

  const hasContent =
    (showLists && filteredLists.length > 0) ||
    (showReminders && filteredReminders.length > 0) ||
    (showNotes && filteredNotes.length > 0)

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.screenBg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Главная</Text>
      </View>

      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.borderInput }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          accessibilityLabel="Поиск"
          placeholder="Поиск"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
      </View>

      <FilterChips active={filter} onSelect={setFilter} colors={colors} />

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {showLists && filteredLists.length > 0 && (
            <FeedSection title="Списки" count={filteredLists.length} dotColor={colors.accent} colors={colors}>
              {filteredLists.map((list: ShoppingList) => (
                <FeedCard
                  key={list.uuid}
                  uuid={list.uuid}
                  title={list.title}
                  subtitle={listSubtitle(list)}
                  iconName="checkmark-done"
                  iconColor={colors.accent}
                  iconBg={colors.accentSoftBg}
                  onPress={(uuid) => router.push(`/lists/${uuid}`)}
                  colors={colors}
                />
              ))}
            </FeedSection>
          )}

          {showReminders && filteredReminders.length > 0 && (
            <FeedSection title="Напоминания" count={filteredReminders.length} dotColor={colors.amber} colors={colors}>
              {filteredReminders.map((reminder: Reminder) => (
                <FeedCard
                  key={reminder.uuid}
                  uuid={reminder.uuid}
                  title={reminder.title}
                  subtitle={formatRelativeReminder(reminder.remindAt)}
                  subtitleColor={isReminderUrgent(reminder.remindAt) ? colors.amber : undefined}
                  iconName="alarm"
                  iconColor={colors.amber}
                  iconBg={colors.amberBg}
                  onPress={(uuid) => router.push(`/reminders/${uuid}`)}
                  colors={colors}
                />
              ))}
            </FeedSection>
          )}

          {showNotes && filteredNotes.length > 0 && (
            <FeedSection title="Заметки" count={filteredNotes.length} dotColor={colors.noteBlue} colors={colors}>
              {filteredNotes.map((note: Note) => (
                <FeedCard
                  key={note.uuid}
                  uuid={note.uuid}
                  title={note.title.trim().length > 0 ? note.title : 'Без названия'}
                  subtitle={formatUpdatedAt(note.updatedAt)}
                  iconName="document-text"
                  iconColor={colors.noteBlue}
                  iconBg={colors.noteBlueBg}
                  onPress={(uuid) => router.push(`/notes/${uuid}`)}
                  colors={colors}
                />
              ))}
            </FeedSection>
          )}

          {!hasContent && (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                {search.length > 0 ? 'Ничего не найдено' : 'Пока нет записей'}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                {search.length > 0
                  ? 'Попробуйте изменить запрос или фильтр'
                  : 'Нажмите «+», чтобы создать первую запись'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  title: {
    ...typography.h2,
    fontWeight: '900',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 26,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, ...typography.body, paddingVertical: 0 },
  loader: { marginTop: 40 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 20,
  },
  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { ...typography.cardTitle },
  emptyHint: { ...typography.body, textAlign: 'center' },
})
