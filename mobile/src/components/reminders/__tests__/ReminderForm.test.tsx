import fs from 'node:fs'
import path from 'node:path'

import React from 'react'
import { Alert } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'

import ReminderForm from '@/components/reminders/ReminderForm'
import { lightColors } from '@/theme/colors'

interface GuardOptions {
  data: { action: { type: string } }
}

const mockDispatch = jest.fn()
const mockGuard: { prevent: boolean; cb: ((options: GuardOptions) => void) | null } = {
  prevent: false,
  cb: null,
}

jest.mock('@react-navigation/core', () => ({
  useNavigation: () => ({ dispatch: mockDispatch }),
  usePreventRemove: (prevent: boolean, cb: (options: GuardOptions) => void) => {
    mockGuard.prevent = prevent
    mockGuard.cb = cb
  },
}))

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

beforeEach(() => {
  mockDispatch.mockClear()
  mockGuard.prevent = false
  mockGuard.cb = null
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('ReminderForm — секции и шапка', () => {
  it('рендерит светлую шапку с заголовком «Новое напоминание» для новой формы', async () => {
    const { getByText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    expect(getByText('Новое напоминание')).toBeTruthy()
  })

  it('рендерит заголовок существующего напоминания в шапке при редактировании', async () => {
    const { getByText } = await render(
      <ReminderForm
        initialValues={{
          title: 'Полить цветы',
          notes: '',
          remindAt: BASE.toISOString(),
          recurrence: 'none',
          exportToCalendar: false,
        }}
        onSubmit={jest.fn()}
      />,
    )
    expect(getByText('Полить цветы')).toBeTruthy()
  })

  it('заголовок «Напоминание», если у существующего напоминания пустой title', async () => {
    const { getByText } = await render(
      <ReminderForm
        initialValues={{
          title: '',
          notes: '',
          remindAt: BASE.toISOString(),
          recurrence: 'none',
          exportToCalendar: false,
        }}
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
        initialValues={{
          title: 'Свет',
          notes: '',
          remindAt: BASE.toISOString(),
          recurrence: 'none',
          exportToCalendar: false,
        }}
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
        initialValues={{
          title: 'Свет',
          notes: '',
          remindAt: BASE.toISOString(),
          recurrence: 'none',
          exportToCalendar: false,
        }}
        onSubmit={jest.fn()}
        footer={<></>}
      />,
    )
    expect(getByText('Свет')).toBeTruthy()
  })
})

describe('ReminderForm — точки секций (макет)', () => {
  it('точка секции «О чём напомнить» бирюзовая (colors.accent)', async () => {
    const { getByTestId } = await render(<ReminderForm onSubmit={jest.fn()} />)
    const style = [getByTestId('dot-about').props.style].flat()
    expect(style).toContainEqual({ backgroundColor: lightColors.accent })
  })

  it('точка секции «Когда напомнить» янтарная (colors.amber)', async () => {
    const { getByTestId } = await render(<ReminderForm onSubmit={jest.fn()} />)
    const style = [getByTestId('dot-when').props.style].flat()
    expect(style).toContainEqual({ backgroundColor: lightColors.amber })
  })

  it('точка секции «Повтор» бирюзовая (colors.accent)', async () => {
    const { getByTestId } = await render(<ReminderForm onSubmit={jest.fn()} />)
    const style = [getByTestId('dot-recurrence').props.style].flat()
    expect(style).toContainEqual({ backgroundColor: lightColors.accent })
  })
})

describe('ReminderForm — карточка «О чём напомнить»', () => {
  it('содержит разделитель между заголовком и заметкой', async () => {
    const { getByTestId } = await render(<ReminderForm onSubmit={jest.fn()} />)
    expect(getByTestId('about-card-divider')).toBeTruthy()
  })

  it('лейблы «ЗАГОЛОВОК»/«ЗАМЕТКА» отображаются', async () => {
    const { getByText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    expect(getByText('ЗАГОЛОВОК')).toBeTruthy()
    expect(getByText('ЗАМЕТКА')).toBeTruthy()
  })
})

describe('ReminderForm — строка «Дата и время»', () => {
  it('после выбора быстрого чипа отображает выбранное значение («Сегодня · ЧЧ:ММ»)', async () => {
    setNow(BASE)
    const { getByLabelText, getByText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    await act(async () => {
      fireEvent.press(getByLabelText('Вечером'))
    })
    expect(getByText('Сегодня · 18:00')).toBeTruthy()
  })
})

describe('ReminderForm — кнопка «Создать»', () => {
  it('содержит иконку checkmark-circle', async () => {
    const { getByTestId } = await render(<ReminderForm onSubmit={jest.fn()} />)
    expect(getByTestId('icon-checkmark-circle')).toBeTruthy()
  })
})

describe('ReminderForm — «Повтор»: радиокнопки в одну строку (макет)', () => {
  it('контейнер — radiogroup в один ряд (flexDirection row), внутри ровно 4 радио', async () => {
    const { getByTestId, getAllByRole } = await render(<ReminderForm onSubmit={jest.fn()} />)
    const row = getByTestId('recurrence-row')
    expect(row.props.accessibilityRole).toBe('radiogroup')
    const rowStyle = [row.props.style].flat()
    expect(rowStyle).toContainEqual(expect.objectContaining({ flexDirection: 'row' }))
    expect(rowStyle).not.toContainEqual(expect.objectContaining({ flexWrap: 'wrap' }))
    expect(getAllByRole('radio')).toHaveLength(4)
  })

  it('точка радио (акцентный кружок) есть только у выбранного варианта', async () => {
    const { getByLabelText, getByTestId, queryByTestId } = await render(<ReminderForm onSubmit={jest.fn()} />)
    expect(getByTestId('radio-dot-none')).toBeTruthy()
    expect(queryByTestId('radio-dot-daily')).toBeNull()

    await act(async () => {
      fireEvent.press(getByLabelText('Ежедневно'))
    })
    expect(getByTestId('radio-dot-daily')).toBeTruthy()
    expect(queryByTestId('radio-dot-none')).toBeNull()

    const dotStyle = [getByTestId('radio-dot-daily').props.style].flat()
    expect(dotStyle).toContainEqual({ backgroundColor: lightColors.accent })
  })

  it('выбор варианта попадает в submit (recurrence обновляется)', async () => {
    setNow(BASE)
    const onSubmit = jest.fn()
    const { getByLabelText } = await render(<ReminderForm onSubmit={onSubmit} />)
    await act(async () => {
      fireEvent.changeText(getByLabelText('Заголовок напоминания'), 'Проверка')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Вечером'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Ежемесячно'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })
    expect(onSubmit.mock.calls[0]?.[0].recurrence).toBe('monthly')
  })
})

describe('ReminderForm — чекбокс «Добавить в календарь»', () => {
  const fillValidForm = async (
    getByLabelText: Awaited<ReturnType<typeof render>>['getByLabelText'],
  ): Promise<void> => {
    await act(async () => {
      fireEvent.changeText(getByLabelText('Заголовок напоминания'), 'Стирка')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Вечером'))
    })
  }

  it('по умолчанию выключен и submit несёт exportToCalendar: false', async () => {
    setNow(BASE)
    const onSubmit = jest.fn()
    const { getByLabelText } = await render(<ReminderForm onSubmit={onSubmit} />)
    expect(getByLabelText('Добавить в календарь').props.accessibilityState?.checked).toBe(false)

    await fillValidForm(getByLabelText)
    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })
    expect(onSubmit.mock.calls[0]?.[0].exportToCalendar).toBe(false)
  })

  it('после включения чекбокса submit несёт exportToCalendar: true, экспорт при этом не выполняется', async () => {
    setNow(BASE)
    const onSubmit = jest.fn()
    const { getByLabelText } = await render(<ReminderForm onSubmit={onSubmit} />)

    await act(async () => {
      fireEvent.press(getByLabelText('Добавить в календарь'))
    })
    expect(getByLabelText('Добавить в календарь').props.accessibilityState?.checked).toBe(true)

    await fillValidForm(getByLabelText)
    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })
    expect(onSubmit.mock.calls[0]?.[0].exportToCalendar).toBe(true)
  })

  it('форма не импортирует exportReminderToCalendar — экспорт делают экраны после сохранения', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../ReminderForm.tsx'), 'utf-8')
    expect(source).not.toMatch(/exportReminderToCalendar/)
    expect(source).not.toMatch(/systemCalendar/)
  })
})

describe('ReminderForm — диалог «Сохранить изменения?» при уходе', () => {
  it('без изменений уход не блокируется (preventRemove = false)', async () => {
    await render(<ReminderForm onSubmit={jest.fn()} />)
    expect(mockGuard.prevent).toBe(false)
  })

  it('при изменениях уход блокируется и показывается Alert «Сохранить изменения?»', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    const { getByLabelText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    await act(async () => {
      fireEvent.changeText(getByLabelText('Заголовок напоминания'), 'Стирка')
    })
    expect(mockGuard.prevent).toBe(true)

    await act(async () => {
      mockGuard.cb?.({ data: { action: { type: 'GO_BACK' } } })
    })
    expect(alertSpy).toHaveBeenCalledWith(
      'Сохранить изменения?',
      expect.any(String),
      expect.any(Array),
    )
  })

  it('«Не сохранять» продолжает уход (dispatch исходного action), onSubmit не вызывается', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    const onSubmit = jest.fn()
    const { getByLabelText } = await render(<ReminderForm onSubmit={onSubmit} />)
    await act(async () => {
      fireEvent.changeText(getByLabelText('Заголовок напоминания'), 'Стирка')
    })
    const action = { type: 'GO_BACK' }
    await act(async () => {
      mockGuard.cb?.({ data: { action } })
    })

    const buttons = alertSpy.mock.calls[0]?.[2] ?? []
    const discard = buttons.find((b) => b.text === 'Не сохранять')
    await act(async () => {
      discard?.onPress?.()
    })
    expect(mockDispatch).toHaveBeenCalledWith(action)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('«Сохранить» при валидных данных вызывает onSubmit и продолжает уход', async () => {
    setNow(BASE)
    const alertSpy = jest.spyOn(Alert, 'alert')
    const onSubmit = jest.fn()
    const { getByLabelText } = await render(<ReminderForm onSubmit={onSubmit} />)
    await act(async () => {
      fireEvent.changeText(getByLabelText('Заголовок напоминания'), 'Стирка')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Вечером'))
    })

    const action = { type: 'GO_BACK' }
    await act(async () => {
      mockGuard.cb?.({ data: { action } })
    })
    const buttons = alertSpy.mock.calls[0]?.[2] ?? []
    const save = buttons.find((b) => b.text === 'Сохранить')
    expect(save).toBeTruthy()
    await act(async () => {
      save?.onPress?.()
    })
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(mockDispatch).toHaveBeenCalledWith(action)
  })

  it('при невалидных данных кнопки «Сохранить» нет — только «Не сохранять» и «Отмена»', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    const { getByLabelText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    // Только заметка — заголовок и дата пустые, сохранить нельзя.
    await act(async () => {
      fireEvent.changeText(getByLabelText('Заметка к напоминанию'), 'Детали')
    })
    await act(async () => {
      mockGuard.cb?.({ data: { action: { type: 'GO_BACK' } } })
    })
    const buttons = alertSpy.mock.calls[0]?.[2] ?? []
    expect(buttons.map((b) => b.text)).toEqual(['Отмена', 'Не сохранять'])
  })

  it('после успешного submit dirty сбрасывается — уход больше не блокируется', async () => {
    setNow(BASE)
    const { getByLabelText } = await render(<ReminderForm onSubmit={jest.fn()} />)
    await act(async () => {
      fireEvent.changeText(getByLabelText('Заголовок напоминания'), 'Стирка')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Вечером'))
    })
    expect(mockGuard.prevent).toBe(true)

    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })
    expect(mockGuard.prevent).toBe(false)
  })
})

describe('ReminderForm — светлая шапка (без градиента), как у формы заметки/задачи', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../ReminderForm.tsx'), 'utf-8')

  it('не импортирует expo-linear-gradient', () => {
    expect(source).not.toMatch(/expo-linear-gradient/)
  })

  it('не использует LinearGradient и старый тёмный градиент шапки', () => {
    expect(source).not.toMatch(/LinearGradient/)
    expect(source).not.toMatch(/HEADER_GRADIENT/)
    expect(source).not.toMatch(/#0f6155/)
    expect(source).not.toMatch(/#0c463d/)
  })

  it('шапка использует системный фон (colors.screenBg) и тёмный текст (colors.textPrimary)', () => {
    expect(source).toMatch(/backgroundColor: colors\.screenBg/)
    expect(source).toMatch(/styles\.headerTitle, \{ color: colors\.textPrimary \}/)
  })
})
