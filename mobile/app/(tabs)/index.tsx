import React, { useState, useMemo, useCallback } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import DarkHeader from '@/components/ui/DarkHeader'
import FeedCard from '@/components/home/FeedCard'
import FeedSection from '@/components/home/FeedSection'
import FilterChips, { type FeedFilter } from '@/components/home/FilterChips'
import { useNotes } from '@/hooks/useNotes'
import { useReminders } from '@/hooks/useReminders'
import { useShoppingLists } from '@/hooks/useShoppingLists'
import { useSyncEngine } from '@/hooks/useSyncEngine'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { formatRelativeReminder, formatUpdatedAt, isReminderUrgent } from '@/utils/datetime'
import { listStatusLabel } from '@/utils/lists'
import { sortNotesPinnedFirst } from '@/utils/notes'
import type { Note } from '@/db/repositories/notesRepo'
import type { Reminder } from '@/db/repositories/remindersRepo'
import type { ShoppingList } from '@/db/repositories/shoppingListsRepo'

const filterByTitle = <T extends { title: string }>(items: T[], q: string): T[] => {
  const query = q.trim().toLowerCase()
  if (query.length === 0) return items
  return items.filter((i) => i.title.toLowerCase().includes(query))
}

const listIconName = (list: ShoppingList): 'bag-handle' | 'list' =>
  list.type === 'tasks' ? 'list' : 'bag-handle'

const listAccentColor = (
  list: ShoppingList,
  colors: { accent: string; amber: string },
): string => (list.type === 'tasks' ? colors.amber : colors.accent)

export default function HomeScreen(): React.JSX.Element {
  const { colors } = useTheme()
  const { notes, isLoading: notesLoading, deleteNote } = useNotes()
  const { reminders, isLoading: remindersLoading } = useReminders({ status: 'pending' })
  const { lists, isLoading: listsLoading } = useShoppingLists()
  const { isSyncing, syncNow } = useSyncEngine()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FeedFilter>('all')

  const handleNoteLongPress = useCallback(
    (noteUuid: string): void => {
      Alert.alert('Удалить заметку?', 'Действие нельзя отменить.', [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => deleteNote.mutate(noteUuid),
        },
      ])
    },
    [deleteNote],
  )

  const handleAvatarPress = useCallback((): void => {
    router.push('/(tabs)/profile')
  }, [])

  const isLoading = notesLoading || remindersLoading || listsLoading

  const filteredNotes = useMemo(
    () => sortNotesPinnedFirst(filterByTitle(notes, search)),
    [notes, search],
  )
  const filteredReminders = useMemo(() => filterByTitle(reminders, search), [reminders, search])
  const filteredLists = useMemo(() => filterByTitle(lists, search), [lists, search])

  const counts = useMemo(
    () => ({
      lists: lists.length,
      reminders: reminders.length,
      notes: notes.length,
      all: lists.length + reminders.length + notes.length,
    }),
    [lists.length, reminders.length, notes.length],
  )

  const showLists = filter === 'all' || filter === 'lists'
  const showReminders = filter === 'all' || filter === 'reminders'
  const showNotes = filter === 'all' || filter === 'notes'

  const hasContent =
    (showLists && filteredLists.length > 0) ||
    (showReminders && filteredReminders.length > 0) ||
    (showNotes && filteredNotes.length > 0)

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBg }]}>
      <StatusBar style="light" />
      <DarkHeader
        title="Вспомнить всё!"
        onAvatarPress={handleAvatarPress}
        collapsibleSearch
        searchValue={search}
        onSearchChange={setSearch}
        onGlobalSearch={(q) => router.push({ pathname: '/search', params: { q } })}
      />

      <FilterChips active={filter} onSelect={setFilter} colors={colors} counts={counts} />

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : (
        <ScrollView
          testID="home-scroll"
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              testID="home-refresh-control"
              refreshing={isSyncing}
              onRefresh={syncNow}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          {showLists && filteredLists.length > 0 && (
            <FeedSection title="Задачи" dotColor={colors.accent} colors={colors}>
              {filteredLists.map((list: ShoppingList) => (
                <FeedCard
                  key={list.uuid}
                  uuid={list.uuid}
                  title={list.title}
                  subtitle={listStatusLabel(list)}
                  iconName={listIconName(list)}
                  iconColor={listAccentColor(list, colors)}
                  iconBg={list.type === 'tasks' ? colors.amberBg : colors.accentSoftBg}
                  progress={{ done: list.checkedItemsCount, total: list.itemsCount }}
                  onPress={(uuid) => router.push(`/lists/${uuid}`)}
                  colors={colors}
                />
              ))}
            </FeedSection>
          )}

          {showReminders && filteredReminders.length > 0 && (
            <FeedSection title="Напоминания" dotColor={colors.amber} colors={colors}>
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
            <FeedSection title="Заметки" dotColor={colors.noteBlue} colors={colors}>
              {filteredNotes.map((note: Note) => (
                <FeedCard
                  key={note.uuid}
                  uuid={note.uuid}
                  title={note.title.trim().length > 0 ? note.title : 'Без названия'}
                  subtitle={formatUpdatedAt(note.updatedAt)}
                  iconName="document-text"
                  iconColor={colors.noteBlue}
                  iconBg={colors.noteBlueBg}
                  labelColor={note.color ?? null}
                  pinned={note.isPinned}
                  onPress={(uuid) => router.push(`/notes/${uuid}`)}
                  onLongPress={handleNoteLongPress}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
