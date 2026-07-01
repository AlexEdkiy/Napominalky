import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { typography } from '@/theme/typography'
import type { ColorPalette } from '@/theme/colors'

export type FeedFilter = 'all' | 'lists' | 'reminders' | 'notes'

interface TabConfig {
  key: FeedFilter
  label: string
  dotColor?: string
}

export interface FilterCounts {
  all: number
  lists: number
  reminders: number
  notes: number
}

interface FilterChipsProps {
  active: FeedFilter
  onSelect: (filter: FeedFilter) => void
  colors: ColorPalette
  counts: FilterCounts
}

const FilterChips: React.FC<FilterChipsProps> = ({ active, onSelect, colors, counts }) => {
  const tabs: readonly TabConfig[] = [
    { key: 'all', label: 'Все' },
    { key: 'lists', label: 'Задачи', dotColor: colors.accent },
    { key: 'reminders', label: 'Напоминания', dotColor: colors.amber },
    { key: 'notes', label: 'Заметки', dotColor: colors.noteBlue },
  ]

  const underlineColors: Record<FeedFilter, string> = {
    all: colors.accent,
    lists: colors.accent,
    reminders: colors.amber,
    notes: colors.noteBlue,
  }

  return (
    <View style={[styles.tabsRow, { borderBottomColor: colors.borderSubtle }]}>
      {tabs.map((tab) => {
        const isActive = tab.key === active
        const underline = underlineColors[tab.key]
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={[styles.tab, isActive && { borderBottomColor: underline }]}
          >
            {tab.dotColor !== undefined && (
              <View style={[styles.dot, { backgroundColor: tab.dotColor }]} />
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

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tabLabel: { ...typography.bodySm, fontSize: 13, fontWeight: '600' },
  countBadge: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countText: { fontSize: 10, fontWeight: '700' },
})

export default FilterChips
