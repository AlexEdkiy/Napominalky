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
  /** Название пункта; undefined — поле не показывается (композер нового пункта). */
  name?: string | undefined
  /** Сохранение названия (blur/Enter, непустое). */
  onRename?: ((name: string) => void) | undefined
  /** Количество (только goods); undefined — строка скрыта. */
  quantity?: number | undefined
  onQuantityChange?: ((quantity: number) => void) | undefined
  /** Коммит значения атрибута — применяется сразу (мутация или черновик). */
  onChangeAttribute: (attribute: ItemAttribute, value: AttributeSheetValue) => void
  /** «Удалить пункт» в футере (после подтверждения); undefined — футер скрыт. */
  onDelete?: (() => void) | undefined
  onClose: () => void
}

/**
 * Единая шторка «Допатрибуты»: название пункта + количество (goods) + все
 * атрибуты (дедлайн/напоминание/ссылка/тег) с инлайн-редакторами + футер
 * «Удалить пункт». Паттерн bottom-sheet как у CommentsSheet: свайп вниз по
 * drag-зоне закрывает (useSheetDragToClose), scrim закрывает по тапу.
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
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Закрыть" />
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
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Допатрибуты</Text>
            </View>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {name !== undefined && onRename !== undefined && (
              <NameField name={name} accentColor={accentColor} onRename={onRename} />
            )}
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
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ---- NameField --------------------------------------------------------------

interface NameFieldProps {
  name: string
  accentColor: string
  onRename: (name: string) => void
}

/**
 * Редактирование названия пункта (переехало из раскрытой панели строки):
 * коммит по blur/Enter, пустое/неизменённое имя не сохраняется,
 * черновик пересинхронизируется при внешнем изменении (напр. после pull).
 */
const NameField: React.FC<NameFieldProps> = ({ name, accentColor, onRename }) => {
  const { colors } = useTheme()
  const [draft, setDraft] = useState(name)

  useEffect(() => {
    setDraft(name)
  }, [name])

  const commit = (): void => {
    const next = draft.trim()
    if (next.length === 0 || next === name) {
      setDraft(name)
      return
    }
    onRename(next)
  }

  return (
    <View style={styles.nameRow}>
      <Ionicons name="pencil-outline" size={14} color={accentColor} />
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        returnKeyType="done"
        testID="item-name-input"
        accessibilityLabel="Название пункта"
        style={[styles.nameInput, { color: colors.textPrimary, borderColor: colors.borderInput }]}
      />
    </View>
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
  headerTitle: { ...typography.body, fontSize: 17, fontWeight: '700' },
  body: { flexGrow: 0 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  nameInput: {
    ...typography.body,
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
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
})

export default AttributesSheet
