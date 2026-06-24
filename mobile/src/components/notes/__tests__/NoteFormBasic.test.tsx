jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

import NoteForm from '../NoteForm'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  const MaterialIcons = ({ name }: { name: string }) => (
    <View testID={`mi-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons, MaterialIcons }
})

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#fff',
      screenBg: '#F6F8FA',
      accent: '#0D9488',
      accentSoftBg: '#DDF1ED',
      textPrimary: '#111',
      textSecondary: '#666',
      textTertiary: '#999',
      borderSubtle: '#eee',
      borderInput: '#ddd',
      danger: '#D9583C',
    },
  }),
}))

jest.mock('@/hooks/useDebouncedCallback', () => ({
  useDebouncedCallback: (fn: (...args: unknown[]) => void) => fn,
}))

jest.mock('@/components/notes/NoteColorPicker', () => {
  const { View } = require('react-native')
  return () => <View testID="note-color-picker" />
})

jest.mock('@/components/ui/SectionLabel', () => {
  const { Text } = require('react-native')
  return ({ text }: { text: string }) => <Text>{text}</Text>
})

describe('NoteForm — базовый рендер', () => {
  it('new: кнопка Сохранить (checkmark) в шапке присутствует', async () => {
    const { getByLabelText } = await render(
      <NoteForm mode="new" onAutoSave={jest.fn()} />,
    )
    expect(getByLabelText('Сохранить')).toBeTruthy()
  })

  it('new: кнопка Создать внизу присутствует', async () => {
    const { getByLabelText } = await render(
      <NoteForm mode="new" onAutoSave={jest.fn()} />,
    )
    expect(getByLabelText('Создать заметку')).toBeTruthy()
  })

  it('existing: кнопка Закрепить присутствует в шапке', async () => {
    const { getByLabelText } = await render(
      <NoteForm mode="existing" onAutoSave={jest.fn()} isPinned={false} />,
    )
    expect(getByLabelText('Закрепить')).toBeTruthy()
  })

  it('вызывает onBack при нажатии кнопки Назад', async () => {
    const onBack = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm mode="new" onAutoSave={jest.fn()} onBack={onBack} />,
    )
    fireEvent.press(getByLabelText('Назад'))
    expect(onBack).toHaveBeenCalled()
  })
})
