jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { Share } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'

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

describe('NoteForm — режим new', () => {
  it('показывает кнопку «Сохранить» (checkmark) в шапке', async () => {
    const { getByLabelText } = await render(
      <NoteForm mode="new" onAutoSave={jest.fn()} />,
    )
    expect(getByLabelText('Сохранить')).toBeTruthy()
  })

  it('показывает кнопку «Создать заметку» внизу', async () => {
    const { getByLabelText } = await render(
      <NoteForm mode="new" onAutoSave={jest.fn()} />,
    )
    expect(getByLabelText('Создать заметку')).toBeTruthy()
  })

  it('не показывает кнопку «Удалить заметку»', async () => {
    const { queryByLabelText } = await render(
      <NoteForm mode="new" onAutoSave={jest.fn()} onDelete={jest.fn()} />,
    )
    expect(queryByLabelText('Удалить заметку')).toBeNull()
  })

  it('вызывает onSave при нажатии Сохранить если поля не пусты', async () => {
    const onSave = jest.fn()
    const onAutoSave = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm
        mode="new"
        initialValues={{ title: 'Заголовок', body: '' }}
        onAutoSave={onAutoSave}
        onSave={onSave}
      />,
    )
    await fireEvent.press(getByLabelText('Сохранить'))
    expect(onSave).toHaveBeenCalled()
  })
})

describe('NoteForm — режим existing', () => {
  it('не показывает кнопку «Сохранить» (checkmark) в шапке', async () => {
    const { queryByLabelText } = await render(
      <NoteForm mode="existing" onAutoSave={jest.fn()} />,
    )
    expect(queryByLabelText('Сохранить')).toBeNull()
  })

  it('не показывает кнопку «Создать заметку»', async () => {
    const { queryByLabelText } = await render(
      <NoteForm mode="existing" onAutoSave={jest.fn()} />,
    )
    expect(queryByLabelText('Создать заметку')).toBeNull()
  })

  it('показывает кнопку «Удалить заметку» при наличии onDelete', async () => {
    const { getByLabelText } = await render(
      <NoteForm mode="existing" onAutoSave={jest.fn()} onDelete={jest.fn()} />,
    )
    expect(getByLabelText('Удалить заметку')).toBeTruthy()
  })

  it('не показывает кнопку «Удалить заметку» без onDelete', async () => {
    const { queryByLabelText } = await render(
      <NoteForm mode="existing" onAutoSave={jest.fn()} />,
    )
    expect(queryByLabelText('Удалить заметку')).toBeNull()
  })

  it('вызывает onDelete при нажатии кнопки удаления', async () => {
    const onDelete = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm mode="existing" onAutoSave={jest.fn()} onDelete={onDelete} />,
    )
    await fireEvent.press(getByLabelText('Удалить заметку'))
    expect(onDelete).toHaveBeenCalled()
  })

  it('показывает кнопку «Закрепить» в шапке', async () => {
    const { getByLabelText } = await render(
      <NoteForm mode="existing" onAutoSave={jest.fn()} isPinned={false} />,
    )
    expect(getByLabelText('Закрепить')).toBeTruthy()
  })

  it('вызывает onDirtyChange(true) при изменении заголовка', async () => {
    const onDirtyChange = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm
        mode="existing"
        initialValues={{ title: 'Исходный', body: '' }}
        onAutoSave={jest.fn()}
        onDirtyChange={onDirtyChange}
      />,
    )
    await fireEvent.changeText(getByLabelText('Заголовок заметки'), 'Изменённый')
    expect(onDirtyChange).toHaveBeenCalledWith(true)
  })

  it('вызывает onDirtyChange(false) если заголовок возвращён к исходному', async () => {
    const onDirtyChange = jest.fn()
    const { getByLabelText } = await render(
      <NoteForm
        mode="existing"
        initialValues={{ title: 'Исходный', body: '' }}
        onAutoSave={jest.fn()}
        onDirtyChange={onDirtyChange}
      />,
    )
    await fireEvent.changeText(getByLabelText('Заголовок заметки'), 'Изменённый')
    await fireEvent.changeText(getByLabelText('Заголовок заметки'), 'Исходный')
    const calls = onDirtyChange.mock.calls
    expect(calls[calls.length - 1]).toEqual([false])
  })
})



it('shares the current note draft without implicitly saving it', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })
  const save = jest.fn()
  try {
    const view = await render(<NoteForm mode="existing" autoSaveText={false}
      initialValues={{ title: 'Старый заголовок', body: 'Старый текст' }} onAutoSave={save} />)
    await act(async () => { fireEvent.changeText(view.getByLabelText('Заголовок заметки'), 'Новый заголовок') })
    await act(async () => { fireEvent.changeText(view.getByLabelText('Текст заметки'), 'Новый текст\nСтрока 2') })
    await act(async () => { fireEvent.press(view.getByLabelText('Поделиться в Telegram')) })
    expect(share).toHaveBeenCalledWith({ message: 'Новый заголовок\n\nНовый текст\nСтрока 2' }, expect.any(Object))
    expect(save).not.toHaveBeenCalled()
  } finally { share.mockRestore() }
})
