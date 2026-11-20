import { t, useLanguage } from '@/i18n'
import React, { useState } from 'react'
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import DarkHeader from '@/components/ui/DarkHeader'
import SearchResultCard from '@/components/search/SearchResultCard'
import { useSearch } from '@/hooks/useSearch'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/theme'
import type { SearchType } from '@/types/search'

const FILTERS: { value: SearchType; label: string }[] = [
  { value: 'all', label: 'Все' }, { value: 'list', label: 'Задачи и покупки' },
  { value: 'item', label: 'Пункты' }, { value: 'note', label: 'Заметки' },
  { value: 'reminder', label: 'Напоминания' },
]

function SearchContent(): React.JSX.Element {
  useLanguage()
  const params = useLocalSearchParams<{ q?: string }>()
  const initial = typeof params.q === 'string' ? params.q.slice(0, 200) : ''
  const [draft, setDraft] = useState(initial)
  const [query, setQuery] = useState(initial.trim())
  const [type, setType] = useState<SearchType>('all')
  const [page, setPage] = useState(1)
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const search = useSearch(query, type, page)
  const currentPage = search.data?.page ?? page
  const lastPage = search.data?.lastPage ?? 1
  const submit = (): void => {
    Keyboard.dismiss()
    if (query === draft.trim() && page === 1 && search.enabled) void search.refetch()
    setQuery(draft.trim())
    setPage(1)
  }
  const selectType = (value: SearchType): void => { setType(value); setPage(1) }
  const message = !query ? t("Введите название или текст для поиска.")
    : !search.enabled ? t("Введите от 2 до 200 символов.")
      : search.isError ? t("Не удалось выполнить поиск. Попробуйте ещё раз.")
        : t("Ничего не найдено. Измените запрос или выберите «Все».")

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.screenBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <DarkHeader title={t("Поиск")} onBack={() => router.back()} />
      <View style={styles.controls}>
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.borderInput }]}>
          <TextInput accessibilityLabel={t("Поисковый запрос")} placeholder={t("Название или текст")}
            placeholderTextColor={colors.textSecondary} value={draft} onChangeText={setDraft}
            onSubmitEditing={submit} autoFocus={!initial} returnKeyType="search" maxLength={200} autoCorrect={false}
            style={[styles.input, { color: colors.textPrimary }]} />
          <Pressable accessibilityRole="button" accessibilityLabel={t("Найти")} onPress={submit}
            style={[styles.button, { backgroundColor: colors.accent }]}>
            <Text style={styles.buttonText}>{t("Найти")}</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.filters}>
          {FILTERS.map((filter) => <Pressable key={filter.value} accessibilityRole="button"
            accessibilityLabel={t("Искать: {0}", [t(filter.label)])} accessibilityState={{ selected: type === filter.value }}
            onPress={() => selectType(filter.value)}
            style={[styles.chip, { backgroundColor: type === filter.value ? colors.accent : colors.surface }]}>
            <Text style={{ color: type === filter.value ? '#fff' : colors.textPrimary }}>{t(filter.label)}</Text>
          </Pressable>)}
        </ScrollView>
      </View>
      {search.enabled && search.isPending ? <ActivityIndicator accessibilityLabel={t("Ищем")} color={colors.accent} />
        : <FlatList key={`${query}:${type}:${currentPage}`} data={search.isError ? [] : search.data?.results ?? []}
          keyExtractor={(item) => `${item.type}:${item.uuid}`} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag" contentContainerStyle={[styles.results, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => <SearchResultCard result={item} query={query} />}
          ListHeaderComponent={search.enabled && !search.isError ? <Text
            accessibilityLiveRegion="polite" style={[styles.summary, { color: colors.textSecondary }]}>
            {t('Найдено: {0} · На устройстве', [search.data?.total ?? 0])}
          </Text> : null}
          ListEmptyComponent={<View style={styles.empty}>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
            {search.isError && <Pressable accessibilityRole="button" onPress={() => { void search.refetch() }}
              style={[styles.button, { backgroundColor: colors.accent }]}>
              <Text style={styles.buttonText}>{t("Повторить поиск")}</Text>
            </Pressable>}
          </View>}
          ListFooterComponent={lastPage > 1 && !search.isError ? <View style={styles.pages}>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Предыдущая страница")}
              disabled={currentPage <= 1} accessibilityState={{ disabled: currentPage <= 1 }}
              onPress={() => setPage(currentPage - 1)} style={styles.pageButton}>
              <Text style={{ color: currentPage <= 1 ? colors.textTertiary : colors.accent }}>{t("Назад")}</Text>
            </Pressable>
            <Text style={{ color: colors.textPrimary }}>{currentPage} / {lastPage}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Следующая страница")}
              disabled={currentPage >= lastPage} accessibilityState={{ disabled: currentPage >= lastPage }}
              onPress={() => setPage(currentPage + 1)} style={styles.pageButton}>
              <Text style={{ color: currentPage >= lastPage ? colors.textTertiary : colors.accent }}>{t("Далее")}</Text>
            </Pressable>
          </View> : null} />}
    </KeyboardAvoidingView>
  )
}

export default function SearchScreen(): React.JSX.Element {
  useLanguage()
  const token = useAuthStore((state) => state.token)
  const guest = useAuthStore((state) => state.guestMode)
  const userId = useAuthStore((state) => state.user?.uuid ?? '')
  if (!token && !guest) return <Redirect href="/" />
  return <SearchContent key={`${userId}:${guest}:${token !== null}`} />
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controls: { padding: 16, gap: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 6, gap: 8 },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 8, paddingVertical: 10, fontSize: 16 },
  button: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  filters: { gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20 },
  results: { paddingHorizontal: 16 },
  summary: { marginBottom: 12, fontSize: 14 },
  empty: { padding: 24, alignItems: 'center', gap: 16 },
  message: { textAlign: 'center', fontSize: 16, lineHeight: 24 },
  pages: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 },
  pageButton: { padding: 14 },
})
