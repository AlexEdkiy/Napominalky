import React from 'react'
import { ScrollView, StyleSheet, Text, Pressable } from 'react-native'
import { typography } from '@/theme/typography'
import type { ColorPalette } from '@/theme/colors'

export type FeedFilter = 'all' | 'lists' | 'reminders' | 'notes'

const CHIPS: { id: FeedFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'lists', label: 'Списки' },
  { id: 'reminders', label: 'Напоминания' },
  { id: 'notes', label: 'Заметки' },
]

interface FilterChipsProps {
  active: FeedFilter
  onSelect: (filter: FeedFilter) => void
  colors: ColorPalette
}

const FilterChips: React.FC<FilterChipsProps> = ({ active, onSelect, colors }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.row}
    style={styles.scroll}
  >
    {CHIPS.map((chip) => {
      const isActive = chip.id === active
      return (
        <Pressable
          key={chip.id}
          accessibilityRole="button"
          accessibilityLabel={chip.label}
          accessibilityState={{ selected: isActive }}
          onPress={() => onSelect(chip.id)}
          style={[
            styles.chip,
            {
              backgroundColor: isActive ? colors.accent : colors.surface,
              borderColor: isActive ? colors.accent : colors.borderInput,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              { color: isActive ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            {chip.label}
          </Text>
        </Pressable>
      )
    })}
  </ScrollView>
)

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 18,
    paddingBottom: 2,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  chipText: {
    ...typography.bodySm,
    fontSize: 12,
    fontWeight: '700',
  },
})

export default FilterChips
