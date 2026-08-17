/**
 * [Пункт 4] Регрессионный тест краша на Android: `@react-native-community/datetimepicker`
 * не поддерживает `mode="datetime"` на Android — падение `TypeError: Cannot read property
 * 'dismiss' of undefined`. Проверяем, что для дедлайна и «Своё время» напоминания на Android
 * используется последовательный шаг date → time (без mode="datetime"), а на iOS — как раньше.
 */
import React from 'react'
import { Platform } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'

import AttributeSheet from '../AttributeSheet'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

// Мок с поддержкой onChange — позволяет симулировать двухшаговый флоу date → time.
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native')
  return ({
    mode,
    onChange,
  }: {
    mode: string
    onChange: (event: { type: string }, picked?: Date) => void
  }) => <View testID={`datetimepicker-${mode}`} onChange={onChange} />
})

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#fff',
      textPrimary: '#111',
      textSecondary: '#666',
      textTertiary: '#999',
      borderInput: '#ddd',
      borderSubtle: '#eee',
    },
  }),
}))

const accentColor = '#d99a3e'
const accentBg = '#fbf3e4'

const baseProps = {
  currentDeadline: null,
  currentReminderAt: null,
  currentLink: null,
  currentTags: [] as string[],
  accentColor,
  accentBg,
}

describe('[Пункт 4] AttributeSheetContent — Android: дедлайн без mode="datetime" (краш-фикс)', () => {
  const withAndroid = async (fn: () => Promise<void>): Promise<void> => {
    const original = Platform.OS
    Platform.OS = 'android'
    try {
      await fn()
    } finally {
      Platform.OS = original
    }
  }

  it('«Выбрать дату» открывает пикер mode="date" (НЕ "datetime")', async () =>
    withAndroid(async () => {
      const { getByLabelText, getByTestId, queryByTestId } = await render(
        <AttributeSheet {...baseProps} attribute="deadline" onConfirm={jest.fn()} onClose={jest.fn()} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Выбрать дату'))
      })
      expect(getByTestId('datetimepicker-date')).toBeTruthy()
      expect(queryByTestId('datetimepicker-datetime')).toBeNull()
    }))

  it('после выбора даты открывается пикер mode="time" (последовательный шаг)', async () =>
    withAndroid(async () => {
      const { getByLabelText, getByTestId, queryByTestId } = await render(
        <AttributeSheet {...baseProps} attribute="deadline" onConfirm={jest.fn()} onClose={jest.fn()} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Выбрать дату'))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-date'), 'change', { type: 'set' }, new Date(2026, 6, 10))
      })
      expect(queryByTestId('datetimepicker-date')).toBeNull()
      expect(getByTestId('datetimepicker-time')).toBeTruthy()
    }))

  it('после выбора времени вызывается onConfirm с "YYYY-MM-DDTHH:mm" (дата+время из двух шагов)', async () =>
    withAndroid(async () => {
      const onConfirm = jest.fn()
      const { getByLabelText, getByTestId } = await render(
        <AttributeSheet {...baseProps} attribute="deadline" onConfirm={onConfirm} onClose={jest.fn()} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Выбрать дату'))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-date'), 'change', { type: 'set' }, new Date(2026, 6, 10))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-time'), 'change', { type: 'set' }, new Date(2020, 0, 1, 14, 30))
      })
      await act(async () => {
        fireEvent.press(getByLabelText('Готово'))
      })
      expect(onConfirm).toHaveBeenCalledWith('2026-07-10T14:30')
    }))

  it('dismiss на шаге даты закрывает пикер без падения и без onConfirm-значения', async () =>
    withAndroid(async () => {
      const { getByLabelText, getByTestId, queryByTestId } = await render(
        <AttributeSheet {...baseProps} attribute="deadline" onConfirm={jest.fn()} onClose={jest.fn()} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Выбрать дату'))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-date'), 'change', { type: 'dismissed' }, undefined)
      })
      expect(queryByTestId('datetimepicker-date')).toBeNull()
      expect(queryByTestId('datetimepicker-time')).toBeNull()
    }))
})

describe('[Пункт 4] AttributeSheetContent — Android: «Своё время» напоминания без mode="datetime"', () => {
  const withAndroid = async (fn: () => Promise<void>): Promise<void> => {
    const original = Platform.OS
    Platform.OS = 'android'
    try {
      await fn()
    } finally {
      Platform.OS = original
    }
  }

  it('«Своё время» открывает пикер mode="date" (НЕ "datetime")', async () =>
    withAndroid(async () => {
      const { getByLabelText, getByTestId, queryByTestId } = await render(
        <AttributeSheet {...baseProps} attribute="reminder" onConfirm={jest.fn()} onClose={jest.fn()} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Своё время'))
      })
      expect(getByTestId('datetimepicker-date')).toBeTruthy()
      expect(queryByTestId('datetimepicker-datetime')).toBeNull()
    }))

  it('date → time → onConfirm с корректным ISO (без падения)', async () =>
    withAndroid(async () => {
      const onConfirm = jest.fn()
      const { getByLabelText, getByTestId } = await render(
        <AttributeSheet {...baseProps} attribute="reminder" onConfirm={onConfirm} onClose={jest.fn()} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Своё время'))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-date'), 'change', { type: 'set' }, new Date(2026, 6, 10))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-time'), 'change', { type: 'set' }, new Date(2020, 0, 1, 9, 15))
      })
      await act(async () => {
        fireEvent.press(getByLabelText('Готово'))
      })
      const value = onConfirm.mock.calls[0]?.[0] as string
      const date = new Date(value)
      expect(date.getFullYear()).toBe(2026)
      expect(date.getMonth()).toBe(6)
      expect(date.getDate()).toBe(10)
      expect(date.getHours()).toBe(9)
      expect(date.getMinutes()).toBe(15)
    }))

  it('dismiss на шаге времени закрывает пикер без падения', async () =>
    withAndroid(async () => {
      const { getByLabelText, getByTestId, queryByTestId } = await render(
        <AttributeSheet {...baseProps} attribute="reminder" onConfirm={jest.fn()} onClose={jest.fn()} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Своё время'))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-date'), 'change', { type: 'set' }, new Date(2026, 6, 10))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-time'), 'change', { type: 'dismissed' }, undefined)
      })
      expect(queryByTestId('datetimepicker-time')).toBeNull()
    }))
})

describe('[Пункт 4] AttributeSheetContent — iOS: остаётся mode="datetime" (без регрессии)', () => {
  it('[deadline] «Выбрать дату» на iOS показывает пикер mode="datetime" spinner', async () => {
    const { getByLabelText, getByTestId } = await render(
      <AttributeSheet {...baseProps} attribute="deadline" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Выбрать дату'))
    })
    expect(getByTestId('datetimepicker-datetime')).toBeTruthy()
  })

  it('[reminder] «Своё время» на iOS показывает пикер mode="datetime"', async () => {
    const { getByLabelText, getByTestId } = await render(
      <AttributeSheet {...baseProps} attribute="reminder" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Своё время'))
    })
    expect(getByTestId('datetimepicker-datetime')).toBeTruthy()
  })
})
