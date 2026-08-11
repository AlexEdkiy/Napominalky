/**
 * Группировка сегмента «Запланированные» (Сегодня/Завтра/На этой неделе/Позже)
 * вынесена в отдельный файл: тест переключает сегмент с прогоном fake-таймеров
 * (VirtualizedList), после чего следующий render в том же файле монтируется
 * пустым — см. RemindersScreen.test.tsx.
 */

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

let mockReminders: Array<Record<string, unknown>> = []

jest.mock('@/hooks/useReminders', () => ({
  useReminders: () => ({
    reminders: mockReminders,
    isLoading: false,
    completeReminder: { mutate: jest.fn() },
  }),
}))

import React from 'react'
import { act, render, fireEvent } from '@testing-library/react-native'

import RemindersScreen from '../reminders-tab/index'

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

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(NOW)
  mockReminders = [
    reminder('r-overdue', 'Оплатить счёт', new Date(2026, 7, 7, 10, 0)),
    reminder('r-today', 'Позвонить врачу', new Date(2026, 7, 10, 18, 0)),
    reminder('r-tomorrow', 'Забрать посылку', new Date(2026, 7, 11, 9, 0)),
    reminder('r-week', 'Сдать отчёт', new Date(2026, 7, 13, 9, 0)),
    reminder('r-later', 'Продлить страховку', new Date(2026, 7, 20, 9, 0)),
  ]
})

afterEach(() => {
  jest.useRealTimers()
})

describe('RemindersScreen — группировка «Запланированные»', () => {
  it('группирует по секциям Сегодня/Завтра/На этой неделе/Позже', async () => {
    const { getByLabelText, getByText, queryByText } = await render(<RemindersScreen />)
    fireEvent.press(getByLabelText('Запланированные'))
    // Доигрываем порции ячеек VirtualizedList (каждая планирует следующую).
    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        jest.runOnlyPendingTimers()
      })
    }
    expect(getByText('Сегодня')).toBeTruthy()
    expect(getByText('Завтра')).toBeTruthy()
    expect(getByText('На этой неделе')).toBeTruthy()
    expect(getByText('Позже')).toBeTruthy()
    expect(getByText('Позвонить врачу')).toBeTruthy()
    expect(getByText('Забрать посылку')).toBeTruthy()
    expect(getByText('Сдать отчёт')).toBeTruthy()
    expect(getByText('Продлить страховку')).toBeTruthy()
    // Просроченное и подпись просрочки не показываются
    expect(queryByText('Оплатить счёт')).toBeNull()
    expect(queryByText(/просрочено/)).toBeNull()
  })
})
