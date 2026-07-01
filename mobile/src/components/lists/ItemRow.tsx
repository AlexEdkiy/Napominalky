import React, { useState } from 'react'
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { ListType, ShoppingListItem } from '@/db/repositories/shoppingListsRepo'
import { parseTags, serializeTags } from '@/db/repositories/shoppingListsRepo'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { formatDeadlineDisplay } from '@/utils/datetime'

interface ItemRowProps {
  item: ShoppingListItem
  listType: ListType
  onToggle: (uuid: string, checked: boolean) => void
  onDelete: (uuid: string) => void
  onExpand?: (uuid: string) => void
  isExpanded?: boolean
  onQuantityChange?: (uuid: string, quantity: number) => void
  onDeadlinePress?: (uuid: string) => void
  onReminderPress?: (uuid: string) => void
  onUpdateMeta?: (uuid: string, patch: MetaPatch) => void
}

export interface MetaPatch {
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
  onDeadlinePress,
  onReminderPress,
  onUpdateMeta,
}) => {
  const { colors } = useTheme()
  const accentColor = listType === 'tasks' ? colors.amber : colors.accent
  const accentBg = listType === 'tasks' ? colors.amberBg : colors.accentSoftBg
  const checkboxRadius = listType === 'tasks' ? 10 : 7
  const firstTag = parseTags(item.tags)[0]
  const hasDeadlineChip = listType === 'tasks' && item.deadline != null
  const hasMetaIndicator =
    item.reminderAt !== null ||
    (item.comment !== null && item.comment.length > 0) ||
    (item.link !== null && item.link.length > 0)
  const hasMetaLine = hasDeadlineChip || hasMetaIndicator

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface }]}>
      <View style={styles.row}>
        <View
          style={[
            styles.accent,
            { backgroundColor: accentColor, opacity: item.isChecked ? 0.4 : 1 },
          ]}
        />
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
            {firstTag !== undefined && (
              <View style={[styles.chip, { backgroundColor: colors.borderSubtle }]}>
                <Text style={[styles.chipText, { color: colors.textSecondary }]}>#{firstTag}</Text>
              </View>
            )}
            {listType === 'goods' && item.quantity > 1 && (
              <View style={[styles.chip, { backgroundColor: accentBg }]}>
                <Text style={[styles.chipText, { color: accentColor }]}>×{item.quantity}</Text>
              </View>
            )}
          </View>
          {/* DEF-06/3.6: чип дедлайна и мета-иконки — единый горизонтальный ряд */}
          {hasMetaLine && (
            <View style={styles.metaLine}>
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
        <ExpandedEditor
          item={item}
          listType={listType}
          accentColor={accentColor}
          onQuantityChange={onQuantityChange}
          onDeadlinePress={onDeadlinePress}
          onReminderPress={onReminderPress}
          onUpdateMeta={onUpdateMeta}
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

// ---- ExpandedEditor --------------------------------------------------------

interface ExpandedEditorProps {
  item: ShoppingListItem
  listType: ListType
  accentColor: string
  onQuantityChange: ((uuid: string, quantity: number) => void) | undefined
  onDeadlinePress: ((uuid: string) => void) | undefined
  onReminderPress: ((uuid: string) => void) | undefined
  onUpdateMeta: ((uuid: string, patch: MetaPatch) => void) | undefined
  onDelete: (uuid: string) => void
}

const ExpandedEditor: React.FC<ExpandedEditorProps> = ({
  item,
  listType,
  accentColor,
  onQuantityChange,
  onDeadlinePress,
  onReminderPress,
  onUpdateMeta,
  onDelete,
}) => {
  const { colors } = useTheme()
  const [tagInput, setTagInput] = useState('')
  // 3.5: локальный state для link/comment — value инпута обновляется мгновенно,
  // персист на сервер/в БД идёт через debounce, а не наоборот.
  const [linkDraft, setLinkDraft] = useState(item.link ?? '')
  const [commentDraft, setCommentDraft] = useState(item.comment ?? '')
  const [draftUuid, setDraftUuid] = useState(item.uuid)
  const tags = parseTags(item.tags)

  if (draftUuid !== item.uuid) {
    setDraftUuid(item.uuid)
    setLinkDraft(item.link ?? '')
    setCommentDraft(item.comment ?? '')
  }

  const debouncedLink = useDebouncedCallback(
    (val: string) => onUpdateMeta?.(item.uuid, { link: val.length > 0 ? val : null }),
    600,
  )

  const debouncedComment = useDebouncedCallback(
    (val: string) => onUpdateMeta?.(item.uuid, { comment: val.length > 0 ? val : null }),
    600,
  )

  const handleLinkChange = (val: string): void => {
    setLinkDraft(val)
    debouncedLink(val)
  }

  const handleCommentChange = (val: string): void => {
    setCommentDraft(val)
    debouncedComment(val)
  }

  const handleAddTag = (): void => {
    const trimmed = tagInput.trim()
    if (trimmed.length === 0 || tags.includes(trimmed)) return
    onUpdateMeta?.(item.uuid, { tags: serializeTags([...tags, trimmed]) })
    setTagInput('')
  }

  const handleRemoveTag = (tag: string): void => {
    onUpdateMeta?.(item.uuid, { tags: serializeTags(tags.filter((t) => t !== tag)) })
  }

  const handleOpenLink = (): void => {
    if (item.link !== null && item.link.length > 0) {
      void Linking.openURL(item.link)
    }
  }

  const inputStyle = [
    styles.metaInput,
    { borderColor: colors.borderInput, color: colors.textPrimary },
  ]

  return (
    <View
      style={[
        styles.expanded,
        { borderTopColor: colors.borderSubtle, backgroundColor: colors.screenBg },
      ]}
    >
      {/* DEF-02: компактные строки «иконка + значение» без uppercase-лейблов */}
      {listType === 'goods' ? (
        <QuantityRow item={item} accentColor={accentColor} onQuantityChange={onQuantityChange} />
      ) : (
        <DeadlineRow item={item} accentColor={accentColor} onDeadlinePress={onDeadlinePress} />
      )}

      <MetaRow icon="notifications-outline" color={accentColor}>
        <Pressable
          onPress={() => onReminderPress?.(item.uuid)}
          style={[styles.deadlineBtn, { borderColor: colors.borderInput }]}
          accessibilityRole="button"
          accessibilityLabel="Установить напоминание"
        >
          <Text
            style={[
              styles.deadlineBtnText,
              { color: item.reminderAt !== null ? colors.textPrimary : colors.textTertiary },
            ]}
          >
            {item.reminderAt !== null ? formatReminderAt(item.reminderAt) : 'Добавить напоминание'}
          </Text>
          {item.reminderAt !== null && (
            <Pressable
              onPress={() => onUpdateMeta?.(item.uuid, { reminderAt: null })}
              accessibilityRole="button"
              accessibilityLabel="Сбросить напоминание"
              style={styles.clearBtn}
            >
              <Ionicons name="close" size={14} color={colors.textTertiary} />
            </Pressable>
          )}
        </Pressable>
      </MetaRow>

      <MetaRow icon="link-outline" color={accentColor}>
        {item.link !== null && item.link.length > 0 ? (
          <Pressable onPress={handleOpenLink} style={styles.linkPressable}>
            <Text numberOfLines={1} style={[styles.linkText, { color: accentColor }]}>
              {item.link}
            </Text>
          </Pressable>
        ) : null}
        <TextInput
          value={linkDraft}
          onChangeText={handleLinkChange}
          onEndEditing={(e) => {
            const val = e.nativeEvent.text
            onUpdateMeta?.(item.uuid, { link: val.length > 0 ? val : null })
          }}
          placeholder="Добавить ссылку"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          keyboardType="url"
          style={inputStyle}
          accessibilityLabel="Ссылка"
        />
      </MetaRow>

      <MetaRow icon="chatbubble-outline" color={accentColor}>
        <TextInput
          value={commentDraft}
          onChangeText={handleCommentChange}
          onEndEditing={(e) => {
            const val = e.nativeEvent.text
            onUpdateMeta?.(item.uuid, { comment: val.length > 0 ? val : null })
          }}
          placeholder="Добавить комментарий"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[inputStyle, styles.metaInputMulti]}
          accessibilityLabel="Комментарий"
        />
      </MetaRow>

      <MetaRow icon="pricetag-outline" color={accentColor}>
        <View style={styles.tagsWrap}>
          {tags.map((tag) => (
            <View key={tag} style={[styles.tagChip, { backgroundColor: colors.borderSubtle }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
              <Pressable
                onPress={() => handleRemoveTag(tag)}
                accessibilityRole="button"
                accessibilityLabel={`Удалить тег ${tag}`}
              >
                <Ionicons name="close" size={12} color={colors.textTertiary} />
              </Pressable>
            </View>
          ))}
          <View style={[styles.tagInput, { borderColor: colors.borderInput }]}>
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
              placeholder="+ тег"
              placeholderTextColor={colors.textTertiary}
              style={[styles.tagInputText, { color: colors.textPrimary }]}
              returnKeyType="done"
              accessibilityLabel="Добавить тег"
            />
          </View>
        </View>
      </MetaRow>

      {/* DEF-01: кнопка удаления перенесена в раскрытый редактор */}
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

interface MetaRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name']
  color: string
  children: React.ReactNode
}

const MetaRow: React.FC<MetaRowProps> = ({ icon, color, children }) => {
  const { colors } = useTheme()
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color={color} style={styles.metaIcon} />
      <View style={styles.metaContent}>{children}</View>
    </View>
  )
}

interface QuantityRowProps {
  item: ShoppingListItem
  accentColor: string
  onQuantityChange: ((uuid: string, quantity: number) => void) | undefined
}

// DEF-02: expandLabel без uppercase — компактная строка «иконка + лейбл + степпер»
const QuantityRow: React.FC<QuantityRowProps> = ({ item, accentColor, onQuantityChange }) => {
  const { colors } = useTheme()
  return (
    <View style={styles.metaRowCompact}>
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

interface DeadlineRowProps {
  item: ShoppingListItem
  accentColor: string
  onDeadlinePress: ((uuid: string) => void) | undefined
}

// DEF-02: компактная строка дедлайна — без uppercase-лейбла
const DeadlineRow: React.FC<DeadlineRowProps> = ({ item, accentColor, onDeadlinePress }) => {
  const { colors } = useTheme()
  // DEF-05: форматированная дата в раскрытии
  const deadlineText =
    item.deadline !== null ? formatDeadlineDisplay(item.deadline) : 'Указать дедлайн'
  return (
    <View style={styles.metaRowCompact}>
      <Text style={[styles.expandLabel, { color: colors.textSecondary }]}>Дедлайн</Text>
      <Pressable
        onPress={() => onDeadlinePress?.(item.uuid)}
        style={[styles.deadlineBtn, { borderColor: colors.borderInput }]}
        accessibilityRole="button"
        accessibilityLabel="Указать дедлайн"
      >
        <Ionicons name="calendar-outline" size={16} color={accentColor} />
        <Text
          style={[
            styles.deadlineBtnText,
            { color: item.deadline !== null ? colors.textPrimary : colors.textTertiary },
          ]}
        >
          {deadlineText}
        </Text>
      </Pressable>
    </View>
  )
}

// ---- Helpers ---------------------------------------------------------------

const MONTHS = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
] as const

const formatReminderAt = (iso: string): string => {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  const day = d.getDate()
  const month = MONTHS[d.getMonth()] ?? ''
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${h}:${m}`
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
  // DEF-06/3.6: чип дедлайна + иконки-индикаторы в один горизонтальный ряд
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  // DEF-02: компактная строка (горизонтальный ряд)
  metaRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    gap: 10,
  },
  metaIcon: { marginTop: 2 },
  metaContent: { flex: 1 },
  // DEF-02: убраны textTransform/letterSpacing
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
  deadlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  deadlineBtnText: { ...typography.body },
  clearBtn: { padding: 2, marginLeft: 4 },
  linkPressable: { marginBottom: 4 },
  linkText: { ...typography.bodySm, textDecorationLine: 'underline' },
  metaInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    ...typography.body,
  },
  metaInputMulti: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: { ...typography.bodySm, fontSize: 12 },
  tagInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
  },
  tagInputText: { ...typography.bodySm, fontSize: 12 },
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
