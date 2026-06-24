jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { Alert } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'

import NoteCard from '../NoteCard'
import type { Note } from '@/db/repositories/notesRepo'

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
      textPrimary: '#111',
      textSecondary: '#666',
      coral: '#E26A4D',
      coralSoftBg: '#FCE7E1',
    },
  }),
}))

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  uuid: 'note-1',
  userId: null,
  title: 'Тестовая заметка',
  body: 'Тело заметки',
  color: null,
  isPinned: false,
  isArchived: false,
  serverRevision: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
  ...overrides,
})

describe('NoteCard', () => {
  it('отображает заголовок заметки', async () => {
    const { getByText } = await render(
      <NoteCard note={makeNote({ title: 'Моя заметка' })} onPress={jest.fn()} />,
    )
    expect(getByText('Моя заметка')).toBeTruthy()
  })

  it('показывает «Без названия» при пустом заголовке', async () => {
    const { getByText } = await render(
      <NoteCard note={makeNote({ title: '' })} onPress={jest.fn()} />,
    )
    expect(getByText('Без названия')).toBeTruthy()
  })

  it('вызывает onPress с uuid при нажатии', async () => {
    const onPress = jest.fn()
    const { getByLabelText } = await render(
      <NoteCard note={makeNote({ title: 'Заметка' })} onPress={onPress} />,
    )
    fireEvent.press(getByLabelText('Заметка'))
    expect(onPress).toHaveBeenCalledWith('note-1')
  })

  it('отображает иконку закрепления для isPinned=true', async () => {
    const { getByTestId } = await render(
      <NoteCard note={makeNote({ isPinned: true })} onPress={jest.fn()} />,
    )
    expect(getByTestId('icon-pin')).toBeTruthy()
  })

  it('не отображает иконку закрепления для isPinned=false', async () => {
    const { queryByTestId } = await render(
      <NoteCard note={makeNote({ isPinned: false })} onPress={jest.fn()} />,
    )
    expect(queryByTestId('icon-pin')).toBeNull()
  })

  it('показывает Alert при long-press если передан onDelete', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    const { getByLabelText } = await render(
      <NoteCard
        note={makeNote({ title: 'Удаляемая' })}
        onPress={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    fireEvent(getByLabelText('Удаляемая'), 'longPress')
    expect(alertSpy).toHaveBeenCalledWith(
      'Удалить заметку?',
      'Действие нельзя отменить.',
      expect.any(Array),
    )
    alertSpy.mockRestore()
  })

  it('не падает при long-press без onDelete', async () => {
    const { getByLabelText } = await render(
      <NoteCard note={makeNote({ title: 'Заметка' })} onPress={jest.fn()} />,
    )
    expect(() => fireEvent(getByLabelText('Заметка'), 'longPress')).not.toThrow()
  })

  it('отображает сниппет тела заметки', async () => {
    const { getByText } = await render(
      <NoteCard note={makeNote({ body: 'Текст заметки' })} onPress={jest.fn()} />,
    )
    expect(getByText('Текст заметки')).toBeTruthy()
  })

  it('имеет accessibilityLabel равный заголовку', async () => {
    const { getByLabelText } = await render(
      <NoteCard note={makeNote({ title: 'Моя заметка' })} onPress={jest.fn()} />,
    )
    expect(getByLabelText('Моя заметка')).toBeTruthy()
  })
})
