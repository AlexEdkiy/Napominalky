import React from 'react'
import { act, fireEvent, render } from '@testing-library/react-native'

import ReminderForm from '@/components/reminders/ReminderForm'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native')
  return ({ mode }: { mode: string }) => <View testID={`datetimepicker-${mode}`} />
})

// Базовая дата: 2026-06-04 14:30 (среда, до 18:00 — «Вечером» = сегодня).
const BASE = new Date(2026, 5, 4, 14, 30, 0, 0)

const setNow = (date: Date): void => {
  jest.useFakeTimers()
  jest.setSystemTime(date)
}

afterEach(() => {
  jest.useRealTimers()
})

describe('ReminderForm — секции и шапка', () => {
  it('рендерит тёмную шапку с заголовком «Новое напоминание» для новой формы', async () => {
    const { getByText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    expect(getByText('Новое напоминание')).toBeTruthy()
  })

  it('рендерит заголовок существующего напоминания в шапке при редактировании', async () => {
    const { getByText } = await render(
      <ReminderForm
        initialValues={{ title: 'Полить цветы', notes: '', remindAt: BASE.toISOString(), recurrence: 'none' }}
        onSubmit={jest.fn()}
      />,
    )
    expect(getByText('Полить цветы')).toBeTruthy()
  })

  it('заголовок «Напоминание», если у существующего напоминания пустой title', async () => {
    const { getByText } = await render(
      <ReminderForm
        initialValues={{ title: '', notes: '', remindAt: BASE.toISOString(), recurrence: 'none' }}
        onSubmit={jest.fn()}
      />,
    )
    expect(getByText('Напоминание')).toBeTruthy()
  })

  it('рендерит секции «О чём напомнить», «Когда напомнить», «Повтор»', async () => {
    const { getByText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    expect(getByText('О чём напомнить')).toBeTruthy()
    expect(getByText('Когда напомнить')).toBeTruthy()
    expect(getByText('Повтор')).toBeTruthy()
  })

  it('нажатие «Назад» вызывает onBack', async () => {
    const onBack = jest.fn()
    const { getByLabelText } = await render(<ReminderForm onSubmit={jest.fn()} onBack={onBack} />)
    await act(async () => {
      fireEvent.press(getByLabelText('Назад'))
    })
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

describe('ReminderForm — поля заголовка/заметки', () => {
  it('ввод заголовка и заметки обновляет соответствующие поля', async () => {
    const { getByLabelText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    await act(async () => {
      fireEvent.changeText(getByLabelText('Заголовок напоминания'), 'Стирка')
    })
    await act(async () => {
      fireEvent.changeText(getByLabelText('Заметка к напоминанию'), 'Не забыть кондиционер')
    })
    expect(getByLabelText('Заголовок напоминания').props.value).toBe('Стирка')
    expect(getByLabelText('Заметка к напоминанию').props.value).toBe('Не забыть кондиционер')
  })
})

describe('ReminderForm — быстрые чипы даты', () => {
  it('«Через час» подсвечивает чип и позволяет отправить форму', async () => {
    setNow(BASE)
    const { getByLabelText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    await act(async () => {
      fireEvent.press(getByLabelText('Через час'))
    })
    expect(getByLabelText('Через час').props.accessibilityState?.selected).toBe(true)
  })

  it('«Вечером» задаёт 18:00 текущего дня и подсвечивает чип', async () => {
    setNow(BASE)
    const onSubmit = jest.fn()
    const { getByLabelText } = await render(<ReminderForm onSubmit={onSubmit} />)
    await act(async () => {
      fireEvent.press(getByLabelText('Вечером'))
    })
    expect(getByLabelText('Вечером').props.accessibilityState?.selected).toBe(true)
    expect(getByLabelText('Через час').props.accessibilityState?.selected).toBe(false)

    await act(async () => {
      fireEvent.changeText(getByLabelText('Заголовок напоминания'), 'Проверка')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })
    const values = onSubmit.mock.calls[0]?.[0]
    expect(new Date(values.remindAt).getHours()).toBe(18)
    expect(new Date(values.remindAt).getMinutes()).toBe(0)
  })

  it('«Завтра утром» задаёт 09:00 следующего дня и подсвечивает чип', async () => {
    setNow(BASE)
    const onSubmit = jest.fn()
    const { getByLabelText } = await render(<ReminderForm onSubmit={onSubmit} />)
    await act(async () => {
      fireEvent.press(getByLabelText('Завтра утром'))
    })
    expect(getByLabelText('Завтра утром').props.accessibilityState?.selected).toBe(true)

    await act(async () => {
      fireEvent.changeText(getByLabelText('Заголовок напоминания'), 'Проверка')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })
    const values = onSubmit.mock.calls[0]?.[0]
    expect(new Date(values.remindAt).getDate()).toBe(BASE.getDate() + 1)
    expect(new Date(values.remindAt).getHours()).toBe(9)
  })
})

describe('ReminderForm — повтор', () => {
  it('по умолчанию выбрано «Без повтора»', async () => {
    const { getByLabelText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    expect(getByLabelText('Без повтора').props.accessibilityState?.selected).toBe(true)
  })

  it('выбор «Ежедневно» переключает активный вариант', async () => {
    const { getByLabelText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    await act(async () => {
      fireEvent.press(getByLabelText('Ежедневно'))
    })
    expect(getByLabelText('Ежедневно').props.accessibilityState?.selected).toBe(true)
    expect(getByLabelText('Без повтора').props.accessibilityState?.selected).toBe(false)
  })
})

describe('ReminderForm — submit/валидация', () => {
  it('кнопка создания disabled без заголовка и remindAt', async () => {
    const { getByLabelText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    expect(getByLabelText('Создать').props.accessibilityState?.disabled).toBe(true)
  })

  it('после заполнения заголовка и выбора времени кнопка активна и submit передаёт значения', async () => {
    setNow(BASE)
    const onSubmit = jest.fn()
    const { getByLabelText } = await render(<ReminderForm onSubmit={onSubmit} />)

    await act(async () => {
      fireEvent.changeText(getByLabelText('Заголовок напоминания'), '  Стирка  ')
    })
    await act(async () => {
      fireEvent.changeText(getByLabelText('Заметка к напоминанию'), '  Детали  ')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Вечером'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Ежедневно'))
    })

    expect(getByLabelText('Создать').props.accessibilityState?.disabled).toBe(false)
    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const values = onSubmit.mock.calls[0]?.[0]
    expect(values.title).toBe('Стирка')
    expect(values.notes).toBe('Детали')
    expect(values.recurrence).toBe('daily')
    expect(new Date(values.remindAt).getHours()).toBe(18)
  })

  it('для редактирования кнопка подписана «Сохранить»', async () => {
    const { getByLabelText } = await render(
      <ReminderForm
        initialValues={{ title: 'Свет', notes: '', remindAt: BASE.toISOString(), recurrence: 'none' }}
        submitLabel="Сохранить"
        onSubmit={jest.fn()}
      />,
    )
    expect(getByLabelText('Сохранить')).toBeTruthy()
  })
})

describe('ReminderForm — Android-безопасный пикер даты/времени', () => {
  const originalPlatformOS = require('react-native').Platform.OS

  afterEach(() => {
    require('react-native').Platform.OS = originalPlatformOS
  })

  it('на Android тап по карточке даты открывает шаг «date», а не «datetime»', async () => {
    require('react-native').Platform.OS = 'android'
    const { getByLabelText, getByTestId, queryByTestId } = await render(<ReminderForm onSubmit={jest.fn()} />)
    await act(async () => {
      fireEvent.press(getByLabelText('Выбрать дату и время'))
    })
    expect(getByTestId('datetimepicker-date')).toBeTruthy()
    expect(queryByTestId('datetimepicker-datetime')).toBeNull()
  })
})

describe('ReminderForm — footer', () => {
  it('рендерит переданный footer (дополнительные действия экрана редактирования)', async () => {
    const { getByText } = await render(
      <ReminderForm
        initialValues={{ title: 'Свет', notes: '', remindAt: BASE.toISOString(), recurrence: 'none' }}
        onSubmit={jest.fn()}
        footer={<></>}
      />,
    )
    expect(getByText('Свет')).toBeTruthy()
  })
})
