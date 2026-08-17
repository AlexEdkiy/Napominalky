import React, { useEffect, useState } from 'react'
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import SheetContent from '@/components/lists/AttributeSheetContent'
import { useSheetDragToClose } from '@/hooks/useSheetDragToClose'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { ATTRIBUTE_ICONS, type AttributeSheetValue, type ItemAttribute } from '@/utils/itemAttributes'

export type { AttributeSheetValue } from '@/utils/itemAttributes'

export interface AttributeSheetProps {
  attribute: ItemAttribute | null
  /** Текущие значения атрибутов пункта (для предзаполнения черновика). */
  currentDeadline: string | null
  currentReminderAt: string | null
  currentLink: string | null
  currentTags: string[]
  accentColor: string
  accentBg: string
  onConfirm: (value: AttributeSheetValue) => void
  onClose: () => void
}

const TITLES: Record<ItemAttribute, string> = {
  deadline: 'Когда дедлайн',
  reminder: 'Когда напомнить',
  link: 'Ссылка',
  tag: 'Выберите тег',
}

interface CurrentValues {
  currentDeadline: string | null
  currentReminderAt: string | null
  currentLink: string | null
  currentTags: string[]
}

const initialDraft = (attribute: ItemAttribute, values: CurrentValues): AttributeSheetValue => {
  switch (attribute) {
    case 'deadline':
      return values.currentDeadline
    case 'reminder':
      return values.currentReminderAt
    case 'link':
      return values.currentLink ?? ''
    case 'tag':
      return values.currentTags
    default:
      return null
  }
}

const validateDraft = (attribute: ItemAttribute, draft: AttributeSheetValue, pendingTagText = ''): boolean => {
  if (attribute === 'tag') {
    return (Array.isArray(draft) && draft.length > 0) || pendingTagText.trim().length > 0
  }
  if (typeof draft !== 'string') return false
  return draft.trim().length > 0
}

/**
 * Контекстная шторка (bottom sheet) для редактирования одного атрибута пункта.
 * Modal transparent + Animated translateY, scrim закрывает по тапу.
 * Контент по типу атрибута — в AttributeSheetContent.
 */
const AttributeSheet: React.FC<AttributeSheetProps> = ({
  attribute,
  currentDeadline,
  currentReminderAt,
  currentLink,
  currentTags,
  accentColor,
  accentBg,
  onConfirm,
  onClose,
}) => {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  // Свайп вниз по drag-зоне закрывает шторку (общий паттерн bottom-sheet).
  const { panHandlers, translateY } = useSheetDragToClose(attribute, onClose)
  const visible = attribute !== null
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const [draft, setDraft] = useState<AttributeSheetValue>(null)
  // Текст в поле «Новый тег», ещё не подтверждённый явным submit — позволяет
  // «Готово» активироваться и подтвердить его без отдельного нажатия «+».
  const [pendingTagText, setPendingTagText] = useState('')

  useEffect(() => {
    if (attribute === null) return
    setDraft(initialDraft(attribute, {
      currentDeadline, currentReminderAt, currentLink, currentTags,
    }))
    setPendingTagText('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attribute])

  // Android: KeyboardAvoidingView behavior=undefined не поднимает контент — сдвигаем
  // лист вручную на высоту клавиатуры через отдельный слушатель.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height)
    })
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0)
    })
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  if (attribute === null) return null

  const isValid = validateDraft(attribute, draft, pendingTagText)

  const handleConfirm = (): void => {
    if (!isValid) return
    if (attribute === 'tag') {
      const trimmed = pendingTagText.trim()
      const tags = Array.isArray(draft) ? draft : []
      const finalTags = trimmed.length > 0 && !tags.includes(trimmed) ? [...tags, trimmed] : tags
      onConfirm(finalTags)
      return
    }
    onConfirm(draft)
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Закрыть" />
        <Animated.View
          testID="attribute-sheet"
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
          <View testID="attribute-sheet-drag-zone" {...panHandlers}>
            <View style={styles.grabber} />
            <View style={styles.header}>
              <View style={[styles.headerIcon, { backgroundColor: accentBg }]}>
                <Ionicons
                  name={ATTRIBUTE_ICONS[attribute] as React.ComponentProps<typeof Ionicons>['name']}
                  size={18}
                  color={accentColor}
                />
              </View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{TITLES[attribute]}</Text>
            </View>
          </View>

          <SheetContent
            attribute={attribute}
            draft={draft}
            deadline={currentDeadline}
            accentColor={accentColor}
            onChange={setDraft}
            onPendingTagChange={setPendingTagText}
          />

          <Pressable
            onPress={handleConfirm}
            disabled={!isValid}
            accessibilityRole="button"
            accessibilityLabel="Готово"
            accessibilityState={{ disabled: !isValid }}
            style={[styles.doneBtn, { backgroundColor: isValid ? accentColor : colors.borderSubtle }]}
          >
            <Text style={[styles.doneText, { color: isValid ? '#fff' : colors.textTertiary }]}>Готово</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
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
    gap: 16,
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
  doneBtn: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { ...typography.buttonLabel, fontSize: 16, fontWeight: '700' },
})

export default AttributeSheet
