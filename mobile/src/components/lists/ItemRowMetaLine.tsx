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
 * Мета-строка свёрнутого пункта: бейдж статуса (tasks) + тег(и) + чип дедлайна
 * + иконки-индикаторы. Рендерится СЕСТРОЙ Pressable-раскрытия (не внутри него):
 * тап по статусу/💬 срабатывает с первого раза и не раскрывает строку.
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
      <MetaIndicators item={item} commentsCount={commentsCount} onOpenComments={onOpenComments} />
    </View>
  )
}

// ---- MetaIndicators --------------------------------------------------------

interface MetaIndicatorsProps {
  item: ShoppingListItem
  commentsCount: number
  onOpenComments: ((uuid: string) => void) | undefined
}

/** Иконки-индикаторы меты пункта; 💬 показывает счётчик треда и открывает его. */
const MetaIndicators: React.FC<MetaIndicatorsProps> = ({
  item,
  commentsCount,
  onOpenComments,
}) => {
  const { colors } = useTheme()
  const hasReminder = item.reminderAt !== null
  const hasComments = commentsCount > 0
  const hasLink = item.link !== null && item.link.length > 0
  if (!hasReminder && !hasComments && !hasLink) return null

  return (
    <View style={styles.indicators}>
      {hasReminder && (
        <Ionicons name="notifications-outline" size={12} color={colors.textTertiary} />
      )}
      {hasComments && (
        <Pressable
          onPress={onOpenComments !== undefined ? () => onOpenComments(item.uuid) : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Комментарии: ${commentsCount}`}
          hitSlop={6}
          style={styles.commentsBadge}
        >
          <Ionicons name="chatbubble-outline" size={12} color={colors.textTertiary} />
          <Text style={[styles.commentsBadgeText, { color: colors.textTertiary }]}>
            {commentsCount}
          </Text>
        </Pressable>
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
  commentsBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  commentsBadgeText: { ...typography.bodySm, fontSize: 11, fontWeight: '600' },
})

export default MetaLine
