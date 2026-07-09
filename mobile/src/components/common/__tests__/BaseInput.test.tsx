/**
 * Тесты BaseInput:
 * - без passwordToggle поведение не меняется (нет кнопки-«глаза»)
 * - passwordToggle показывает/скрывает пароль по нажатию на иконку
 */

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

import BaseInput from '../BaseInput'

describe('BaseInput — passwordToggle', () => {
  it('по умолчанию скрывает пароль и показывает иконку eye-outline', async () => {
    const { getByLabelText, getByTestId } = await render(
      <BaseInput label="Пароль" value="secret" onChangeText={jest.fn()} passwordToggle />,
    )

    expect(getByLabelText('Пароль').props.secureTextEntry).toBe(true)
    expect(getByTestId('icon-eye-outline')).toBeTruthy()
  })

  it('нажатие на «глаз» открывает пароль и переключает иконку/лейбл', async () => {
    const { getByLabelText, getByTestId } = await render(
      <BaseInput label="Пароль" value="secret" onChangeText={jest.fn()} passwordToggle />,
    )

    await fireEvent.press(getByLabelText('Показать пароль'))

    expect(getByLabelText('Пароль').props.secureTextEntry).toBe(false)
    expect(getByTestId('icon-eye-off-outline')).toBeTruthy()
    expect(getByLabelText('Скрыть пароль')).toBeTruthy()
  })

  it('повторное нажатие снова скрывает пароль', async () => {
    const { getByLabelText } = await render(
      <BaseInput label="Пароль" value="secret" onChangeText={jest.fn()} passwordToggle />,
    )

    await fireEvent.press(getByLabelText('Показать пароль'))
    await fireEvent.press(getByLabelText('Скрыть пароль'))

    expect(getByLabelText('Пароль').props.secureTextEntry).toBe(true)
  })

  it('без passwordToggle кнопка-«глаз» не рендерится (прежнее поведение)', async () => {
    const { queryByLabelText, getByLabelText } = await render(
      <BaseInput label="Пароль" value="secret" onChangeText={jest.fn()} secureTextEntry />,
    )

    expect(queryByLabelText('Показать пароль')).toBeNull()
    expect(getByLabelText('Пароль').props.secureTextEntry).toBe(true)
  })
})
