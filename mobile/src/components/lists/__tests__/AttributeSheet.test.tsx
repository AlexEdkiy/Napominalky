import React from 'react'
import { act, fireEvent, render } from '@testing-library/react-native'

import AttributeSheet from '../AttributeSheet'

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
      textPrimary: '#111',
      textSecondary: '#666',
      textTertiary: '#999',
      borderInput: '#ddd',
      borderSubtle: '#eee',
    },
  }),
}))

const accentColor = '#d99a3e'
const accentBg = '#fbf3e4'

const baseProps = {
  currentDeadline: null,
  currentReminderAt: null,
  currentLink: null,
  currentComment: null,
  currentTags: [] as string[],
  accentColor,
  accentBg,
}

describe('AttributeSheet — deadline', () => {
  it('открывается с заголовком «Когда дедлайн» и пресетами', async () => {
    const { getByText, getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="deadline" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByText('Когда дедлайн')).toBeTruthy()
    expect(getByLabelText('Сегодня')).toBeTruthy()
    expect(getByLabelText('Завтра')).toBeTruthy()
    expect(getByLabelText('В выходные')).toBeTruthy()
    expect(getByLabelText('Через неделю')).toBeTruthy()
    expect(getByLabelText('Выбрать дату')).toBeTruthy()
  })

  it('«Готово» disabled при пустом значении', async () => {
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="deadline" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByLabelText('Готово').props.accessibilityState?.disabled).toBe(true)
  })

  it('выбор пресета «Сегодня» + «Готово» вызывает onConfirm с YYYY-MM-DD сегодняшней даты', async () => {
    const onConfirm = jest.fn()
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="deadline" onConfirm={onConfirm} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Сегодня'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    expect(onConfirm).toHaveBeenCalledWith(`${y}-${m}-${d}`)
  })
})

describe('AttributeSheet — reminder', () => {
  it('открывается с заголовком «Когда напомнить» и пресетами', async () => {
    const { getByText, getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="reminder" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByText('Когда напомнить')).toBeTruthy()
    expect(getByLabelText('За 10 минут')).toBeTruthy()
    expect(getByLabelText('За 1 час')).toBeTruthy()
    expect(getByLabelText('За день')).toBeTruthy()
    expect(getByLabelText('Своё время')).toBeTruthy()
  })

  it('выбор пресета «За 1 час» без дедлайна вычисляет ISO не в прошлом', async () => {
    const onConfirm = jest.fn()
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="reminder" onConfirm={onConfirm} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('За 1 час'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    const value = onConfirm.mock.calls[0]?.[0] as string
    expect(new Date(value).getTime()).toBeGreaterThan(Date.now())
  })

  it('пресет считается от дедлайна, если currentDeadline задан', async () => {
    const onConfirm = jest.fn()
    const { getByLabelText } = await render(
      <AttributeSheet
        {...baseProps}
        attribute="reminder"
        currentDeadline="2026-08-01"
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('За день'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    const value = onConfirm.mock.calls[0]?.[0] as string
    const date = new Date(value)
    // дедлайн 2026-08-01 09:00 минус 1 день = 2026-07-31 09:00
    expect(date.getDate()).toBe(31)
    expect(date.getMonth()).toBe(6) // июль (0-indexed)
  })
})

describe('AttributeSheet — link', () => {
  it('открывается с заголовком «Ссылка» и placeholder «Вставьте ссылку»', async () => {
    const { getByText, getByPlaceholderText } = await render(
      <AttributeSheet {...baseProps} attribute="link" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByText('Ссылка')).toBeTruthy()
    expect(getByPlaceholderText('Вставьте ссылку')).toBeTruthy()
  })

  it('ввод ссылки + «Готово» вызывает onConfirm со строкой', async () => {
    const onConfirm = jest.fn()
    const { getByPlaceholderText, getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="link" onConfirm={onConfirm} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Вставьте ссылку'), 'https://example.com')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    expect(onConfirm).toHaveBeenCalledWith('https://example.com')
  })

  it('пустое значение — «Готово» disabled', async () => {
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="link" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByLabelText('Готово').props.accessibilityState?.disabled).toBe(true)
  })
})

describe('AttributeSheet — comment', () => {
  it('открывается с заголовком «Комментарий» и placeholder «Добавьте заметку к задаче»', async () => {
    const { getByText, getByPlaceholderText } = await render(
      <AttributeSheet {...baseProps} attribute="comment" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByText('Комментарий')).toBeTruthy()
    expect(getByPlaceholderText('Добавьте заметку к задаче')).toBeTruthy()
  })

  it('ввод комментария + «Готово» вызывает onConfirm со строкой', async () => {
    const onConfirm = jest.fn()
    const { getByPlaceholderText, getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="comment" onConfirm={onConfirm} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Добавьте заметку к задаче'), 'Взять свежее')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    expect(onConfirm).toHaveBeenCalledWith('Взять свежее')
  })
})

describe('AttributeSheet — tag', () => {
  it('открывается с заголовком «Выберите тег» и готовыми пилюлями', async () => {
    const { getByText, getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="tag" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByText('Выберите тег')).toBeTruthy()
    expect(getByLabelText('Срочно')).toBeTruthy()
    expect(getByLabelText('Работа')).toBeTruthy()
    expect(getByLabelText('Дом')).toBeTruthy()
    expect(getByLabelText('Личное')).toBeTruthy()
    expect(getByLabelText('Новый тег').props.placeholder).toBe('＋ Новый тег')
  })

  it('выбор нескольких пилюль + «Готово» вызывает onConfirm с массивом', async () => {
    const onConfirm = jest.fn()
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="tag" onConfirm={onConfirm} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Срочно'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Дом'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    expect(onConfirm).toHaveBeenCalledWith(['Срочно', 'Дом'])
  })

  it('пустой выбор тегов — «Готово» disabled', async () => {
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="tag" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByLabelText('Готово').props.accessibilityState?.disabled).toBe(true)
  })

  it('новый тег через поле ввода добавляется к выбору', async () => {
    const onConfirm = jest.fn()
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="tag" onConfirm={onConfirm} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.changeText(getByLabelText('Новый тег'), 'Ремонт')
    })
    await act(async () => {
      fireEvent(getByLabelText('Новый тег'), 'submitEditing')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    expect(onConfirm).toHaveBeenCalledWith(['Ремонт'])
  })
})

describe('AttributeSheet — общее поведение', () => {
  it('attribute=null ничего не рендерит', async () => {
    const { queryByText } = await render(
      <AttributeSheet {...baseProps} attribute={null} onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(queryByText('Когда дедлайн')).toBeNull()
  })

  it('тап по скриму вызывает onClose', async () => {
    const onClose = jest.fn()
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="link" onConfirm={jest.fn()} onClose={onClose} />,
    )
    fireEvent.press(getByLabelText('Закрыть'))
    expect(onClose).toHaveBeenCalled()
  })
})
