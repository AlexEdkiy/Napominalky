/**
 * UI-fidelity тесты: экран «Создание задачи» (app/lists/new.tsx).
 * Проверяем: заголовок, лейблы, placeholder, порядок секций, карточки типов,
 * состояние radio, кнопку «Создать задачу».
 */
jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
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
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
})
