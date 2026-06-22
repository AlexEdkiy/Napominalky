import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { ListType, ShoppingListItem } from '@/db/repositories/shoppingListsRepo'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

interface ItemRowProps {
  item: ShoppingListItem
  listType: ListType
  onToggle: (uuid: string, checked: boolean) => void
  onDelete: (uuid: string) => void
  onExpand?: (uuid: string) => void
  isExpanded?: boolean
  onQuantityChange?: (uuid: string, quantity: number) => void
  onDeadlinePress?: (uuid: string) => void
}

const ItemRow: React.FC<ItemRowProps> = ({
  item,
  listType,
  onToggle,
  onDelete,
  onExpand,
  isExpanded = false,
  onQuantityChange,
  onDeadlinePress,
}) => {
  const { colors } = useTheme()
  const accentColor = listType === 'tasks' ? colors.amber : colors.accent
  const accentBg = listType === 'tasks' ? colors.amberBg : colors.accentSoftBg
  const checkboxRadius = listType === 'tasks' ? 10 : 7

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface }]}>
      <View style={styles.row}>
        <View style={[styles.accent, { backgroundColor: item.isChecked ? '#D1D5DB' : accentColor }]} />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.isChecked }}
          accessibilityLabel={`Отметить ${item.name}`}
          onPress={() => onToggle(item.uuid, !item.isChecked)}
          style={[
            styles.checkbox,
            {
              borderRadius: checkboxRadius,
              backgroundColor: item.isChecked ? accentColor : 'transparent',
              borderColor: item.isChecked ? accentColor : colors.textTertiary,
            },
          ]}
        >
          {item.isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
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
                { color: item.isChecked ? colors.textTertiary : colors.textPrimary },
                item.isChecked && styles.nameDone,
              ]}
            >
              {item.name}
            </Text>
            {listType === 'goods' && item.quantity > 1 && (
              <View style={[styles.chip, { backgroundColor: accentBg }]}>
                <Text style={[styles.chipText, { color: accentColor }]}>×{item.quantity}</Text>
              </View>
            )}
            {listType === 'tasks' && item.deadline != null && (
              <View style={[styles.chip, { backgroundColor: accentBg }]}>
                <Ionicons name="calendar-outline" size={11} color={accentColor} />
                <Text style={[styles.chipText, { color: accentColor }]}>
                  {item.deadline}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Удалить ${item.name}`}
          onPress={() => onDelete(item.uuid)}
          style={styles.delete}
        >
          <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>
      {isExpanded && (
        <ExpandedRow
          item={item}
          listType={listType}
          accentColor={accentColor}
          onQuantityChange={onQuantityChange}
          onDeadlinePress={onDeadlinePress}
        />
      )}
    </View>
  )
}

interface ExpandedRowProps {
  item: ShoppingListItem
  listType: ListType
  accentColor: string
  onQuantityChange: ((uuid: string, quantity: number) => void) | undefined
  onDeadlinePress: ((uuid: string) => void) | undefined
}

const ExpandedRow: React.FC<ExpandedRowProps> = ({
  item,
  listType,
  accentColor,
  onQuantityChange,
  onDeadlinePress,
}) => {
  const { colors } = useTheme()

  if (listType === 'goods') {
    return (
      <View style={[styles.expanded, { borderTopColor: colors.borderSubtle }]}>
        <Text style={[styles.expandLabel, { color: colors.textSecondary }]}>Количество</Text>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => onQuantityChange?.(item.uuid, Math.max(1, item.quantity - 1))}
            style={[styles.stepBtn, { borderColor: colors.borderInput }]}
            accessibilityRole="button"
            accessibilityLabel="Уменьшить"
          >
            <Text style={[styles.stepIcon, { color: accentColor }]}>−</Text>
          </Pressable>
          <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{item.quantity}</Text>
          <Pressable
            onPress={() => onQuantityChange?.(item.uuid, item.quantity + 1)}
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

  return (
    <View style={[styles.expanded, { borderTopColor: colors.borderSubtle }]}>
      <Text style={[styles.expandLabel, { color: colors.textSecondary }]}>Дедлайн</Text>
      <Pressable
        onPress={() => onDeadlinePress?.(item.uuid)}
        style={[styles.deadlineBtn, { borderColor: colors.borderInput }]}
        accessibilityRole="button"
        accessibilityLabel="Выбрать дату"
      >
        <Ionicons name="calendar-outline" size={16} color={accentColor} />
        <Text style={[styles.deadlineBtnText, { color: item.deadline != null ? colors.textPrimary : colors.textTertiary }]}>
          {item.deadline ?? 'Выбрать дату...'}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
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
  chevronBtn: { padding: 6 },
  delete: { padding: 6, marginLeft: 2 },
  expanded: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  expandLabel: { ...typography.bodySm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
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
  deadlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  deadlineBtnText: { ...typography.body },
})

export default ItemRow
