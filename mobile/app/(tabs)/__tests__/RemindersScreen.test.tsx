// Моки до импортов (jest.mock hoistится — переменные с префиксом mock*)

jest.mock('@/db/client', () => ({ db: {} }))

jest.mock('@expo/vector-icons', () => {
  const React = require('react')
  const { View } = require('react-native')
  const Ionicons = ({ name }: { name: string }) =>
    React.createElement(View, { testID: `icon-${name}` })
  return { Ionicons }
})

jest.mock('expo-linear-gradient', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'linear-gradient', ...props }, children),
  }
})

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}))

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}))

jest.mock('@/theme', () => ({
  useTheme: () => ({ colors: require('@/theme/colors').lightColors }),
}))

const mockCompleteMutate = jest.fn()
let mockReminders: Array<Record<string, unknown>> = []

jest.mock('@/hooks/useReminders', () => ({
  useReminders: () => ({
    reminders: mockReminders,
    isLoading: false,
    completeReminder: { mutate: mockCompleteMutate },
  }),
}))

import React from 'react'
import { act, render, fireEvent } from '@testing-library/react-native'
import { router } from 'expo-router'

import RemindersScreen from '../reminders-tab/index'

type PressableElement = Parameters<typeof fireEvent.press>[0]

/**
 * Нажимает элемент и доигрывает отложенные таймеры: SectionList
 * (VirtualizedList) откладывает перерисовку ячеек через таймеры, которые при
 * fake timers нужно продвинуть вручную.
 *
 * ВАЖНО: тест с pressAndFlush должен быть последним в файле — после прогонов
 * fake-таймеров следующий render в том же файле монтируется пустым (поэтому
 * тест группировки секций вынесен в RemindersScreenGrouping.test.tsx).
 */
const pressAndFlush = async (element: PressableElement): Promise<void> => {
  fireEvent.press(element)
  // Несколько проходов: каждая порция ячеек VirtualizedList планирует следующую.
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      jest.runOnlyPendingTimers()
    })
  }
}

const mockPush = router.push as jest.MockedFunction<typeof router.push>

// Фиксированный «сейчас»: понедельник 10 августа 2026, 12:00 локального времени.
const NOW = new Date(2026, 7, 10, 12, 0, 0, 0)

const reminder = (uuid: string, title: string, remindAt: Date): Record<string, unknown> => ({
  uuid,
  userId: null,
  title,
  notes: null,
  remindAt: remindAt.toISOString(),
  recurrence: 'none',
  isCompleted: false,
  completedAt: null,
  snoozedUntil: null,
  sourceUuid: null,
  sourceType: null,
  notificationId: null,
  serverRevision: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
})

// 1 просроченное (7 авг 10:00 → 3 дня назад) и 4 запланированных по группам.
const fillReminders = (): void => {
  mockReminders = [
    reminder('r-overdue', 'Оплатить счёт', new Date(2026, 7, 7, 10, 0)),
    reminder('r-today', 'Позвонить врачу', new Date(2026, 7, 10, 18, 0)),
    reminder('r-tomorrow', 'Забрать посылку', new Date(2026, 7, 11, 9, 0)),
    reminder('r-week', 'Сдать отчёт', new Date(2026, 7, 13, 9, 0)),
    reminder('r-later', 'Продлить страховку', new Date(2026, 7, 20, 9, 0)),
  ]
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(NOW)
  mockPush.mockClear()
  mockCompleteMutate.mockClear()
  fillReminders()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('RemindersScreen — шапка и навигация', () => {
  it('рендерит DarkHeader с заголовком «Напоминания»', async () => {
    const { getByText, getByTestId } = await render(<RemindersScreen />)
    expect(getByText('Напоминания')).toBeTruthy()
    expect(getByTestId('linear-gradient')).toBeTruthy()
  })

  it('кнопка аватара ведёт на профиль', async () => {
    const { getByLabelText } = await render(<RemindersScreen />)
    fireEvent.press(getByLabelText('Профиль'))
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/profile')
  })

  it('«Открыть календарь» ведёт на экран календаря внутри вкладки', async () => {
    const { getByLabelText } = await render(<RemindersScreen />)
    fireEvent.press(getByLabelText('Открыть календарь'))
    expect(mockPush).toHaveBeenCalledWith('/reminders-tab/calendar')
  })
})

describe('RemindersScreen — сегмент со счётчиками', () => {
  it('показывает счётчики: 1 просроченное, 4 запланированных', async () => {
    const { getByLabelText, getByText } = await render(<RemindersScreen />)
    expect(getByLabelText('Просроченные')).toBeTruthy()
    expect(getByLabelText('Запланированные')).toBeTruthy()
    expect(getByText('1')).toBeTruthy()
    expect(getByText('4')).toBeTruthy()
  })
})

describe('RemindersScreen — сегмент «Просроченные»', () => {
  it('показывает просроченное с чипом даты и «просрочено на N дней»', async () => {
    const { getByText, queryByText } = await render(<RemindersScreen />)
    expect(getByText('Оплатить счёт')).toBeTruthy()
    expect(getByText('7 авг 2026, 10:00')).toBeTruthy()
    expect(getByText('просрочено на 3 дня')).toBeTruthy()
    // Запланированные в этом сегменте не показываются
    expect(queryByText('Позвонить врачу')).toBeNull()
  })

  it('чекбокс «выполнить» вызывает completeReminder.mutate(uuid)', async () => {
    const { getByLabelText } = await render(<RemindersScreen />)
    fireEvent.press(getByLabelText('Выполнить: Оплатить счёт'))
    expect(mockCompleteMutate).toHaveBeenCalledWith('r-overdue')
  })

  it('тап по карточке открывает /reminders/{uuid}', async () => {
    const { getByLabelText } = await render(<RemindersScreen />)
    fireEvent.press(getByLabelText('Оплатить счёт'))
    expect(mockPush).toHaveBeenCalledWith('/reminders/r-overdue')
  })

  it('пустое состояние «Нет просроченных»', async () => {
    mockReminders = [reminder('r-today', 'Позвонить врачу', new Date(2026, 7, 10, 18, 0))]
    const { getByText } = await render(<RemindersScreen />)
    expect(getByText('Нет просроченных')).toBeTruthy()
  })
})

describe('RemindersScreen — сегмент «Запланированные»', () => {
  it('пустое состояние «Ничего не запланировано»', async () => {
    mockReminders = [reminder('r-overdue', 'Оплатить счёт', new Date(2026, 7, 7, 10, 0))]
    const { getByLabelText, getByText } = await render(<RemindersScreen />)
    await pressAndFlush(getByLabelText('Запланированные'))
    expect(getByText('Ничего не запланировано')).toBeTruthy()
  })
})
