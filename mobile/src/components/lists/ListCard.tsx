import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import ProgressRing from '@/components/ui/ProgressRing'
import StatusBadge from '@/components/lists/StatusBadge'
import type { ShoppingList, ListType } from '@/db/repositories/shoppingListsRepo'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { listStatusLabel } from '@/utils/lists'

interface ListCardProps {
  list: ShoppingList
  onPress: (uuid: string) => void
  nearestDeadline?: string | null
}

interface TypeConfig {
  icon: React.ComponentProps<typeof Ionicons>['name']
  iconColor: string
}

const useTypeConfig = (type: ListType): TypeConfig => {
  const { colors } = useTheme()
  if (type === 'tasks') {
    return { icon: 'list', iconColor: colors.amber }
  }
  return { icon: 'bag-handle', iconColor: colors.accent }
}

const ringProgressValue = (checked: number, total: number): number =>
  total === 0 ? 0 : checked / total

const ListCard: React.FC<ListCardProps> = ({ list, onPress, nearestDeadline }) => {
  const { colors } = useTheme()
  const title = list.title.trim().length > 0 ? list.title : 'Без названия'
  const { checkedItemsCount: checked, itemsCount: total } = list
  const cfg = useTypeConfig(list.type)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(list.uuid)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}
    >
      <ProgressRing
        progress={ringProgressValue(checked, total)}
        size={40}
        strokeWidth={3}
        color={cfg.iconColor}
        trackColor={colors.borderSubtle}
      >
        <Ionicons name={cfg.icon} size={16} color={cfg.iconColor} />
      </ProgressRing>
      <View style={styles.info}>
        {/* Бейдж статуса — ТОЛЬКО для задач (tasks); goods — без статусов */}
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {list.type === 'tasks' && (
            <StatusBadge status={list.status} testID="list-status-badge" />
          )}
        </View>
        <Text style={[styles.counter, { color: colors.textSecondary }]}>
          {listStatusLabel(list)}
        </Text>
        {nearestDeadline != null && (
          <View style={[styles.deadlineChip, { backgroundColor: colors.amberBg }]}>
            <Ionicons name="calendar-outline" size={11} color={colors.amber} />
            <Text style={[styles.deadlineText, { color: colors.amber }]}>
              {nearestDeadline}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderRadius: 0,
  },
  pressed: { opacity: 0.8 },
  info: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...typography.body, fontSize: 15.5, fontWeight: '700', flexShrink: 1 },
  counter: { ...typography.bodySm, fontSize: 12.5 },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
  },
  deadlineText: { ...typography.bodySm, fontSize: 11, fontWeight: '600' },
})

export default ListCard
