import React, { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import ListCard from '@/components/lists/ListCard'
import type { ListType, ShoppingList } from '@/db/repositories/shoppingListsRepo'
import { useNearestDeadlines, useShoppingLists } from '@/hooks/useShoppingLists'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { formatDeadlineChip } from '@/utils/datetime'

type FilterTab = 'all' | ListType

interface TabConfig {
  key: FilterTab
  label: string
  dotColor?: string
}

const TABS: readonly TabConfig[] = [
  { key: 'all', label: 'Все' },
  { key: 'goods', label: 'Товары' },
  { key: 'tasks', label: 'Задачи' },
]

const filterLists = (lists: ShoppingList[], tab: FilterTab): ShoppingList[] => {
  if (tab === 'all') return lists
  return lists.filter((l) => l.type === tab)
}

const formatDeadlineLabel = (deadline: string | null): string | null => {
  if (deadline === null) return null
  return formatDeadlineChip(deadline)
}

export default function ListsScreen() {
  const { colors } = useTheme()
  const { lists, isLoading, isError } = useShoppingLists()
  const deadlinesMap = useNearestDeadlines()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const goodsCount = lists.filter((l) => l.type === 'goods').length
  const tasksCount = lists.filter((l) => l.type === 'tasks').length
  const counts: Record<FilterTab, number> = {
    all: lists.length,
    goods: goodsCount,
    tasks: tasksCount,
  }

  const filtered = filterLists(lists, activeTab)

  const handleOpen = (uuid: string): void => {
    router.push(`/lists/${uuid}`)
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.screenBg }]}>
      <View style={[styles.header, { backgroundColor: colors.screenBg }]}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Списки</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Поиск"
          style={[styles.searchBtn, { backgroundColor: colors.borderSubtle }]}
        >
          <Ionicons name="search" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <FilterTabs
        tabs={TABS}
        active={activeTab}
        counts={counts}
        onSelect={setActiveTab}
        accentColor={colors.accent}
        amberColor={colors.amber}
      />

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : isError ? (
        <ErrorState color={colors.danger} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.uuid}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.cardWrapper,
                { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                index === 0 && styles.cardFirst,
                index === filtered.length - 1 && styles.cardLast,
              ]}
            >
              <ListCard
                list={item}
                onPress={handleOpen}
                nearestDeadline={
                  item.type === 'tasks'
                    ? formatDeadlineLabel(deadlinesMap.get(item.uuid) ?? null)
                    : null
                }
              />
              {index < filtered.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
              )}
            </View>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState color={colors.textSecondary} />}
        />
      )}
    </SafeAreaView>
  )
}

interface FilterTabsProps {
  tabs: readonly TabConfig[]
  active: FilterTab
  counts: Record<FilterTab, number>
  onSelect: (tab: FilterTab) => void
  accentColor: string
  amberColor: string
}

const FilterTabs: React.FC<FilterTabsProps> = ({
  tabs,
  active,
  counts,
  onSelect,
  accentColor,
  amberColor,
}) => {
  const { colors } = useTheme()
  const dotColors: Record<FilterTab, string | undefined> = {
    all: undefined,
    goods: accentColor,
    tasks: amberColor,
  }

  return (
    <View style={[styles.tabsRow, { borderBottomColor: colors.borderSubtle }]}>
      {tabs.map((tab) => {
        const isActive = tab.key === active
        const dot = dotColors[tab.key]
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={[styles.tab, isActive && { borderBottomColor: colors.accent }]}
          >
            {dot !== undefined && (
              <View style={[styles.dot, { backgroundColor: dot }]} />
            )}
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.borderSubtle }]}>
              <Text style={[styles.countText, { color: colors.textSecondary }]}>
                {counts[tab.key]}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const EmptyState: React.FC<{ color: string }> = ({ color }) => (
  <View style={styles.empty}>
    <Text style={[styles.emptyTitle, { color }]}>Списков пока нет</Text>
    <Text style={[styles.emptyHint, { color }]}>Нажмите «+», чтобы создать первый</Text>
  </View>
)

const ErrorState: React.FC<{ color: string }> = ({ color }) => (
  <View style={styles.empty}>
    <Text style={[styles.emptyTitle, { color }]}>Ошибка загрузки</Text>
  </View>
)

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  screenTitle: { ...typography.screenTitle, fontSize: 26 },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tabLabel: { ...typography.bodySm, fontWeight: '600' },
  countBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countText: { fontSize: 11, fontWeight: '700' },
  loader: { marginTop: 32 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  cardWrapper: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  cardFirst: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
  },
  cardLast: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  divider: { height: 1, marginLeft: 68 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { ...typography.cardTitle },
  emptyHint: { ...typography.body },
})
