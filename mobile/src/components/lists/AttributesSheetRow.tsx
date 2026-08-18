import React, { useEffect, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import SheetContent from '@/components/lists/AttributeSheetContent'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import {
  ATTRIBUTE_ICONS,
  ATTRIBUTE_LABELS,
  formatAttributeToken,
  isAttributeSet,
  type AttributeSheetValue,
  type ItemAttribute,
  type ItemAttributeValues,
} from '@/utils/itemAttributes'

interface AttributesSheetRowProps {
  attribute: ItemAttribute
  values: ItemAttributeValues
  expanded: boolean
  accentColor: string
  accentBg: string
  onToggle: () => void
  /** Коммит нового значения атрибута (сразу применяется к пункту/черновику). */
  onCommit: (value: AttributeSheetValue) => void
  onClear: () => void
}

/**
 * Строка одного атрибута в шторке «Допатрибуты»: шапка (иконка + лейбл +
 * значение/«Не задано» + «×» + шеврон) и инлайн-редактор под ней (раскрытие
 * по тапу). Дедлайн/напоминание/тег редактируются через SheetContent
 * (пресеты коммитятся сразу), ссылка — своим полем с коммитом по blur/Enter.
 */
const AttributesSheetRow: React.FC<AttributesSheetRowProps> = ({
  attribute,
  values,
  expanded,
  accentColor,
  accentBg,
  onToggle,
  onCommit,
  onClear,
}) => {
  const { colors } = useTheme()
  const [pendingTag, setPendingTag] = useState('')
  const isSet = isAttributeSet(attribute, values)
  const label = ATTRIBUTE_LABELS[attribute]
  const token = formatAttributeToken(attribute, values)

  // «Висящий» текст нового тега подтверждается при сворачивании строки —
  // явный Enter/«+» не обязателен (паттерн прежней шторки с «Готово»).
  useEffect(() => {
    if (expanded) return
    const trimmed = pendingTag.trim()
    if (trimmed.length === 0) return
    if (!values.tags.includes(trimmed)) onCommit([...values.tags, trimmed])
    setPendingTag('')
  }, [expanded, pendingTag, values.tags, onCommit])

  return (
    <View style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={isSet ? `${label}: ${token}` : `Добавить: ${label}`}
        style={styles.header}
      >
        <View style={[styles.headerIcon, { backgroundColor: accentBg }]}>
          <Ionicons
            name={ATTRIBUTE_ICONS[attribute] as React.ComponentProps<typeof Ionicons>['name']}
            size={16}
            color={accentColor}
          />
        </View>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text
          numberOfLines={1}
          style={[styles.value, { color: isSet ? accentColor : colors.textTertiary }]}
        >
          {isSet ? token : 'Не задано'}
        </Text>
        {isSet && (
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel={`Удалить ${label.toLowerCase()}`}
            hitSlop={8}
            style={styles.clearBtn}
          >
            <Ionicons name="close" size={15} color={colors.textTertiary} />
          </Pressable>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textTertiary}
        />
      </Pressable>

      {expanded && (
        <View style={styles.editor}>
          {attribute === 'link' ? (
            <LinkEditor current={values.link} accentColor={accentColor} onCommit={onCommit} />
          ) : (
            <SheetContent
              attribute={attribute}
              draft={attribute === 'tag' ? values.tags : draftFor(attribute, values)}
              deadline={values.deadline}
              accentColor={accentColor}
              onChange={onCommit}
              onPendingTagChange={setPendingTag}
            />
          )}
        </View>
      )}
    </View>
  )
}

const draftFor = (attribute: ItemAttribute, values: ItemAttributeValues): string | null =>
  attribute === 'deadline' ? values.deadline : values.reminderAt

// ---- LinkEditor -------------------------------------------------------------

interface LinkEditorProps {
  current: string | null
  accentColor: string
  onCommit: (value: AttributeSheetValue) => void
}

/** Поле ссылки: черновик локально, коммит по blur/Enter (пустое = снять ссылку). */
const LinkEditor: React.FC<LinkEditorProps> = ({ current, accentColor, onCommit }) => {
  const { colors } = useTheme()
  const [draft, setDraft] = useState(current ?? '')

  useEffect(() => {
    setDraft(current ?? '')
  }, [current])

  const commit = (): void => {
    const trimmed = draft.trim()
    if (trimmed === (current ?? '')) return
    onCommit(trimmed.length > 0 ? trimmed : null)
  }

  return (
    <TextInput
      value={draft}
      onChangeText={setDraft}
      onBlur={commit}
      onSubmitEditing={commit}
      placeholder="Вставьте ссылку"
      placeholderTextColor={colors.textTertiary}
      autoCapitalize="none"
      keyboardType="url"
      returnKeyType="done"
      style={[styles.linkInput, { borderColor: colors.borderInput, color: colors.textPrimary }]}
      accessibilityLabel="Ссылка"
      selectionColor={accentColor}
    />
  )
}

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.body, fontWeight: '600' },
  value: { ...typography.bodySm, fontSize: 12, flex: 1, textAlign: 'right' },
  clearBtn: { padding: 2 },
  editor: { paddingBottom: 12, paddingTop: 2 },
  linkInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    ...typography.body,
  },
})

export default AttributesSheetRow
