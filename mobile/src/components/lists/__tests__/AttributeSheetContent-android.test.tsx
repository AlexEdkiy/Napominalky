/**
 * [Пункт 4] Регрессионный тест краша на Android: `@react-native-community/datetimepicker`
 * не поддерживает `mode="datetime"` на Android — падение `TypeError: Cannot read property
 * 'dismiss' of undefined`. Проверяем, что для дедлайна и «Своё время» напоминания на Android
 * используется последовательный шаг date → time (без mode="datetime"), а на iOS — как раньше.
 * После редизайна редакторы живут в единой шторке «Допатрибуты» (AttributesSheet);
 * значение коммитится сразу после выбора (без кнопки «Готово»).
 */
import React from 'react'
import { Platform } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'

import AttributesSheet from '../AttributesSheet'
import { EMPTY_ATTRIBUTE_VALUES } from '@/utils/itemAttributes'

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
      danger: '#FF3B30',
      amber: '#F59E0B',
      amberBg: '#FBEFD6',
    },
  }),
}))

const baseProps = {
  visible: true,
  values: EMPTY_ATTRIBUTE_VALUES,
  accentColor: '#d99a3e',
  accentBg: '#fbf3e4',
  onClose: jest.fn(),
}

const withAndroid = async (fn: () => Promise<void>): Promise<void> => {
  const original = Platform.OS
  Platform.OS = 'android'
  try {
    await fn()
  } finally {
    Platform.OS = original
  }
}

describe('[Пункт 4] Допатрибуты — Android: дедлайн без mode="datetime" (краш-фикс)', () => {
  it('«Выбрать дату» открывает пикер mode="date" (НЕ "datetime")', async () =>
    withAndroid(async () => {
      const { getByLabelText, getByTestId, queryByTestId } = await render(
        <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Добавить: Дедлайн'))
      })
      await act(async () => {
        fireEvent.press(getByLabelText('Выбрать дату'))
      })
      expect(getByTestId('datetimepicker-date')).toBeTruthy()
      expect(queryByTestId('datetimepicker-datetime')).toBeNull()
    }))

  it('после выбора даты открывается пикер mode="time" (последовательный шаг)', async () =>
    withAndroid(async () => {
      const { getByLabelText, getByTestId, queryByTestId } = await render(
        <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Добавить: Дедлайн'))
      })
      await act(async () => {
        fireEvent.press(getByLabelText('Выбрать дату'))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-date'), 'change', { type: 'set' }, new Date(2026, 6, 10))
      })
      expect(queryByTestId('datetimepicker-date')).toBeNull()
      expect(getByTestId('datetimepicker-time')).toBeTruthy()
    }))

  it('после выбора времени коммитится "YYYY-MM-DDTHH:mm" (дата+время из двух шагов)', async () =>
    withAndroid(async () => {
      const onChangeAttribute = jest.fn()
      const { getByLabelText, getByTestId } = await render(
        <AttributesSheet {...baseProps} onChangeAttribute={onChangeAttribute} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Добавить: Дедлайн'))
      })
      await act(async () => {
        fireEvent.press(getByLabelText('Выбрать дату'))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-date'), 'change', { type: 'set' }, new Date(2026, 6, 10))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-time'), 'change', { type: 'set' }, new Date(2020, 0, 1, 14, 30))
      })
      expect(onChangeAttribute).toHaveBeenCalledWith('deadline', '2026-07-10T14:30')
    }))

  it('dismiss на шаге даты закрывает пикер без падения и без коммита значения', async () =>
    withAndroid(async () => {
      const onChangeAttribute = jest.fn()
      const { getByLabelText, getByTestId, queryByTestId } = await render(
        <AttributesSheet {...baseProps} onChangeAttribute={onChangeAttribute} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Добавить: Дедлайн'))
      })
      await act(async () => {
        fireEvent.press(getByLabelText('Выбрать дату'))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-date'), 'change', { type: 'dismissed' }, undefined)
      })
      expect(queryByTestId('datetimepicker-date')).toBeNull()
      expect(queryByTestId('datetimepicker-time')).toBeNull()
      expect(onChangeAttribute).not.toHaveBeenCalled()
    }))
})

describe('[Пункт 4] Допатрибуты — Android: «Своё время» напоминания без mode="datetime"', () => {
  it('«Своё время» открывает пикер mode="date" (НЕ "datetime")', async () =>
    withAndroid(async () => {
      const { getByLabelText, getByTestId, queryByTestId } = await render(
        <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Добавить: Напоминание'))
      })
      await act(async () => {
        fireEvent.press(getByLabelText('Своё время'))
      })
      expect(getByTestId('datetimepicker-date')).toBeTruthy()
      expect(queryByTestId('datetimepicker-datetime')).toBeNull()
    }))

  it('date → time → коммит корректного ISO (без падения)', async () =>
    withAndroid(async () => {
      const onChangeAttribute = jest.fn()
      const { getByLabelText, getByTestId } = await render(
        <AttributesSheet {...baseProps} onChangeAttribute={onChangeAttribute} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Добавить: Напоминание'))
      })
      await act(async () => {
        fireEvent.press(getByLabelText('Своё время'))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-date'), 'change', { type: 'set' }, new Date(2026, 6, 10))
      })
      await act(async () => {
        fireEvent(getByTestId('datetimepicker-time'), 'change', { type: 'set' }, new Date(2020, 0, 1, 9, 15))
      })
      const [attr, value] = onChangeAttribute.mock.calls[0] as [string, string]
      expect(attr).toBe('reminder')
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
        <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} />,
      )
      await act(async () => {
        fireEvent.press(getByLabelText('Добавить: Напоминание'))
      })
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

describe('[Пункт 4] Допатрибуты — iOS: остаётся mode="datetime" (без регрессии)', () => {
  it('[deadline] «Выбрать дату» на iOS показывает пикер mode="datetime" spinner', async () => {
    const { getByLabelText, getByTestId } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Дедлайн'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Выбрать дату'))
    })
    expect(getByTestId('datetimepicker-datetime')).toBeTruthy()
  })

  it('[reminder] «Своё время» на iOS показывает пикер mode="datetime"', async () => {
    const { getByLabelText, getByTestId } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Напоминание'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Своё время'))
    })
    expect(getByTestId('datetimepicker-datetime')).toBeTruthy()
  })
})
