import React, { useEffect, useState } from 'react'
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import AttributesSheetRow from '@/components/lists/AttributesSheetRow'
import { useSheetDragToClose } from '@/hooks/useSheetDragToClose'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import {
  ATTRIBUTE_ORDER,
  type AttributeSheetValue,
  type ItemAttribute,
  type ItemAttributeValues,
} from '@/utils/itemAttributes'

export interface AttributesSheetProps {
  visible: boolean
  /** Текущие значения атрибутов пункта (или черновика нового пункта). */
  values: ItemAttributeValues
  accentColor: string
  accentBg: string
  /** Название пункта — подзаголовок шапки; undefined — подзаголовка нет. */
  name?: string | undefined
  /** Сохранение названия (blur/Enter, непустое); undefined — подзаголовок read-only. */
  onRename?: ((name: string) => void) | undefined
  /** Количество (только goods); undefined — строка скрыта. */
  quantity?: number | undefined
  onQuantityChange?: ((quantity: number) => void) | undefined
  /** Коммит значения атрибута — применяется сразу (мутация или черновик). */
  onChangeAttribute: (attribute: ItemAttribute, value: AttributeSheetValue) => void
  /** «Удалить пункт» в футере (после подтверждения); undefined — футер скрыт. */
  onDelete?: (() => void) | undefined
  /** Режим композера: «Отмена» — откат черновика и закрытие (футер вместо «Удалить пункт»). */
  onCancel?: (() => void) | undefined
  /** Режим композера: «Готово» — подтвердить черновик и закрыть. */
  onDone?: (() => void) | undefined
  onClose: () => void
}

/**
 * Единая шторка «Допатрибуты»: шапка (иконка + заголовок + подзаголовок-название
 * пункта + «×») + количество (goods) + все атрибуты (дедлайн/напоминание/
 * ссылка/тег) с инлайн-редакторами + футер: «Удалить пункт» (существующий
 * пункт) либо «Отмена»/«Готово» (композер). Паттерн bottom-sheet как у
 * CommentsSheet: свайп вниз по drag-зоне закрывает (useSheetDragToClose),
 * scrim закрывает по тапу.
 */
const AttributesSheet: React.FC<AttributesSheetProps> = ({
  visible,
  values,
  accentColor,
  accentBg,
  name,
  onRename,
  quantity,
  onQuantityChange,
  onChangeAttribute,
  onDelete,
  onCancel,
  onDone,
  onClose,
}) => {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { panHandlers, translateY } = useSheetDragToClose(visible ? true : null, onClose)
  const [expandedAttr, setExpandedAttr] = useState<ItemAttribute | null>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (visible) setExpandedAttr(null)
  }, [visible])

  // Android: KeyboardAvoidingView behavior=undefined не поднимает контент —
  // сдвигаем лист вручную на высоту клавиатуры (как в CommentsSheet).
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height)
    })
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  if (!visible) return null

  const confirmDelete = (): void => {
    Alert.alert('Удалить пункт?', 'Действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => onDelete?.() },
    ])
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Закрыть шторку" />
        <Animated.View
          testID="attributes-sheet"
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + 16,
              marginBottom: keyboardHeight,
              transform: [{ translateY }],
            },
          ]}
        >
          <View testID="attributes-sheet-drag-zone" {...panHandlers}>
            <View style={styles.grabber} />
            <View style={styles.header}>
              <View style={[styles.headerIcon, { backgroundColor: accentBg }]}>
                <Ionicons name="options-outline" size={18} color={accentColor} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Допатрибуты</Text>
                {name !== undefined && (
                  <NameSubtitle name={name} onRename={onRename} />
                )}
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
                hitSlop={8}
                testID="attributes-sheet-close"
                style={[styles.closeBtn, { backgroundColor: colors.borderSubtle }]}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {quantity !== undefined && onQuantityChange !== undefined && (
              <QuantityRow
                quantity={quantity}
                accentColor={accentColor}
                onQuantityChange={onQuantityChange}
              />
            )}
            {ATTRIBUTE_ORDER.map((attr) => (
              <AttributesSheetRow
                key={attr}
                attribute={attr}
                values={values}
                expanded={expandedAttr === attr}
                accentColor={accentColor}
                accentBg={accentBg}
                onToggle={() => setExpandedAttr((prev) => (prev === attr ? null : attr))}
                onCommit={(value) => onChangeAttribute(attr, value)}
                onClear={() => onChangeAttribute(attr, attr === 'tag' ? [] : null)}
              />
            ))}
          </ScrollView>

          {onDelete !== undefined && (
            <Pressable
              onPress={confirmDelete}
              accessibilityRole="button"
              accessibilityLabel="Удалить пункт"
              testID="attributes-sheet-delete"
              style={[styles.deleteBtn, { borderTopColor: colors.borderSubtle }]}
            >
              <Ionicons name="trash-outline" size={15} color={colors.danger} />
              <Text style={[styles.deleteText, { color: colors.danger }]}>Удалить пункт</Text>
            </Pressable>
          )}
          {onDelete === undefined && onDone !== undefined && (
            <View style={styles.composerFooter}>
              {onCancel !== undefined && (
                <Pressable
                  onPress={onCancel}
                  accessibilityRole="button"
                  accessibilityLabel="Отмена"
                  style={[styles.cancelBtn, { borderColor: colors.borderInput }]}
                >
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Отмена</Text>
                </Pressable>
              )}
              <Pressable
                onPress={onDone}
                accessibilityRole="button"
                accessibilityLabel="Готово"
                style={[styles.doneBtn, { backgroundColor: accentColor }]}
              >
                <Text style={styles.doneText}>Готово</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ---- NameSubtitle -----------------------------------------------------------

interface NameSubtitleProps {
  name: string
  onRename: ((name: string) => void) | undefined
}

/**
 * Подзаголовок шапки — название пункта (по макету). С onRename это инпут
 * без рамки: коммит по blur/Enter, пустое/неизменённое имя не сохраняется,
 * черновик пересинхронизируется при внешнем изменении (напр. после pull).
 * Без onRename (композер) — просто текст.
 */
const NameSubtitle: React.FC<NameSubtitleProps> = ({ name, onRename }) => {
  const { colors } = useTheme()
  const [draft, setDraft] = useState(name)

  useEffect(() => {
    setDraft(name)
  }, [name])

  if (onRename === undefined) {
    return (
      <Text numberOfLines={1} style={[styles.subtitle, { color: colors.textSecondary }]}>
        {name}
      </Text>
    )
  }

  const commit = (): void => {
    const next = draft.trim()
    if (next.length === 0 || next === name) {
      setDraft(name)
      return
    }
    onRename(next)
  }

  return (
    <TextInput
      value={draft}
      onChangeText={setDraft}
      onBlur={commit}
      onSubmitEditing={commit}
      returnKeyType="done"
      testID="item-name-input"
      accessibilityLabel="Название пункта"
      style={[styles.subtitleInput, { color: colors.textSecondary }]}
    />
  )
}

// ---- QuantityRow ------------------------------------------------------------

interface QuantityRowProps {
  quantity: number
  accentColor: string
  onQuantityChange: (quantity: number) => void
}

const QuantityRow: React.FC<QuantityRowProps> = ({ quantity, accentColor, onQuantityChange }) => {
  const { colors } = useTheme()
  return (
    <View style={[styles.quantityRow, { borderBottomColor: colors.borderSubtle }]}>
      <Text style={[styles.quantityLabel, { color: colors.textSecondary }]}>Количество</Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
          style={[styles.stepBtn, { borderColor: colors.borderInput }]}
          accessibilityRole="button"
          accessibilityLabel="Уменьшить"
        >
          <Text style={[styles.stepIcon, { color: accentColor }]}>−</Text>
        </Pressable>
        <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{quantity}</Text>
        <Pressable
          onPress={() => onQuantityChange(quantity + 1)}
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
  flex: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(31,38,34,0.32)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
    maxHeight: '85%',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e2e2',
    alignSelf: 'center',
    marginBottom: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 1 },
  headerTitle: { ...typography.body, fontSize: 17, fontWeight: '700' },
  subtitle: { ...typography.bodySm, fontSize: 12 },
  subtitleInput: { ...typography.bodySm, fontSize: 12, paddingVertical: 0 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flexGrow: 0 },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  quantityLabel: { ...typography.bodySm, fontWeight: '600' },
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingBottom: 2,
  },
  deleteText: { ...typography.bodySm, fontWeight: '600' },
  composerFooter: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { ...typography.buttonLabel, fontSize: 15, fontWeight: '600' },
  doneBtn: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { ...typography.buttonLabel, fontSize: 15, fontWeight: '700', color: '#fff' },
})

export default AttributesSheet
