import React, { useEffect, useState } from 'react'
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import type { ListType } from '@/db/repositories/shoppingListsRepo'
import { useShoppingLists } from '@/hooks/useShoppingLists'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

interface TypeOption {
  value: ListType
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  description: string
}

/** Минимальный зазор над safe-area сверху, чтобы шторка не уезжала под статусбар. */
const MIN_TOP_GAP = 12

const TYPE_OPTIONS: readonly TypeOption[] = [
  {
    value: 'goods',
    icon: 'bag-handle',
    label: 'Купить',
    description: 'Покупки — отмечайте, что куплено',
  },
  {
    value: 'tasks',
    icon: 'list',
    label: 'Сделать',
    description: 'Дела — отмечайте, что сделано',
  },
]

export default function NewListScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { createList } = useShoppingLists()
  const [title, setTitle] = useState('')
  const [listType, setListType] = useState<ListType>('goods')
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const accentColor = listType === 'tasks' ? colors.amber : colors.accent

  // Экран — transparentModal (react-navigation): на Android окно не resize'ится
  // под клавиатуру, поэтому KeyboardAvoidingView не поднимает лист и кнопка
  // «Создать задачу» уходит под клавиатуру. Поднимаем шторку вручную на высоту
  // клавиатуры (обе платформы) — весь контент (поле + карточки + кнопка) остаётся
  // над клавиатурой.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height)
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  const handleCreate = (): void => {
    const trimmed = title.trim()
    if (trimmed.length === 0) return
    createList.mutate(
      { title: trimmed, type: listType },
      { onSuccess: (list) => router.replace(`/lists/${list.uuid}`) },
    )
  }

  return (
    <View style={styles.overlay}>
      <Stack.Screen
        options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', headerShown: false }}
      />
      <Pressable
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel="Закрыть"
        onPress={() => router.back()}
      />
      <View
        testID="new-list-sheet"
        style={[
          styles.sheet,
          {
            backgroundColor: colors.screenBg,
            marginTop: insets.top + MIN_TOP_GAP,
            marginBottom: keyboardHeight,
            paddingBottom: keyboardHeight > 0 ? 16 : insets.bottom + 16,
          },
        ]}
      >
        <ScrollView
          testID="new-list-scroll"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.borderInput }]} />
            </View>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Новая задача</Text>
            <View style={styles.fieldBlock}>
              <TextInput
                accessibilityLabel="Название задачи"
                placeholder="Название задачи"
                placeholderTextColor={colors.textTertiary}
                value={title}
                onChangeText={setTitle}
                style={[
                  styles.titleInput,
                  {
                    color: colors.textPrimary,
                    backgroundColor: colors.surface,
                    borderColor: colors.borderInput,
                  },
                ]}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>ВИД ЗАДАЧИ</Text>
              <View style={styles.typeCards}>
                {TYPE_OPTIONS.map((opt) => {
                  const isActive = opt.value === listType
                  const optAccent = opt.value === 'tasks' ? colors.amber : colors.accent
                  const optBg = opt.value === 'tasks' ? colors.amberBg : colors.accentSoftBg

                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setListType(opt.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isActive }}
                      style={[
                        styles.typeCard,
                        {
                          backgroundColor: isActive ? optBg : colors.surface,
                          borderColor: isActive ? optAccent : colors.borderInput,
                        },
                      ]}
                    >
                      <View style={[styles.typeIconWrap, { backgroundColor: optBg }]}>
                        <Ionicons name={opt.icon} size={24} color={optAccent} />
                      </View>
                      <View style={styles.typeInfo}>
                        <Text style={[styles.typeLabel, { color: colors.textPrimary }]}>
                          {opt.label}
                        </Text>
                        <Text style={[styles.typeDesc, { color: colors.textSecondary }]}>
                          {opt.description}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.radioOuter,
                          { borderColor: isActive ? optAccent : colors.textTertiary },
                        ]}
                      >
                        {isActive && (
                          <View style={[styles.radioDot, { backgroundColor: optAccent }]} />
                        )}
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Создать задачу"
              onPress={handleCreate}
              disabled={title.trim().length === 0 || createList.isPending}
              style={({ pressed }) => [
                styles.createBtn,
                { backgroundColor: title.trim().length > 0 ? accentColor : colors.textFaint },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.createBtnLabel}>Создать задачу</Text>
            </Pressable>
          </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    // Шторка размерится по контенту и встанет снизу (overlay/kav — justifyContent
    // flex-end). maxHeight ограничивает на маленьких экранах — тогда ScrollView
    // прокручивается. НЕ ставить flex:1 на ScrollView: внутри auto-height шторки
    // это схлопывало её в ~0 (был виден лишь скруглённый верх у нижнего края).
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: { padding: 20, paddingTop: 8, gap: 24 },
  handleWrap: { alignItems: 'center', paddingBottom: 8 },
  handle: { width: 42, height: 5, borderRadius: 3 },
  sheetTitle: { ...typography.cardTitle, fontSize: 21, fontWeight: '700' },
  fieldBlock: { gap: 8 },
  fieldLabel: { ...typography.sectionLabel },
  titleInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  typeCards: { gap: 10 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: { flex: 1, gap: 2 },
  typeLabel: { ...typography.body, fontWeight: '700' },
  typeDesc: { ...typography.bodySm },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  createBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pressed: { opacity: 0.85 },
  createBtnLabel: { ...typography.buttonLabel, color: '#fff' },
})
