/**
 * Tests for NoteForm autoSaveText=false behaviour (fix C).
 * Isolated in a separate file to avoid act() overlap from debounce mock.
 */
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
  return { Ionicons }
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

// Passthrough (no debounce delay) so we can assert sync calls
jest.mock('@/hooks/useDebouncedCallback', () => ({
  useDebouncedCallback: (fn: (...args: unknown[]) => void) => fn,
}))

// NoteColorPicker forwards onChange via testID prop for testing
jest.mock('@/components/notes/NoteColorPicker', () => {
  const { Pressable } = require('react-native')
  return ({ onChange }: { onChange: (color: string | null) => void }) => (
    <Pressable
      testID="note-color-picker"
      accessibilityLabel="Выбрать цвет"
      onPress={() => onChange('#ea899a')}
    />
  )
})

jest.mock('@/components/ui/SectionLabel', () => {
  const { Text } = require('react-native')
  return ({ text }: { text: string }) => <Text>{text}</Text>
})

describe('NoteForm — autoSaveText=false (fix C)', () => {
  it('НЕ вызывает onAutoSave при изменении текста когда autoSaveText=false', async () => {
    const onAutoSave = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm
        mode="existing"
        autoSaveText={false}
        initialValues={{ title: 'Исходный', body: '' }}
        onAutoSave={onAutoSave}
      />,
    )
    fireEvent.changeText(getByLabelText('Заголовок заметки'), 'Новый заголовок')
    expect(onAutoSave).not.toHaveBeenCalled()
  })

  it('НЕ вызывает onAutoSave при изменении body когда autoSaveText=false', async () => {
    const onAutoSave = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm
        mode="existing"
        autoSaveText={false}
        initialValues={{ title: '', body: 'Исходный текст' }}
        onAutoSave={onAutoSave}
      />,
    )
    fireEvent.changeText(getByLabelText('Текст заметки'), 'Новый текст')
    expect(onAutoSave).not.toHaveBeenCalled()
  })

  it('вызывает onTextChange с текущими title и body при изменении заголовка', async () => {
    const onTextChange = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm
        mode="existing"
        autoSaveText={false}
        initialValues={{ title: 'Исходный', body: 'Текст' }}
        onAutoSave={jest.fn()}
        onTextChange={onTextChange}
      />,
    )
    fireEvent.changeText(getByLabelText('Заголовок заметки'), 'Новый')
    expect(onTextChange).toHaveBeenCalledWith('Новый', 'Текст')
  })

  it('вызывает onTextChange с текущими title и body при изменении текста', async () => {
    const onTextChange = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm
        mode="existing"
        autoSaveText={false}
        initialValues={{ title: 'Заголовок', body: 'Исходный' }}
        onAutoSave={jest.fn()}
        onTextChange={onTextChange}
      />,
    )
    fireEvent.changeText(getByLabelText('Текст заметки'), 'Новый текст')
    expect(onTextChange).toHaveBeenCalledWith('Заголовок', 'Новый текст')
  })

  it('вызывает onColorChange (не onAutoSave) при смене цвета когда задан onColorChange', async () => {
    const onAutoSave = jest.fn()
    const onColorChange = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm
        mode="existing"
        autoSaveText={false}
        onAutoSave={onAutoSave}
        onColorChange={onColorChange}
      />,
    )
    fireEvent.press(getByLabelText('Выбрать цвет'))
    expect(onColorChange).toHaveBeenCalledWith('#ea899a')
    expect(onAutoSave).not.toHaveBeenCalled()
  })

  it('fallback: вызывает onAutoSave для цвета когда onColorChange не передан', async () => {
    const onAutoSave = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm
        mode="existing"
        autoSaveText={false}
        onAutoSave={onAutoSave}
      />,
    )
    fireEvent.press(getByLabelText('Выбрать цвет'))
    expect(onAutoSave).toHaveBeenCalledWith(
      expect.objectContaining({ color: '#ea899a' }),
    )
  })

  it('вызывает onDirtyChange(true) при изменении текста (autoSaveText=false)', async () => {
    const onDirtyChange = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm
        mode="existing"
        autoSaveText={false}
        initialValues={{ title: 'Исходный', body: '' }}
        onAutoSave={jest.fn()}
        onDirtyChange={onDirtyChange}
      />,
    )
    fireEvent.changeText(getByLabelText('Заголовок заметки'), 'Другой')
    expect(onDirtyChange).toHaveBeenCalledWith(true)
  })

  it('вызывает onDirtyChange(false) когда текст возвращён к исходному (autoSaveText=false)', async () => {
    const onDirtyChange = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm
        mode="existing"
        autoSaveText={false}
        initialValues={{ title: 'Исходный', body: '' }}
        onAutoSave={jest.fn()}
        onDirtyChange={onDirtyChange}
      />,
    )
    fireEvent.changeText(getByLabelText('Заголовок заметки'), 'Другой')
    fireEvent.changeText(getByLabelText('Заголовок заметки'), 'Исходный')
    const calls = onDirtyChange.mock.calls
    expect(calls[calls.length - 1]).toEqual([false])
  })
})
