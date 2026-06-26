import React, { useState, useMemo, useCallback } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import DarkHeader from '@/components/ui/DarkHeader'
import FeedCard from '@/components/home/FeedCard'
import { useNotes } from '@/hooks/useNotes'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { formatUpdatedAt } from '@/utils/datetime'
import { sortNotesPinnedFirst } from '@/utils/notes'
import type { Note } from '@/db/repositories/notesRepo'

const filterByTitle = (items: Note[], q: string): Note[] => {
  const query = q.trim().toLowerCase()
  if (query.length === 0) return items
  return items.filter((n) => n.title.toLowerCase().includes(query))
}

export default function NotesListScreen(): React.JSX.Element {
  const { colors } = useTheme()
  const { notes, isLoading, deleteNote } = useNotes()
  const [search, setSearch] = useState('')

  const handleAvatarPress = useCallback((): void => {
    router.push('/(tabs)/profile')
  }, [])

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

  const filteredNotes = useMemo(
    () => sortNotesPinnedFirst(filterByTitle(notes, search)),
    [notes, search],
  )

  const renderItem = useCallback(
    ({ item }: { item: Note }) => (
      <FeedCard
        uuid={item.uuid}
        title={item.title.trim().length > 0 ? item.title : 'Без названия'}
        subtitle={formatUpdatedAt(item.updatedAt)}
        iconName="document-text"
        iconColor={colors.noteBlue}
        iconBg={colors.noteBlueBg}
        labelColor={item.color ?? null}
        pinned={item.isPinned}
        onPress={(uuid) => router.push(`/notes/${uuid}`)}
        onLongPress={handleNoteLongPress}
        colors={colors}
      />
    ),
    [colors, handleNoteLongPress],
  )

  const keyExtractor = useCallback((item: Note) => item.uuid, [])

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBg }]}>
      <StatusBar style="light" />
      <DarkHeader
        title="Заметки"
        onAvatarPress={handleAvatarPress}
        collapsibleSearch
        searchValue={search}
        onSearchChange={setSearch}
      />

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            filteredNotes.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState colors={colors} hasSearch={search.length > 0} />}
        />
      )}
    </View>
  )
}

interface EmptyStateProps {
  colors: ReturnType<typeof import('@/theme').useTheme>['colors']
  hasSearch: boolean
}

const EmptyState: React.FC<EmptyStateProps> = ({ colors, hasSearch }) => (
  <View style={styles.empty}>
    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
      {hasSearch ? 'Ничего не найдено' : 'Заметок пока нет'}
    </Text>
    {!hasSearch && (
      <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
        Нажмите «+», чтобы создать первую заметку
      </Text>
    )}
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 10,
  },
  listContentEmpty: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { ...typography.cardTitle },
  emptyHint: { ...typography.body, textAlign: 'center' },
})
