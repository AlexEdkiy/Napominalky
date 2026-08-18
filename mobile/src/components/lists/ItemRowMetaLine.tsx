import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import StatusBadge from '@/components/lists/StatusBadge'
import type { ShoppingListItem } from '@/db/repositories/shoppingListsRepo'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { formatDeadlineDisplay } from '@/utils/datetime'

interface MetaLineProps {
  item: ShoppingListItem
  isTask: boolean
  tags: string[]
  accentColor: string
  accentBg: string
  commentsCount: number
  onOpenStatus: ((uuid: string) => void) | undefined
  onOpenComments: ((uuid: string) => void) | undefined
}

/**
 * Мета-строка пункта: бейдж статуса (tasks) + ТОЛЬКО заполненные атрибуты
 * (теги, чип дедлайна, иконки напоминания/ссылки) + жёлтый чип комментариев
 * со счётчиком (при commentsCount > 0; тап открывает тред в один тап).
 * Рендерится СЕСТРОЙ Pressable названия (не потомком): тап по статусу/чипу
 * срабатывает с первого раза.
 */
const MetaLine: React.FC<MetaLineProps> = ({
  item,
  isTask,
  tags,
  accentColor,
  accentBg,
  commentsCount,
  onOpenStatus,
  onOpenComments,
}) => {
  const { colors } = useTheme()
  return (
    <View style={styles.metaLine}>
      {/* Бейдж статуса пункта — только для tasks; goods без статусов */}
      {isTask && (
        <StatusBadge
          status={item.status}
          testID="item-status-badge"
          onPress={onOpenStatus !== undefined ? () => onOpenStatus(item.uuid) : undefined}
        />
      )}
      {tags.map((tag) => (
        <View key={tag} style={[styles.chip, { backgroundColor: colors.borderSubtle }]}>
          <Text style={[styles.chipText, { color: colors.textSecondary }]}>#{tag}</Text>
        </View>
      ))}
      {/* DEF-05: форматированная дата вместо raw YYYY-MM-DD */}
      {isTask && item.deadline != null && (
        <View style={[styles.chip, { backgroundColor: accentBg }]}>
          <Ionicons name="calendar-outline" size={11} color={accentColor} />
          <Text style={[styles.chipText, { color: accentColor }]}>
            {formatDeadlineDisplay(item.deadline)}
          </Text>
        </View>
      )}
      {/* 6: жёлтый чип комментариев со счётчиком — вход в тред в один тап */}
      {commentsCount > 0 && (
        <Pressable
          onPress={onOpenComments !== undefined ? () => onOpenComments(item.uuid) : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Комментарии: ${commentsCount}`}
          hitSlop={6}
          testID="item-comments-chip"
          style={[styles.chip, { backgroundColor: colors.amberBg }]}
        >
          <Ionicons name="chatbubble-outline" size={11} color={colors.amber} />
          <Text style={[styles.chipText, { color: colors.amber }]}>{commentsCount}</Text>
        </Pressable>
      )}
      <MetaIndicators item={item} />
    </View>
  )
}

// ---- MetaIndicators --------------------------------------------------------

interface MetaIndicatorsProps {
  item: ShoppingListItem
}

/** Иконки-индикаторы заполненных атрибутов пункта: напоминание и ссылка. */
const MetaIndicators: React.FC<MetaIndicatorsProps> = ({ item }) => {
  const { colors } = useTheme()
  const hasReminder = item.reminderAt !== null
  const hasLink = item.link !== null && item.link.length > 0
  if (!hasReminder && !hasLink) return null

  return (
    <View style={styles.indicators}>
      {hasReminder && (
        <Ionicons name="notifications-outline" size={12} color={colors.textTertiary} />
      )}
      {hasLink && <Ionicons name="link-outline" size={12} color={colors.textTertiary} />}
    </View>
  )
}

const styles = StyleSheet.create({
  // DEF-06/3.6/3: тег(и) + чип дедлайна + иконки-индикаторы в один горизонтальный ряд
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: { ...typography.bodySm, fontSize: 12, fontWeight: '600' },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
})

export default MetaLine
