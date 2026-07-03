import React from 'react'
import { act, fireEvent, render } from '@testing-library/react-native'

import ReminderDateCard from '@/components/reminders/ReminderDateCard'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native')
  return ({ mode }: { mode: string }) => <View testID={`datetimepicker-${mode}`} />
})

const BASE = new Date(2026, 5, 4, 14, 30, 0, 0)

const setNow = (date: Date): void => {
  jest.useFakeTimers()
  jest.setSystemTime(date)
}

afterEach(() => {
  jest.useRealTimers()
})

describe('ReminderDateCard', () => {
  it('без значения показывает плейсхолдер «Выбрать дату и время»', async () => {
    const { getByText } = await render(<ReminderDateCard value="" onChange={jest.fn()} />)
    expect(getByText('Выбрать дату и время')).toBeTruthy()
  })

  it('нажатие на чип вызывает onChange и подсвечивает только его', async () => {
    setNow(BASE)
    const onChange = jest.fn()
    const { getByLabelText } = await render(<ReminderDateCard value="" onChange={onChange} />)
    await act(async () => {
      fireEvent.press(getByLabelText('Вечером'))
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(getByLabelText('Вечером').props.accessibilityState?.selected).toBe(true)
    expect(getByLabelText('Через час').props.accessibilityState?.selected).toBe(false)
    expect(getByLabelText('Завтра утром').props.accessibilityState?.selected).toBe(false)
  })

  it('ручной выбор через пикер сбрасывает подсветку чипа', async () => {
    setNow(BASE)
    const onChange = jest.fn()
    const { getByLabelText, getByTestId } = await render(<ReminderDateCard value="" onChange={onChange} />)
    await act(async () => {
      fireEvent.press(getByLabelText('Вечером'))
    })
    expect(getByLabelText('Вечером').props.accessibilityState?.selected).toBe(true)

    require('react-native').Platform.OS = 'ios'
    await act(async () => {
      fireEvent.press(getByLabelText('Выбрать дату и время'))
    })
    const picker = getByTestId('datetimepicker-datetime')
    await act(async () => {
      fireEvent(picker, 'onChange', { type: 'set' }, new Date(2026, 6, 1, 10, 0))
    })
    expect(getByLabelText('Вечером').props.accessibilityState?.selected).toBe(false)
  })
})
