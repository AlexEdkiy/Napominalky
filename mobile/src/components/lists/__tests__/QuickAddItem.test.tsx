// Тесты UI-fidelity для QuickAddItem (поле добавления + кнопка «+»)
jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { render } from '@testing-library/react-native'

import QuickAddItem from '../QuickAddItem'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#fff',
      accent: '#0EA5A0',
      amber: '#F59E0B',
      textPrimary: '#111',
      textTertiary: '#999',
      borderInput: '#ddd',
    },
  }),
}))

// Все тесты в одном describe без вложенных describe — избегаем контекстных проблем RNTL 14
describe('QuickAddItem — соответствие макету', () => {
  it('[goods] показывает placeholder «Добавить товар»', async () => {
    const { getByPlaceholderText } = await render(
      <QuickAddItem listType="goods" onAdd={jest.fn()} />,
    )
    expect(getByPlaceholderText('Добавить товар')).toBeTruthy()
  })

  it('[goods] поле имеет accessibilityLabel «Добавить товар»', async () => {
    const { getByLabelText } = await render(
      <QuickAddItem listType="goods" onAdd={jest.fn()} />,
    )
    expect(getByLabelText('Добавить товар')).toBeTruthy()
  })

  it('[goods] кнопка «+» имеет accessibilityLabel «Добавить»', async () => {
    const { getByLabelText } = await render(
      <QuickAddItem listType="goods" onAdd={jest.fn()} />,
    )
    expect(getByLabelText('Добавить')).toBeTruthy()
  })

  it('[goods] кнопка «+» содержит иконку add', async () => {
    const { getByTestId } = await render(
      <QuickAddItem listType="goods" onAdd={jest.fn()} />,
    )
    expect(getByTestId('icon-add')).toBeTruthy()
  })

  it('[tasks] показывает placeholder «Новая задача»', async () => {
    const { getByPlaceholderText } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    expect(getByPlaceholderText('Новая задача')).toBeTruthy()
  })

  it('[tasks] поле имеет accessibilityLabel «Новая задача»', async () => {
    const { getByLabelText } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    expect(getByLabelText('Новая задача')).toBeTruthy()
  })

  it('[tasks] кнопка «+» имеет accessibilityLabel «Добавить»', async () => {
    const { getByLabelText } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    expect(getByLabelText('Добавить')).toBeTruthy()
  })
})
