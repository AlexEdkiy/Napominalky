import React, { useRef } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'

import MetaLine from '@/components/lists/ItemRowMetaLine'
import SwipeDeleteAction from '@/components/lists/SwipeDeleteAction'
import type { ListType, ShoppingListItem } from '@/db/repositories/shoppingListsRepo'
import { parseTags } from '@/db/repositories/shoppingListsRepo'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

interface ItemRowProps {
  item: ShoppingListItem
  listType: ListType
  onToggle: (uuid: string, checked: boolean) => void
  /** Тап по бейджу статуса пункта (только tasks) — открыть меню смены. */
  onOpenStatus?: ((uuid: string) => void) | undefined
  /** Количество комментариев треда пункта (жёлтый чип в мета-строке при > 0). */
  commentsCount?: number
  /** Тап по чипу/иконке комментариев — открыть тред пункта (один тап). */
  onOpenComments?: (uuid: string) => void
  /**
   * Тап по иконке «допатрибуты» (или названию) — открыть единую шторку
   * AttributesSheet пункта. Раскрытия строки инлайн больше нет.
   */
  onOpenAttributes?: ((uuid: string) => void) | undefined
  /**
   * Подтверждённое удаление из свайп-действия: свайп влево открывает кнопку
   * «Удалить», тап по ней = подтверждение (без Alert). Без пропа свайпа нет.
   */
  onSwipeDelete?: ((uuid: string) => void) | undefined
}

const ItemRowComponent: React.FC<ItemRowProps> = ({
  item,
  listType,
  onToggle,
  onOpenStatus,
  commentsCount = 0,
  onOpenComments,
  onOpenAttributes,
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
  const tags = parseTags(item.tags)
  const hasDeadlineChip = listType === 'tasks' && item.deadline != null
  const hasLink = item.link !== null && item.link.length > 0
  // 5: точка-индикатор на иконке «допатрибуты» — есть хоть один атрибут
  const hasAttributes =
    item.deadline != null || item.reminderAt !== null || hasLink || tags.length > 0
  const hasMetaIndicator = item.reminderAt !== null || hasLink
  const hasMetaLine =
    isTask || hasDeadlineChip || hasMetaIndicator || tags.length > 0 || commentsCount > 0

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
        {/* Фикс «второго тапа»: metaLine — сестра Pressable названия, не потомок */}
        <View style={styles.main}>
          <Pressable
            style={styles.nameTap}
            hitSlop={{ top: 12, bottom: hasMetaLine ? 0 : 12 }}
            onPress={
              onOpenAttributes !== undefined ? () => onOpenAttributes(item.uuid) : undefined
            }
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
          {/* 3: ТОЛЬКО заполненные атрибуты чипами + жёлтый чип комментариев */}
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
        <RowControls
          uuid={item.uuid}
          hasAttributes={hasAttributes}
          commentsCount={commentsCount}
          onOpenComments={onOpenComments}
          onOpenAttributes={onOpenAttributes}
        />
      </View>
    </View>
    </Swipeable>
  )
}

// ---- RowControls ------------------------------------------------------------

interface RowControlsProps {
  uuid: string
  hasAttributes: boolean
  commentsCount: number
  onOpenComments: ((uuid: string) => void) | undefined
  onOpenAttributes: ((uuid: string) => void) | undefined
}

/**
 * Правые контролы строки (вместо шеврона): серая иконка комментариев (только
 * когда треда ещё нет — при commentsCount > 0 вход живёт жёлтым чипом в
 * мета-строке) + иконка «допатрибуты» с жёлтой точкой при заданных атрибутах.
 */
const RowControls: React.FC<RowControlsProps> = ({
  uuid,
  hasAttributes,
  commentsCount,
  onOpenComments,
  onOpenAttributes,
}) => {
  const { colors } = useTheme()
  return (
    <View style={styles.controls}>
      {onOpenComments !== undefined && commentsCount === 0 && (
        <Pressable
          onPress={() => onOpenComments(uuid)}
          accessibilityRole="button"
          accessibilityLabel="Комментарии"
          hitSlop={6}
          style={styles.controlBtn}
        >
          <Ionicons name="chatbubble-outline" size={16} color={colors.textTertiary} />
        </Pressable>
      )}
      {onOpenAttributes !== undefined && (
        <Pressable
          onPress={() => onOpenAttributes(uuid)}
          accessibilityRole="button"
          accessibilityLabel="Допатрибуты"
          hitSlop={6}
          style={styles.controlBtn}
        >
          <Ionicons name="options-outline" size={16} color={colors.textTertiary} />
          {hasAttributes && (
            <View
              testID="item-attributes-dot"
              style={[styles.dot, { backgroundColor: colors.amber }]}
            />
          )}
        </Pressable>
      )}
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
  controls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  controlBtn: { padding: 5 },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
})

// 3.5: memo — ввод в одном пункте не перерисовывает остальные строки списка
const ItemRow = React.memo(ItemRowComponent)

export default ItemRow
