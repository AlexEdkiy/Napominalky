/**
 * Тесты QuickAddItem («облегчённая форма»): поле + иконка «допатрибуты» ВНУТРИ
 * поля (открывает единую шторку AttributesSheet) + «+». Сетки из 4 чипов под
 * полем больше нет; заполненные атрибуты — компактными токенами под полем;
 * на иконке — жёлтая точка-индикатор при заданных атрибутах.
 */
jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { act, fireEvent, render } from '@testing-library/react-native'

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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

jest.mock('@react-native-community/datetimepicker', () => () => null)

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#fff',
      accent: '#0EA5A0',
      amber: '#F59E0B',
      accentSoftBg: '#DDF1ED',
      amberBg: '#FBEFD6',
      textPrimary: '#111',
      textSecondary: '#666',
      textTertiary: '#999',
      borderInput: '#ddd',
      borderSubtle: '#eee',
      danger: '#FF3B30',
    },
  }),
}))

// Все тесты в одном describe без вложенных describe — избегаем контекстных проблем RNTL 14
describe('QuickAddItem — облегчённая форма', () => {
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

  it('[goods] кнопка «+» имеет accessibilityLabel «Добавить» и иконку add', async () => {
    const { getByLabelText, getByTestId } = await render(
      <QuickAddItem listType="goods" onAdd={jest.fn()} />,
    )
    expect(getByLabelText('Добавить')).toBeTruthy()
    expect(getByTestId('icon-add')).toBeTruthy()
  })

  it('[tasks] показывает placeholder «Новая задача»', async () => {
    const { getByPlaceholderText } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    expect(getByPlaceholderText('Новая задача')).toBeTruthy()
  })

  it('сетки из 4 чипов под полем НЕТ (облегчённая форма)', async () => {
    const { queryByLabelText } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    expect(queryByLabelText('Добавить: Дедлайн')).toBeNull()
    expect(queryByLabelText('Добавить: Напоминание')).toBeNull()
    expect(queryByLabelText('Добавить: Ссылка')).toBeNull()
    expect(queryByLabelText('Добавить: Тег')).toBeNull()
  })

  it('внутри поля есть иконка «Допатрибуты» (options-outline)', async () => {
    const { getByLabelText, getByTestId } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    expect(getByLabelText('Допатрибуты')).toBeTruthy()
    expect(getByTestId('icon-options-outline')).toBeTruthy()
  })

  it('тап по иконке «Допатрибуты» открывает единую шторку со всеми атрибутами', async () => {
    const { getByLabelText, getByText, getByTestId } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Допатрибуты'))
    })
    expect(getByTestId('attributes-sheet')).toBeTruthy()
    expect(getByText('Допатрибуты')).toBeTruthy()
    expect(getByLabelText('Добавить: Дедлайн')).toBeTruthy()
    expect(getByLabelText('Добавить: Тег')).toBeTruthy()
  })

  it('в шторке нового пункта НЕТ поля названия и футера «Удалить пункт»', async () => {
    const { getByLabelText, queryByTestId } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Допатрибуты'))
    })
    expect(queryByTestId('item-name-input')).toBeNull()
    expect(queryByTestId('attributes-sheet-delete')).toBeNull()
  })

  it('без атрибутов точки-индикатора на иконке нет', async () => {
    const { queryByTestId } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    expect(queryByTestId('quick-add-attributes-dot')).toBeNull()
  })

  it('заданный в шторке дедлайн показывается токеном под полем + точка-индикатор', async () => {
    const { getByLabelText, getByTestId, queryByLabelText } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Допатрибуты'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Дедлайн'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Сегодня'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Закрыть')) // scrim
    })
    expect(getByLabelText('Дедлайн: Сегодня')).toBeTruthy()
    expect(getByTestId('quick-add-attributes-dot')).toBeTruthy()
    // Пустых чипов по-прежнему нет
    expect(queryByLabelText('Добавить: Ссылка')).toBeNull()
  })

  it('«×» на токене удаляет атрибут черновика; точка пропадает', async () => {
    const { getByLabelText, queryByLabelText, queryByTestId } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Допатрибуты'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Дедлайн'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Сегодня'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Закрыть'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Удалить дедлайн'))
    })
    expect(queryByLabelText(/^Дедлайн:/)).toBeNull()
    expect(queryByTestId('quick-add-attributes-dot')).toBeNull()
  })

  it('создаёт пункт только с именем, если атрибуты не заданы', async () => {
    const onAdd = jest.fn()
    const { getByPlaceholderText, getByLabelText } = await render(
      <QuickAddItem listType="goods" onAdd={onAdd} />,
    )
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Добавить товар'), 'Молоко')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить'))
    })
    expect(onAdd).toHaveBeenCalledWith({
      name: 'Молоко',
      deadline: null,
      reminderAt: null,
      link: null,
      tags: null,
    })
  })

  it('заданный через шторку дедлайн попадает в onAdd', async () => {
    const onAdd = jest.fn()
    const { getByPlaceholderText, getByLabelText } = await render(
      <QuickAddItem listType="tasks" onAdd={onAdd} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Допатрибуты'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Дедлайн'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Сегодня'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Закрыть'))
    })
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Новая задача'), 'Позвонить')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить'))
    })
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Позвонить', deadline: `${y}-${m}-${d}` }),
    )
  })

  it('сбрасывает поле имени после добавления пункта', async () => {
    const { getByPlaceholderText, getByLabelText } = await render(
      <QuickAddItem listType="goods" onAdd={jest.fn()} />,
    )
    const input = getByPlaceholderText('Добавить товар')
    await act(async () => {
      fireEvent.changeText(input, 'Хлеб')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить'))
    })
    expect(input.props.value).toBe('')
  })

  it('не создаёт пункт с пустым именем', async () => {
    const onAdd = jest.fn()
    const { getByLabelText } = await render(
      <QuickAddItem listType="goods" onAdd={onAdd} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить'))
    })
    expect(onAdd).not.toHaveBeenCalled()
  })
})
