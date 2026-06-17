import React, { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import NoteCard from '@/components/notes/NoteCard'
import ReminderCard from '@/components/reminders/ReminderCard'
import ScreenTitle from '@/components/ui/ScreenTitle'
import { useNotes } from '@/hooks/useNotes'
import { useMissedReminders } from '@/hooks/useReminders'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import type { Note } from '@/db/repositories/notesRepo'
import type { Reminder } from '@/db/repositories/remindersRepo'

export default function HomeScreen() {
  const { colors } = useTheme()
  const { notes, isLoading } = useNotes()
  const { data: missed = [] } = useMissedReminders()
  const [search, setSearch] = useState('')

  const filtered = filterNotes(notes, search)

  const handleOpen = (uuid: string): void => { router.push(`/notes/${uuid}`) }
  const handleOpenReminder = (uuid: string): void => { router.push(`/reminders/${uuid}`) }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.screenBg }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ScreenTitle text="Главная" color={colors.textPrimary} />
        </View>

        <RemindersLinkCard
          missedCount={missed.length}
          onPress={() => router.push('/reminders')}
          colors={colors}
        />

        <MissedSection reminders={missed} onOpen={handleOpenReminder} />

        <SearchBar
          value={search}
          onChangeText={setSearch}
          colors={colors}
        />

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.uuid}
            renderItem={({ item }) => <NoteCard note={item} onPress={handleOpen} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState color={colors.textSecondary} />}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

function filterNotes(notes: Note[], query: string): Note[] {
  const trimmed = query.trim().toLowerCase()
  if (trimmed.length === 0) return notes
  return notes.filter(
    (n) =>
      n.title.toLowerCase().includes(trimmed) ||
      (n.body ?? '').toLowerCase().includes(trimmed),
  )
}

interface ColorsArg {
  accent: string
  accentDark: string
  accentSoftBg: string
  accentOnSoft: string
  surface: string
  borderSubtle: string
  textPrimary: string
  textTertiary: string
  textSecondary: string
}

interface RemindersLinkCardProps {
  missedCount: number
  onPress: () => void
  colors: ColorsArg
}

const RemindersLinkCard: React.FC<RemindersLinkCardProps> = ({ missedCount, onPress, colors }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Ближайшие напоминания"
    onPress={onPress}
    style={({ pressed }) => [
      styles.remindersCard,
      { backgroundColor: colors.accentSoftBg },
      pressed && styles.pressed,
    ]}
  >
    <View style={[styles.remindersIcon, { backgroundColor: colors.accent }]}>
      <Ionicons name="notifications" size={22} color="#fff" />
    </View>
    <View style={styles.remindersTexts}>
      <Text style={[styles.remindersTitle, { color: colors.accentDark }]}>
        Ближайшие напоминания
      </Text>
      <Text style={[styles.remindersHint, { color: colors.accentOnSoft }]}>
        {missedCount > 0 ? `Пропущено · ${missedCount}` : 'Сегодня'}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.accentDark} />
  </Pressable>
)

interface SearchBarProps {
  value: string
  onChangeText: (text: string) => void
  colors: ColorsArg
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText, colors }) => (
  <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
    <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={styles.searchIcon} />
    <TextInput
      accessibilityLabel="Поиск заметок"
      placeholder="Поиск заметок"
      placeholderTextColor={colors.textTertiary}
      value={value}
      onChangeText={onChangeText}
      style={[styles.search, { color: colors.textPrimary }]}
    />
  </View>
)

const EmptyState: React.FC<{ color: string }> = ({ color }) => (
  <View style={styles.empty}>
    <Text style={[styles.emptyTitle, { color }]}>Заметок пока нет</Text>
    <Text style={[styles.emptyHint, { color }]}>Нажмите «+», чтобы создать первую</Text>
  </View>
)

interface MissedSectionProps {
  reminders: Reminder[]
  onOpen: (uuid: string) => void
}

const MissedSection: React.FC<MissedSectionProps> = ({ reminders, onOpen }) => {
  if (reminders.length === 0) return null
  return (
    <View style={styles.missed}>
      <Text style={styles.missedTitle}>Пропущенные</Text>
      {reminders.map((r) => (
        <ReminderCard key={r.uuid} reminder={r} onPress={onOpen} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  remindersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  remindersIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remindersTexts: { flex: 1, gap: 2 },
  remindersTitle: { ...typography.cardTitle, fontSize: 15 },
  remindersHint: { ...typography.bodySm },
  pressed: { opacity: 0.82 },
  missed: { marginHorizontal: 16, marginTop: 12, gap: 8 },
  missedTitle: { ...typography.sectionLabel, color: '#D9583C' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  searchIcon: { marginRight: 8 },
  search: { flex: 1, ...typography.body, paddingVertical: 8 },
  loader: { marginTop: 32 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { ...typography.cardTitle },
  emptyHint: { ...typography.body },
})
