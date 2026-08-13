/**
 * Экран календаря после переноса под вкладку «Напоминания»:
 * - месяц по умолчанию СВЁРНУТ (MonthGrid получает collapsed=true);
 * - в DarkHeader хлебная крошка «‹ Календарь»: стрелка «Назад» вызывает
 *   router.back() — возврат к списку напоминаний;
 * - кнопка-лупа поиска в шапке сохранена.
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

const mockBack = jest.fn()
const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  router: {
    back: (...args: unknown[]) => mockBack(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
}))

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}))

jest.mock('@/theme', () => ({
  useTheme: () => ({ colors: require('@/theme/colors').lightColors }),
}))

jest.mock('@/hooks/useCalendar', () => ({
  useCalendar: () => ({ byDay: new Map() }),
}))

jest.mock('@/utils/layoutAnimation', () => ({
  animateLayoutChange: jest.fn(),
}))

const monthGridProps: Array<Record<string, unknown>> = []

jest.mock('@/components/calendar/MonthGrid', () => {
  const React = require('react')
  const { View } = require('react-native')
  return (props: Record<string, unknown>) => {
    monthGridProps.push(props)
    return React.createElement(View, { testID: 'month-grid' })
  }
})

jest.mock('@/components/calendar/DayRemindersSheet', () => {
  const React = require('react')
  const { View } = require('react-native')
  return () => React.createElement(View, { testID: 'day-reminders-sheet' })
})

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

import CalendarScreen from '../reminders-tab/calendar'

beforeEach(() => {
  mockBack.mockClear()
  mockPush.mockClear()
  monthGridProps.length = 0
})

describe('CalendarScreen — свёрнутый месяц по умолчанию', () => {
  it('MonthGrid при первом рендере получает collapsed=true', async () => {
    await render(<CalendarScreen />)
    expect(monthGridProps[0]?.['collapsed']).toBe(true)
  })

  it('ручка разворота переключает collapsed в false', async () => {
    const { getByLabelText } = await render(<CalendarScreen />)
    fireEvent.press(getByLabelText('Развернуть календарь'))
    await waitFor(() => {
      expect(monthGridProps[monthGridProps.length - 1]?.['collapsed']).toBe(false)
    })
  })
})

describe('CalendarScreen — хлебная крошка «‹ Календарь»', () => {
  it('в шапке есть заголовок «Календарь» и стрелка «Назад» (chevron-back)', async () => {
    const { getByText, getByLabelText, getAllByTestId } = await render(<CalendarScreen />)
    expect(getByText('Календарь')).toBeTruthy()
    expect(getByLabelText('Назад')).toBeTruthy()
    // chevron-back есть и у стрелки «предыдущий месяц», поэтому getAll
    expect(getAllByTestId('icon-chevron-back').length).toBeGreaterThanOrEqual(1)
  })

  it('нажатие на стрелку вызывает router.back() — возврат к списку напоминаний', async () => {
    const { getByLabelText } = await render(<CalendarScreen />)
    fireEvent.press(getByLabelText('Назад'))
    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('кнопка-лупа поиска в шапке сохранена', async () => {
    const { getByLabelText } = await render(<CalendarScreen />)
    expect(getByLabelText('Поиск')).toBeTruthy()
  })
})
