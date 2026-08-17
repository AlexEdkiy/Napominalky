import React, { useRef } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'

import AttributeChips from '@/components/lists/AttributeChips'
import MetaLine from '@/components/lists/ItemRowMetaLine'
import SwipeDeleteAction from '@/components/lists/SwipeDeleteAction'
import type { ListType, ShoppingListItem } from '@/db/repositories/shoppingListsRepo'
import { parseTags } from '@/db/repositories/shoppingListsRepo'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
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
  /** Количество комментариев треда пункта (бейдж 💬 + кнопка в панели). */
  commentsCount?: number
  /** Тап по 💬/кнопке «Комментарии» — открыть тред пункта. */
  onOpenComments?: (uuid: string) => void
  /**
   * Подтверждённое удаление из свайп-действия: свайп влево открывает кнопку
   * «Удалить», тап по ней = подтверждение (без Alert). Без пропа свайпа нет.
   */
  onSwipeDelete?: ((uuid: string) => void) | undefined
}

export interface MetaPatch {
  deadline?: string | null
  link?: string | null
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
  commentsCount = 0,
  onOpenComments,
  onSwipeDelete,
}) => {
  const { colors } = useTheme()
  const swipeableRef = useRef<Swipeable | null>(null)
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
    item.reminderAt !== null || commentsCount > 0 || (item.link !== null && item.link.length > 0)
  // 3: тег(и) + чип дедлайна + бейдж статуса (tasks) + иконки — metaLine
  const hasMetaLine = isTask || hasDeadlineChip || hasMetaIndicator || tags.length > 0

  // Свайп влево = inline-подтверждение: удаляет только тап по кнопке «Удалить».
  const handleSwipeDelete = (): void => {
    swipeableRef.current?.close()
    onSwipeDelete?.(item.uuid)
  }

  const swipeProps = onSwipeDelete === undefined ? {} : {
    renderRightActions: () => (
      <SwipeDeleteAction itemName={item.name} onConfirm={handleSwipeDelete} />
    ),
  }

  return (
    <Swipeable
      ref={swipeableRef}
      {...swipeProps}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      containerStyle={styles.swipeContainer}
    >
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
        {/* Фикс «второго тапа»: metaLine — сестра Pressable-раскрытия, не потомок */}
        <View style={styles.main}>
          <Pressable
            style={styles.nameTap}
            hitSlop={{ top: 12, bottom: hasMetaLine ? 0 : 12 }}
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
          </Pressable>
          {/* 3/5: тег(и) + чип дедлайна + мета-иконки — единый горизонтальный ряд */}
          {hasMetaLine && (
            <MetaLine
              item={item}
              isTask={isTask}
              tags={tags}
              accentColor={accentColor}
              accentBg={accentBg}
              commentsCount={commentsCount}
              onOpenStatus={onOpenStatus}
              onOpenComments={onOpenComments}
            />
          )}
        </View>
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
          commentsCount={commentsCount}
          onOpenComments={onOpenComments}
        />
      )}
    </View>
    </Swipeable>
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
  commentsCount: number
  onOpenComments: ((uuid: string) => void) | undefined
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
  commentsCount,
  onOpenComments,
}) => {
  const { colors } = useTheme()
  const values: ItemAttributeValues = {
    deadline: item.deadline,
    reminderAt: item.reminderAt,
    link: item.link,
    tags: parseTags(item.tags),
  }

  const handleRemove = (attribute: ItemAttribute): void => {
    if (attribute === 'deadline') onUpdateMeta?.(item.uuid, { deadline: null })
    else if (attribute === 'reminder') onUpdateMeta?.(item.uuid, { reminderAt: null })
    else if (attribute === 'link') onUpdateMeta?.(item.uuid, { link: null })
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

      {/* Тред комментариев заменяет одиночный атрибут «Комментарий» */}
      {onOpenComments !== undefined && (
        <Pressable
          onPress={() => onOpenComments(item.uuid)}
          accessibilityRole="button"
          accessibilityLabel={`Комментарии (${commentsCount})`}
          style={[styles.commentsBtn, { borderColor: accentBg }]}
        >
          <Ionicons name="chatbubble-outline" size={13} color={accentColor} />
          <Text style={[styles.commentsBtnText, { color: accentColor }]}>
            {`Комментарии (${commentsCount})`}
          </Text>
        </Pressable>
      )}

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
  // Отступ между плашками — на контейнере Swipeable: красная зона действия
  // не просвечивает в межстрочном зазоре (actions рендерятся под строкой).
  swipeContainer: { marginBottom: 2 },
  wrapper: {
    borderRadius: 14,
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
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
  nameTap: { justifyContent: 'center' },
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
  commentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    height: 34,
    borderRadius: 17,
    borderWidth: 1.4,
    paddingHorizontal: 12,
  },
  commentsBtnText: { ...typography.bodySm, fontSize: 12, fontWeight: '700' },
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
