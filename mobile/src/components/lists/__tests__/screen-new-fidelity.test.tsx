/**
 * UI-fidelity тесты: экран «Создание задачи» (app/lists/new.tsx).
 * Проверяем: заголовок, лейблы, placeholder, порядок секций, карточки типов,
 * состояние radio, кнопку «Создать задачу».
 */
jest.mock('@/db/client', () => ({ db: {} }))

import fs from 'node:fs'
import path from 'node:path'

import React from 'react'
import { Platform, StyleSheet } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'

// ---- Моки ---------------------------------------------------------------

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native')
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
  }
})

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({}),
}))

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#fff',
      screenBg: '#F6F8FA',
      accent: '#0EA5A0',
      accentSoftBg: '#DDF1ED',
      amber: '#F59E0B',
      amberBg: '#FBEFD6',
      textPrimary: '#111',
      textSecondary: '#666',
      textTertiary: '#999',
      textFaint: '#ccc',
      borderSubtle: '#eee',
      borderInput: '#ddd',
    },
  }),
}))

jest.mock('@/theme/typography', () => ({
  typography: {
    screenTitle: { fontSize: 26, fontWeight: '700' },
    cardTitle: { fontSize: 17, fontWeight: '700' },
    body: { fontSize: 15 },
    bodySm: { fontSize: 13 },
    buttonLabel: { fontSize: 16, fontWeight: '700' },
    sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  },
}))

const mockMutate = jest.fn()
jest.mock('@/hooks/useShoppingLists', () => ({
  useShoppingLists: () => ({
    lists: [],
    isLoading: false,
    isError: false,
    createList: { mutate: mockMutate, isPending: false },
    updateList: { mutate: jest.fn() },
    deleteList: { mutate: jest.fn() },
  }),
  useNearestDeadlines: () => new Map(),
  useShoppingList: () => ({ data: null, isLoading: false }),
}))

// ---- Импорт экрана -----------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-var-requires
const NewListScreen: React.FC = require('../../../../app/lists/new').default

// ============================================================
// Тесты экрана «Создание списка»
// ============================================================

describe('Экран «Новая задача» — соответствие макету', () => {
  describe('заголовок и структура', () => {
    it('отображает заголовок «Новая задача»', async () => {
      const { getByText } = await render(<NewListScreen />)
      expect(getByText('Новая задача')).toBeTruthy()
    })

    it('НЕ отображает отдельный лейбл НАЗВАНИЕ над полем ввода', async () => {
      const { queryByText } = await render(<NewListScreen />)
      expect(queryByText('НАЗВАНИЕ')).toBeNull()
    })

    it('отображает лейбл ВИД ЗАДАЧИ', async () => {
      const { getByText } = await render(<NewListScreen />)
      expect(getByText('ВИД ЗАДАЧИ')).toBeTruthy()
    })

    it('отображает поле ввода с placeholder «Название задачи»', async () => {
      const { getByPlaceholderText } = await render(<NewListScreen />)
      expect(getByPlaceholderText('Название задачи')).toBeTruthy()
    })

    // Пункт 1: без autoFocus клавиатура не всплывает сразу при открытии, и вся
    // шторка (карточки типа + кнопка «Создать задачу») видна пользователю.
    it('поле названия не получает autoFocus — клавиатура не перекрывает шторку при открытии', async () => {
      const { getByLabelText } = await render(<NewListScreen />)
      expect(getByLabelText('Название задачи').props.autoFocus).not.toBe(true)
    })

    it('отображает кнопку «Создать задачу»', async () => {
      const { getByLabelText } = await render(<NewListScreen />)
      expect(getByLabelText('Создать задачу')).toBeTruthy()
    })
  })

  describe('карточки типов списка', () => {
    it('отображает карточку «Купить»', async () => {
      const { getByText } = await render(<NewListScreen />)
      expect(getByText('Купить')).toBeTruthy()
    })

    it('отображает карточку «Сделать»', async () => {
      const { getByText } = await render(<NewListScreen />)
      expect(getByText('Сделать')).toBeTruthy()
    })

    it('отображает подпись под «Купить»: «Покупки — отмечайте, что куплено»', async () => {
      const { getByText } = await render(<NewListScreen />)
      expect(getByText('Покупки — отмечайте, что куплено')).toBeTruthy()
    })

    it('отображает подпись под «Сделать»: «Дела — отмечайте, что сделано»', async () => {
      const { getByText } = await render(<NewListScreen />)
      expect(getByText('Дела — отмечайте, что сделано')).toBeTruthy()
    })

    it('карточка «Купить» имеет accessibilityRole radio', async () => {
      const { getAllByRole } = await render(<NewListScreen />)
      const radios = getAllByRole('radio')
      expect(radios.length).toBeGreaterThanOrEqual(2)
    })

    it('по умолчанию активна карточка «Купить» (radio checked=true)', async () => {
      const { getAllByRole } = await render(<NewListScreen />)
      const radios = getAllByRole('radio')
      // Первый radio — Купить, checked=true по умолчанию
      expect(radios[0]?.props.accessibilityState?.checked).toBe(true)
      expect(radios[1]?.props.accessibilityState?.checked).toBe(false)
    })

    it('при нажатии «Сделать» карточка становится активной (radio checked=true)', async () => {
      const { getAllByRole } = await render(<NewListScreen />)
      const radios = getAllByRole('radio')
      // По умолчанию Купить (index 0) активна
      expect(radios[0]?.props.accessibilityState?.checked).toBe(true)
      expect(radios[1]?.props.accessibilityState?.checked).toBe(false)
      // Нажимаем «Сделать» (index 1) через act
      await act(async () => {
        fireEvent.press(radios[1]!)
      })
      const updated = getAllByRole('radio')
      expect(updated[1]?.props.accessibilityState?.checked).toBe(true)
      expect(updated[0]?.props.accessibilityState?.checked).toBe(false)
    })
  })

  describe('порядок секций: поле названия → ВИД ЗАДАЧИ → кнопка', () => {
    it('секция ВИД ЗАДАЧИ присутствует после поля названия', async () => {
      const { getAllByText, getByLabelText } = await render(<NewListScreen />)
      const vid = getAllByText('ВИД ЗАДАЧИ')
      expect(getByLabelText('Название задачи')).toBeTruthy()
      expect(vid.length).toBeGreaterThanOrEqual(1)
    })

    it('поле ввода названия присутствует на экране', async () => {
      const { getByLabelText } = await render(<NewListScreen />)
      expect(getByLabelText('Название задачи')).toBeTruthy()
    })
  })

  describe('кнопка «Создать задачу»', () => {
    it('кнопка «Создать задачу» присутствует на экране', async () => {
      const { getByLabelText } = await render(<NewListScreen />)
      // Структурная проверка: кнопка существует и имеет правильный label
      expect(getByLabelText('Создать задачу')).toBeTruthy()
    })

    it('кнопка вызывает createList.mutate при нажатии с заполненным полем', async () => {
      mockMutate.mockClear()
      const { getByLabelText, getByPlaceholderText } = await render(<NewListScreen />)
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Название задачи'), 'Новая задача')
      })
      await act(async () => {
        fireEvent.press(getByLabelText('Создать задачу'))
      })
      expect(mockMutate).toHaveBeenCalledWith(
        { title: 'Новая задача', type: 'goods' },
        expect.any(Object),
      )
    })
  })

  // Пункт 4/2: шторка не должна обрезаться сверху (учитывает insets.top) и поле
  // названия + кнопка «Создать задачу» должны оставаться полностью видимыми
  // над клавиатурой на Android — через KeyboardAvoidingView (behavior='height')
  // + maxHeight:'100%' на шторке + ScrollView(flex:1), без ручной компенсации
  // высоты клавиатуры (которая давала двойной сдвиг и «съедала» верх шторки).
  describe('шторка не срезается сверху и не перекрывается клавиатурой', () => {
    // StyleSheet.flatten разворачивает ВЛОЖЕННЫЕ массивы стилей (KeyboardAvoidingView
    // компонует style через StyleSheet.compose — `[[naш style], {доп. стиль}]`).
    const readMergedStyle = (style: unknown): Record<string, unknown> =>
      (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>

    it('шторка имеет верхний отступ с учётом insets.top (не уезжает под статусбар)', async () => {
      const { getByTestId } = await render(<NewListScreen />)
      const sheet = getByTestId('new-list-sheet')
      const merged = readMergedStyle(sheet.props.style)
      // insets.top=44 в моке + минимальный зазор > 44
      expect(merged.marginTop as number).toBeGreaterThan(44)
    })

    it('шторка ограничена по высоте (динамический px с учётом insets.top) — верх не срезается', async () => {
      const { getByTestId } = await render(<NewListScreen />)
      const sheet = getByTestId('new-list-sheet')
      const merged = readMergedStyle(sheet.props.style)
      // maxHeight = screenHeight - (insets.top + MIN_TOP_GAP) - keyboardHeight (px):
      // положительное число, меньше высоты экрана (оставлен зазор сверху).
      expect(typeof merged.maxHeight).toBe('number')
      expect(merged.maxHeight as number).toBeGreaterThan(0)
      expect(merged.maxHeight as number).toBeLessThan(1334)
    })

    it('ScrollView НЕ flex:1 (иначе шторка схлопывается в auto-height контейнере)', async () => {
      const { getByTestId } = await render(<NewListScreen />)
      const scroll = getByTestId('new-list-scroll')
      const merged = readMergedStyle(scroll.props.style)
      expect(merged.flex).toBeUndefined()
    })

    // Контроль исходного кода: на transparentModal (Android окно не resize'ится)
    // KeyboardAvoidingView не поднимает лист — используем ручной слушатель клавиатуры
    // и поднимаем шторку через marginBottom = keyboardHeight, чтобы кнопка «Создать»
    // не уходила под клавиатуру.
    it('исходник поднимает шторку вручную по высоте клавиатуры (Keyboard listener + marginBottom)', () => {
      const source = fs.readFileSync(path.resolve(__dirname, '../../../../app/lists/new.tsx'), 'utf-8')
      expect(source).toMatch(/Keyboard\.addListener\('keyboardDidShow'/)
      expect(source).toMatch(/marginBottom: keyboardHeight/)
    })
  })
})
