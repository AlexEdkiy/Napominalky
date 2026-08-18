import React, { useEffect, useState } from 'react'
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { useItemComments } from '@/hooks/useItemComments'
import { useSheetDragToClose } from '@/hooks/useSheetDragToClose'
import type { ShoppingListItemComment } from '@/db/repositories/itemCommentsRepo'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { formatCommentTimestamp } from '@/utils/datetime'

interface CommentsSheetProps {
  /** uuid пункта, чей тред открыт (null — шторка скрыта). */
  itemUuid: string | null
  listUuid: string
  accentColor: string
  accentBg: string
  /** Название пункта — подзаголовок шапки (по макету). */
  itemName?: string | undefined
  onClose: () => void
}

/**
 * Шторка треда комментариев пункта: список (автор жирным, время
 * «ЧЧ:ММ ДД.ММ.ГГ», текст, «×» с подтверждением) + поле ввода + «Отправить».
 * Автор и время нового комментария проставляются автоматически.
 * Заменяет одиночный редактор comment (атрибут «Комментарий» удалён).
 */
const CommentsSheet: React.FC<CommentsSheetProps> = ({
  itemUuid,
  listUuid,
  accentColor,
  accentBg,
  itemName,
  onClose,
}) => {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  // Свайп вниз по drag-зоне (ручка + заголовок) закрывает шторку, как в AttributeSheet.
  const { panHandlers, translateY } = useSheetDragToClose(itemUuid, onClose)
  const { comments, addComment, deleteComment } = useItemComments(itemUuid ?? '', listUuid)
  const [draft, setDraft] = useState('')
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const visible = itemUuid !== null

  useEffect(() => {
    if (itemUuid !== null) setDraft('')
  }, [itemUuid])

  // Android: KeyboardAvoidingView behavior=undefined не поднимает контент —
  // сдвигаем лист вручную на высоту клавиатуры (как в AttributeSheet).
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

  const trimmed = draft.trim()
  const canSend = trimmed.length > 0

  const handleSend = (): void => {
    if (!canSend) return
    addComment.mutate(trimmed)
    setDraft('')
  }

  const confirmDelete = (uuid: string): void => {
    Alert.alert('Удалить комментарий?', 'Действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => deleteComment.mutate(uuid) },
    ])
  }

  if (!visible) return null

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Закрыть шторку" />
        <Animated.View
          testID="comments-sheet"
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
          <View testID="comments-sheet-drag-zone" {...panHandlers}>
            <View style={styles.grabber} />
            <View style={styles.header}>
              <View style={[styles.headerIcon, { backgroundColor: accentBg }]}>
                <Ionicons name="chatbubble-outline" size={18} color={accentColor} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Комментарии</Text>
                {itemName !== undefined && (
                  <Text
                    numberOfLines={1}
                    style={[styles.subtitle, { color: colors.textSecondary }]}
                  >
                    {itemName}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
                hitSlop={8}
                testID="comments-sheet-close"
                style={[styles.closeBtn, { backgroundColor: colors.borderSubtle }]}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(comment) => comment.uuid}
            style={styles.thread}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: comment }) => (
              <CommentRow comment={comment} onDelete={confirmDelete} />
            )}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.textTertiary }]}>
                Комментариев пока нет
              </Text>
            }
          />

          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Написать комментарий"
              placeholderTextColor={colors.textTertiary}
              multiline
              style={[styles.input, { borderColor: colors.borderInput, color: colors.textPrimary }]}
              accessibilityLabel="Новый комментарий"
              selectionColor={accentColor}
            />
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Отправить"
              accessibilityState={{ disabled: !canSend }}
              style={[styles.sendBtn, { backgroundColor: canSend ? accentColor : colors.borderSubtle }]}
            >
              <Text style={[styles.sendText, { color: canSend ? '#fff' : colors.textTertiary }]}>
                Отправить
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ---- CommentRow -------------------------------------------------------------

interface CommentRowProps {
  comment: ShoppingListItemComment
  onDelete: (uuid: string) => void
}

/** Один комментарий треда: автор (жирным) + время + «×», ниже — текст. */
const CommentRow: React.FC<CommentRowProps> = ({ comment, onDelete }) => {
  const { colors } = useTheme()
  return (
    <View style={[styles.comment, { borderBottomColor: colors.borderSubtle }]}>
      <View style={styles.commentHead}>
        <Text numberOfLines={1} style={[styles.commentAuthor, { color: colors.textPrimary }]}>
          {comment.authorName}
        </Text>
        <Text style={[styles.commentTime, { color: colors.textTertiary }]}>
          {formatCommentTimestamp(comment.createdAt)}
        </Text>
        <Pressable
          onPress={() => onDelete(comment.uuid)}
          accessibilityRole="button"
          accessibilityLabel="Удалить комментарий"
          hitSlop={8}
          style={styles.commentDelete}
        >
          <Ionicons name="close" size={14} color={colors.textTertiary} />
        </Pressable>
      </View>
      <Text style={[styles.commentBody, { color: colors.textSecondary }]}>{comment.body}</Text>
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
    maxHeight: '80%',
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
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thread: { flexGrow: 0 },
  empty: { ...typography.bodySm, paddingVertical: 12, textAlign: 'center' },
  comment: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthor: { ...typography.bodySm, fontWeight: '700', flexShrink: 1 },
  commentTime: { ...typography.bodySm, fontSize: 11 },
  commentDelete: { marginLeft: 'auto', padding: 2 },
  commentBody: { ...typography.bodySm },
  inputRow: { gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    minHeight: 44,
    maxHeight: 110,
    ...typography.body,
  },
  sendBtn: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { ...typography.buttonLabel, fontSize: 15, fontWeight: '700' },
})

export default CommentsSheet
