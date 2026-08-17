// Тесты UI-fidelity для QuickAddItem (поле добавления + кнопка «+» + чипсы/токены атрибутов)
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

  // Чипс «Комментарий» удалён: комментарии добавляются тредом к созданному пункту.
  it('под полем показаны чипсы всех 4 атрибутов (черновик пуст, без «Комментарий»)', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    expect(getByLabelText('Добавить: Дедлайн')).toBeTruthy()
    expect(getByLabelText('Добавить: Напоминание')).toBeTruthy()
    expect(getByLabelText('Добавить: Ссылка')).toBeTruthy()
    expect(queryByLabelText('Добавить: Комментарий')).toBeNull()
    expect(getByLabelText('Добавить: Тег')).toBeTruthy()
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

  it('тап по чипсу «Дедлайн» открывает шторку с заголовком «Когда дедлайн»', async () => {
    const { getByLabelText, getByText } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Дедлайн'))
    })
    expect(getByText('Когда дедлайн')).toBeTruthy()
  })

  it('выбор пресета дедлайна в шторке + «Готово» превращает чипс в токен', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <QuickAddItem listType="tasks" onAdd={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Дедлайн'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Сегодня'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    expect(queryByLabelText('Добавить: Дедлайн')).toBeNull()
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
