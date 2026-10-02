import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

import DarkHeader from '../DarkHeader'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

describe('DarkHeader', () => {
  it('рендерит title', async () => {
    const { getByText } = await render(<DarkHeader title="Главная" />)
    expect(getByText('Главная')).toBeTruthy()
  })

  it('не показывает аватар без onAvatarPress', async () => {
    const { queryByLabelText } = await render(<DarkHeader title="Профиль" />)
    expect(queryByLabelText('Профиль')).toBeNull()
  })

  it('показывает аватар при onAvatarPress', async () => {
    const onAvatarPress = jest.fn()
    const { getByLabelText } = await render(
      <DarkHeader title="Главная" onAvatarPress={onAvatarPress} />,
    )
    expect(getByLabelText('Профиль')).toBeTruthy()
  })

  it('вызывает onAvatarPress при нажатии', async () => {
    const onAvatarPress = jest.fn()
    const { getByLabelText } = await render(
      <DarkHeader title="Главная" onAvatarPress={onAvatarPress} />,
    )
    await fireEvent.press(getByLabelText('Профиль'))
    expect(onAvatarPress).toHaveBeenCalledTimes(1)
  })

  it('не показывает строку поиска без withSearch', async () => {
    const { queryByLabelText } = await render(<DarkHeader title="Задачи" />)
    expect(queryByLabelText('Поиск')).toBeNull()
  })

  it('показывает строку поиска при withSearch=true', async () => {
    const { getByLabelText } = await render(
      <DarkHeader title="Главная" withSearch onSearchChange={jest.fn()} />,
    )
    expect(getByLabelText('Поиск')).toBeTruthy()
  })

  it('отображает LinearGradient (testID=linear-gradient)', async () => {
    const { getByTestId } = await render(<DarkHeader title="Календарь" />)
    expect(getByTestId('linear-gradient')).toBeTruthy()
  })

  it('рендерит заголовок «Задачи»', async () => {
    const { getByText } = await render(<DarkHeader title="Задачи" />)
    expect(getByText('Задачи')).toBeTruthy()
  })

  it('рендерит заголовок «Календарь»', async () => {
    const { getByText } = await render(<DarkHeader title="Календарь" />)
    expect(getByText('Календарь')).toBeTruthy()
  })

  it('рендерит заголовок «Профиль»', async () => {
    const { getByText } = await render(<DarkHeader title="Профиль" />)
    expect(getByText('Профиль')).toBeTruthy()
  })

  describe('onBack — хлебная крошка «‹ Заголовок»', () => {
    it('без onBack стрелки «Назад» нет', async () => {
      const { queryByLabelText } = await render(<DarkHeader title="Календарь" />)
      expect(queryByLabelText('Назад')).toBeNull()
    })

    it('с onBack слева от заголовка рендерится chevron-back', async () => {
      const { getByLabelText, getByTestId } = await render(
        <DarkHeader title="Календарь" onBack={jest.fn()} />,
      )
      expect(getByLabelText('Назад')).toBeTruthy()
      expect(getByTestId('icon-chevron-back')).toBeTruthy()
    })

    it('нажатие на стрелку вызывает onBack', async () => {
      const onBack = jest.fn()
      const { getByLabelText } = await render(
        <DarkHeader title="Календарь" onBack={onBack} />,
      )
      await fireEvent.press(getByLabelText('Назад'))
      expect(onBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('onCalendarPress — кнопка календаря в шапке', () => {
    it('без onCalendarPress кнопки календаря нет', async () => {
      const { queryByLabelText } = await render(<DarkHeader title="Напоминания" />)
      expect(queryByLabelText('Открыть календарь')).toBeNull()
    })

    it('с onCalendarPress рендерится кнопка-иконка календаря', async () => {
      const { getByLabelText, getByTestId } = await render(
        <DarkHeader title="Напоминания" onCalendarPress={jest.fn()} />,
      )
      expect(getByLabelText('Открыть календарь')).toBeTruthy()
      expect(getByTestId('icon-calendar')).toBeTruthy()
    })

    it('нажатие вызывает onCalendarPress', async () => {
      const onCalendarPress = jest.fn()
      const { getByLabelText } = await render(
        <DarkHeader title="Напоминания" onCalendarPress={onCalendarPress} />,
      )
      await fireEvent.press(getByLabelText('Открыть календарь'))
      expect(onCalendarPress).toHaveBeenCalledTimes(1)
    })
  })

  describe('collapsibleSearch', () => {
    it('показывает кнопку-лупу при collapsibleSearch=true', async () => {
      const { getByLabelText } = await render(
        <DarkHeader title="Заметки" collapsibleSearch onSearchChange={jest.fn()} />,
      )
      expect(getByLabelText('Поиск')).toBeTruthy()
    })

    it('строка поиска скрыта по умолчанию при collapsibleSearch=true', async () => {
      const { queryByPlaceholderText } = await render(
        <DarkHeader title="Заметки" collapsibleSearch onSearchChange={jest.fn()} />,
      )
      expect(queryByPlaceholderText('Поиск')).toBeNull()
    })

    it('тап на кнопку-лупу раскрывает строку поиска', async () => {
      const { getByRole, getByPlaceholderText } = await render(
        <DarkHeader title="Заметки" collapsibleSearch onSearchChange={jest.fn()} />,
      )
      await fireEvent.press(getByRole('button', { name: 'Поиск' }))
      await waitFor(() => expect(getByPlaceholderText('Поиск')).toBeTruthy())
    })

    it('повторный тап на кнопку-лупу скрывает строку поиска', async () => {
      const { getByRole, queryByPlaceholderText } = await render(
        <DarkHeader title="Заметки" collapsibleSearch onSearchChange={jest.fn()} />,
      )
      await fireEvent.press(getByRole('button', { name: 'Поиск' }))
      await fireEvent.press(getByRole('button', { name: 'Поиск' }))
      expect(queryByPlaceholderText('Поиск')).toBeNull()
    })

    it('не показывает кнопку-лупу без collapsibleSearch', async () => {
      const { queryByLabelText } = await render(<DarkHeader title="Главная" />)
      expect(queryByLabelText('Поиск')).toBeNull()
    })
  })
})


it('opens global search with the current text from its button or keyboard', async () => {
  const onGlobalSearch = jest.fn()
  const screen = await render(<DarkHeader title="Главная" collapsibleSearch
    searchValue="молоко" onGlobalSearch={onGlobalSearch} />)
  expect(screen.queryByLabelText('Искать везде')).toBeNull()
  await fireEvent.press(screen.getByLabelText('Поиск'))
  await fireEvent.press(screen.getByLabelText('Искать везде'))
  expect(onGlobalSearch).toHaveBeenLastCalledWith('молоко')
  await fireEvent(screen.getByPlaceholderText('Поиск'), 'submitEditing')
  expect(onGlobalSearch).toHaveBeenCalledTimes(2)
})
