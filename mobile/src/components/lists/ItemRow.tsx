import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import AttributeChips from '@/components/lists/AttributeChips'
import StatusBadge from '@/components/lists/StatusBadge'
import type { ListType, ShoppingListItem } from '@/db/repositories/shoppingListsRepo'
import { parseTags } from '@/db/repositories/shoppingListsRepo'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { formatDeadlineDisplay } from '@/utils/datetime'
import type { ItemAttribute, ItemAttributeValues } from '@/utils/itemAttributes'

interface ItemRowProps {
  item: ShoppingListItem
  listType: ListType
  onToggle: (uuid: string, checked: boolean) => void
  onDelete: (uuid: string) => void
  onExpand?: (uuid: string) => void
  isExpanded?: boolean
  onQuantityChange?: (uuid: string, quantity: number) => void
  onOpenAttribute?: (uuid: string, attribute: ItemAttribute) => void
  onUpdateMeta?: (uuid: string, patch: MetaPatch) => void
  /** Тап по бейджу статуса пункта (только tasks) — открыть меню смены. */
  onOpenStatus?: ((uuid: string) => void) | undefined
}

export interface MetaPatch {
  deadline?: string | null
  link?: string | null
  comment?: string | null
  tags?: string | null
  reminderAt?: string | null
}

const ItemRowComponent: React.FC<ItemRowProps> = ({
  item,
  listType,
  onToggle,
  onDelete,
  onExpand,
  isExpanded = false,
  onQuantityChange,
  onOpenAttribute,
  onUpdateMeta,
  onOpenStatus,
}) => {
  const { colors } = useTheme()
  const accentColor = listType === 'tasks' ? colors.amber : colors.accent
  const accentBg = listType === 'tasks' ? colors.amberBg : colors.accentSoftBg
  const checkboxRadius = listType === 'tasks' ? 10 : 7
  const isTask = listType === 'tasks'
  // Инвариант done ⇔ is_checked; для tasks приоритет у status (зачёркивание).
  const done = isTask ? item.status === 'done' : item.isChecked
  // 5: показываем ВСЕ теги пункта (не только первый)
  const tags = parseTags(item.tags)
  const hasDeadlineChip = listType === 'tasks' && item.deadline != null
  const hasMetaIndicator =
    item.reminderAt !== null ||
    (item.comment !== null && item.comment.length > 0) ||
    (item.link !== null && item.link.length > 0)
  // 3: тег(и) + чип дедлайна + бейдж статуса (tasks) + иконки — metaLine
  const hasMetaLine = isTask || hasDeadlineChip || hasMetaIndicator || tags.length > 0

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface }]}>
      <View style={styles.row}>
        <View
          style={[
            styles.accent,
            { backgroundColor: accentColor, opacity: done ? 0.4 : 1 },
          ]}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`Отметить ${item.name}`}
          onPress={() => onToggle(item.uuid, !done)}
          style={[
            styles.checkbox,
            {
              borderRadius: checkboxRadius,
              backgroundColor: done ? accentColor : 'transparent',
              borderColor: done ? accentColor : colors.textTertiary,
            },
          ]}
        >
          {done && <Ionicons name="checkmark" size={14} color="#fff" />}
        </Pressable>
        <Pressable
          style={styles.main}
          onPress={() => onExpand?.(item.uuid)}
          accessibilityRole="button"
          accessibilityLabel={item.name}
        >
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.name,
                { color: done ? colors.textTertiary : colors.textPrimary },
                done && styles.nameDone,
              ]}
            >
              {item.name}
            </Text>
            {listType === 'goods' && item.quantity > 1 && (
              <View style={[styles.chip, { backgroundColor: accentBg }]}>
                <Text style={[styles.chipText, { color: accentColor }]}>×{item.quantity}</Text>
              </View>
            )}
          </View>
          {/* 3/5: тег(и) + чип дедлайна + мета-иконки — единый горизонтальный ряд */}
          {hasMetaLine && (
            <View style={styles.metaLine}>
              {/* Бейдж статуса пункта — только для tasks; goods без статусов */}
              {isTask && (
                <StatusBadge
                  status={item.status}
                  testID="item-status-badge"
                  onPress={
                    onOpenStatus !== undefined
                      ? () => onOpenStatus(item.uuid)
                      : undefined
                  }
                />
              )}
              {tags.map((tag) => (
                <View key={tag} style={[styles.chip, { backgroundColor: colors.borderSubtle }]}>
                  <Text style={[styles.chipText, { color: colors.textSecondary }]}>#{tag}</Text>
                </View>
              ))}
              {/* DEF-05: форматированная дата вместо raw YYYY-MM-DD */}
              {listType === 'tasks' && item.deadline != null && (
                <View style={[styles.chip, { backgroundColor: accentBg }]}>
                  <Ionicons name="calendar-outline" size={11} color={accentColor} />
                  <Text style={[styles.chipText, { color: accentColor }]}>
                    {formatDeadlineDisplay(item.deadline)}
                  </Text>
                </View>
              )}
              <MetaIndicators item={item} />
            </View>
          )}
        </Pressable>
        {/* DEF-01: убран Pressable с close-circle-outline; chevron — единственный правый элемент */}
        {onExpand !== undefined && (
          <Pressable
            onPress={() => onExpand(item.uuid)}
            accessibilityRole="button"
            accessibilityLabel="Развернуть"
            style={styles.chevronBtn}
          >
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textTertiary}
            />
          </Pressable>
        )}
      </View>
      {isExpanded && (
        <ExpandedPanel
          item={item}
          accentColor={accentColor}
          accentBg={accentBg}
          onOpenAttribute={onOpenAttribute}
          onUpdateMeta={onUpdateMeta}
          onQuantityChange={listType === 'goods' ? onQuantityChange : undefined}
          onDelete={onDelete}
        />
      )}
    </View>
  )
}

// ---- MetaIndicators --------------------------------------------------------

interface MetaIndicatorsProps {
  item: ShoppingListItem
}

const MetaIndicators: React.FC<MetaIndicatorsProps> = ({ item }) => {
  const { colors } = useTheme()
  const hasReminder = item.reminderAt !== null
  const hasComment = item.comment !== null && item.comment.length > 0
  const hasLink = item.link !== null && item.link.length > 0
  if (!hasReminder && !hasComment && !hasLink) return null

  return (
    <View style={styles.indicators}>
      {hasReminder && (
        <Ionicons name="notifications-outline" size={12} color={colors.textTertiary} />
      )}
      {hasComment && (
        <Ionicons name="chatbubble-outline" size={12} color={colors.textTertiary} />
      )}
      {hasLink && <Ionicons name="link-outline" size={12} color={colors.textTertiary} />}
    </View>
  )
}

// ---- ExpandedPanel -----------------------------------------------------------

interface ExpandedPanelProps {
  item: ShoppingListItem
  accentColor: string
  accentBg: string
  onOpenAttribute: ((uuid: string, attribute: ItemAttribute) => void) | undefined
  onUpdateMeta: ((uuid: string, patch: MetaPatch) => void) | undefined
  onQuantityChange: ((uuid: string, quantity: number) => void) | undefined
  onDelete: (uuid: string) => void
}

/** Раскрытая панель пункта: чипсы/токены атрибутов + степпер количества (goods) + удаление. */
const ExpandedPanel: React.FC<ExpandedPanelProps> = ({
  item,
  accentColor,
  accentBg,
  onOpenAttribute,
  onUpdateMeta,
  onQuantityChange,
  onDelete,
}) => {
  const { colors } = useTheme()
  const values: ItemAttributeValues = {
    deadline: item.deadline,
    reminderAt: item.reminderAt,
    link: item.link,
    comment: item.comment,
    tags: parseTags(item.tags),
  }

  const handleRemove = (attribute: ItemAttribute): void => {
    if (attribute === 'deadline') onUpdateMeta?.(item.uuid, { deadline: null })
    else if (attribute === 'reminder') onUpdateMeta?.(item.uuid, { reminderAt: null })
    else if (attribute === 'link') onUpdateMeta?.(item.uuid, { link: null })
    else if (attribute === 'comment') onUpdateMeta?.(item.uuid, { comment: null })
    else onUpdateMeta?.(item.uuid, { tags: null })
  }

  return (
    <View
      style={[
        styles.expanded,
        { borderTopColor: colors.borderSubtle, backgroundColor: colors.screenBg },
      ]}
    >
      {onQuantityChange !== undefined && (
        <QuantityRow item={item} accentColor={accentColor} onQuantityChange={onQuantityChange} />
      )}

      <AttributeChips
        values={values}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={(attribute) => onOpenAttribute?.(item.uuid, attribute)}
        onRemove={handleRemove}
      />

      <Pressable
        onPress={() => onDelete(item.uuid)}
        accessibilityRole="button"
        accessibilityLabel={`Удалить пункт ${item.name}`}
        style={styles.deleteItemBtn}
      >
        <Text style={[styles.deleteItemText, { color: colors.danger }]}>Удалить пункт</Text>
      </Pressable>
    </View>
  )
}

// ---- Sub-components --------------------------------------------------------

interface QuantityRowProps {
  item: ShoppingListItem
  accentColor: string
  onQuantityChange: (uuid: string, quantity: number) => void
}

const QuantityRow: React.FC<QuantityRowProps> = ({ item, accentColor, onQuantityChange }) => {
  const { colors } = useTheme()
  return (
    <View style={styles.metaRowCompact}>
      <Text style={[styles.expandLabel, { color: colors.textSecondary }]}>Количество</Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => onQuantityChange(item.uuid, Math.max(1, item.quantity - 1))}
          style={[styles.stepBtn, { borderColor: colors.borderInput }]}
          accessibilityRole="button"
          accessibilityLabel="Уменьшить"
        >
          <Text style={[styles.stepIcon, { color: accentColor }]}>−</Text>
        </Pressable>
        <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{item.quantity}</Text>
        <Pressable
          onPress={() => onQuantityChange(item.uuid, item.quantity + 1)}
          style={[styles.stepBtn, { borderColor: colors.borderInput }]}
          accessibilityRole="button"
          accessibilityLabel="Увеличить"
        >
          <Text style={[styles.stepIcon, { color: accentColor }]}>+</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingRight: 12,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    flexShrink: 0,
  },
  main: { flex: 1, paddingVertical: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { ...typography.body, flexShrink: 1 },
  nameDone: { textDecorationLine: 'line-through' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: { ...typography.bodySm, fontSize: 12, fontWeight: '600' },
  // DEF-06/3.6/3: тег(и) + чип дедлайна + иконки-индикаторы в один горизонтальный ряд
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevronBtn: { padding: 6 },
  expanded: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  metaRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  expandLabel: { ...typography.bodySm, fontWeight: '600', color: undefined },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: { fontSize: 20, lineHeight: 22, fontWeight: '700' },
  stepValue: { ...typography.bodyMd, minWidth: 28, textAlign: 'center', fontWeight: '700' },
  // DEF-01: кнопка удаления в раскрытом редакторе
  deleteItemBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  deleteItemText: { ...typography.bodySm, fontWeight: '500' },
})

// 3.5: memo — ввод в одном пункте не перерисовывает остальные строки списка
const ItemRow = React.memo(ItemRowComponent)

export default ItemRow
