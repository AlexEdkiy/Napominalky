import FavoriteButton from '@/components/ui/FavoriteButton'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { useTheme } from '@/theme'
import type { SearchResult } from '@/types/search'

interface Props { result: SearchResult; query: string }
interface HighlightProps { text: string; query: string; color: string }

const Highlight: React.FC<HighlightProps> = ({ text, query, color }) => {
  const literal = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = query ? text.split(new RegExp(`(${literal})`, 'gi')) : [text]
  return <>{parts.map((part, i) => <Text key={i} style={i % 2 ? [styles.match, { color }] : undefined}>
    {part}
  </Text>)}</>
}

export const openSearchResult = (result: SearchResult): void => {
  if (result.type === 'note') router.push({ pathname: '/notes/[uuid]', params: { uuid: result.uuid } })
  else if (result.type === 'reminder') router.push({ pathname: '/reminders/[uuid]', params: { uuid: result.uuid } })
  else if (result.type === 'list') router.push({ pathname: '/lists/[uuid]', params: { uuid: result.uuid } })
  else if (result.listUuid) router.push({ pathname: '/lists/[uuid]', params: {
    uuid: result.listUuid, itemUuid: result.uuid, showComments: result.matchInComments ? '1' : '0',
  } })
}

const label = (result: SearchResult): string => {
  if (result.type === 'list') return result.listType === 'tasks' ? 'Задача' : 'Покупки'
  if (result.type === 'item') return result.listType === 'tasks' ? 'Пункт задачи' : 'Пункт покупок'
  return result.type === 'note' ? 'Заметка' : 'Напоминание'
}

const SearchResultCard: React.FC<Props> = ({ result, query }) => {
  const { colors } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
    <View style={styles.favorite}>
      <FavoriteButton entity={result.type === 'list' ? 'shopping_list' : result.type === 'item'
        ? 'shopping_list_item' : result.type} uuid={result.uuid} title={result.title} favorite={result.isFavorite} />
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Открыть: ${result.title || 'Без названия'}`}
      onPress={() => openSearchResult(result)} style={styles.body}>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {label(result)}{result.isArchived ? ' · В архиве' : ''}{result.isCompleted ? ' · Выполнено' : ''}
      </Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        <Highlight text={result.title || 'Без названия'} query={query} color={colors.accent} />
      </Text>
      {result.listTitle && <Text style={[styles.meta, { color: colors.textSecondary }]}>
        В списке «{result.listTitle}»
      </Text>}
      {result.excerpt.length > 0 && <Text style={[styles.excerpt, { color: colors.textBody }]}>
        <Highlight text={result.excerpt} query={query} color={colors.accent} />
      </Text>}
    </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  body: { gap: 8, paddingRight: 38 },
  favorite: { position: 'absolute', right: 4, top: 4, zIndex: 1 },
  card: { padding: 16, borderRadius: 16, gap: 8, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 13 },
  excerpt: { fontSize: 15, lineHeight: 23 },
  match: { fontWeight: '700', textDecorationLine: 'underline' },
})
export default SearchResultCard
