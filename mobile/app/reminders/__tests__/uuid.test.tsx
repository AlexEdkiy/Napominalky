/**
 * Экран редактирования:
 * - при включённом чекбоксе «Добавить в календарь» экспорт выполняется ТОЛЬКО
 *   после успешного сохранения (onSuccess мутации), с показом Alert о
 *   результате; навигации после сохранения нет;
 * - кнопка «Выполнить» показывает Alert «Закрыть напоминание?», мутация —
 *   только по кнопке «Закрыть»;
 * - кнопки «Отложить» и SnoozeSheet на экране больше НЕТ.
 */
import React from 'react'
import { Alert, type AlertButton } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'

const mockBack = jest.fn()

jest.mock('expo-router', () => ({
  router: { back: (...args: unknown[]) => mockBack(...args), push: jest.fn() },
  useLocalSearchParams: () => ({ uuid: 'rem-1' }),
}))

const mockUpdate = jest.fn()
const mockComplete = jest.fn()
const mockSetCalendarEventId = jest.fn()

const mockReminder: Record<string, unknown> = {
  uuid: 'rem-1',
  title: 'Свет',
  notes: null,
  remindAt: '2026-07-03T10:00:00.000Z',
  recurrence: 'none',
  isCompleted: false,
  calendarEventId: null,
}

jest.mock('@/hooks/useReminders', () => ({
  useReminder: () => ({
    data: mockReminder,
    isLoading: false,
  }),
  useReminders: () => ({
    updateReminder: { mutate: mockUpdate, isPending: false },
    deleteReminder: { mutate: jest.fn(), isPending: false },
    completeReminder: { mutate: mockComplete, isPending: false },
    setCalendarEventId: { mutate: mockSetCalendarEventId, isPending: false },
  }),
}))

const mockExport = jest.fn()

jest.mock('@/services/systemCalendar', () => ({
  exportReminderToCalendar: (...args: unknown[]) => mockExport(...args),
}))

jest.mock('@/components/common/BaseButton', () => {
  const { Pressable, Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ label, onPress }: { label: string; onPress?: () => void }) => (
      <Pressable accessibilityLabel={label} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  }
})

interface MockFormValues {
  title: string
  notes: string
  remindAt: string
  recurrence: string
  exportToCalendar: boolean
  exportedToCalendar: boolean
}

const mockFormValues: MockFormValues = {
  title: 'Свет',
  notes: '',
  remindAt: '2026-07-03T10:00:00.000Z',
  recurrence: 'none',
  exportToCalendar: false,
  exportedToCalendar: false,
}

/** Последние initialValues, переданные экраном в форму (для проверок). */
const capturedInitialValues: { current: MockFormValues | null } = { current: null }

jest.mock('@/components/reminders/ReminderForm', () => {
  const { Pressable, Text, View } = require('react-native')
  return {
    __esModule: true,
    default: ({
      initialValues,
      onSubmit,
      footer,
    }: {
      initialValues?: MockFormValues
      onSubmit: (values: MockFormValues) => void
      footer?: React.ReactNode
    }) => {
      capturedInitialValues.current = initialValues ?? null
      return (
        <View>
          <Pressable accessibilityLabel="Сохранить" onPress={() => onSubmit({ ...mockFormValues })}>
            <Text>Сохранить</Text>
          </Pressable>
          {footer}
        </View>
      )
    },
  }
})

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReminderDetailScreen: React.FC = require('../[uuid]').default

describe('ReminderDetailScreen — экспорт в календарь после сохранения', () => {
  beforeEach(() => {
    mockBack.mockClear()
    mockUpdate.mockClear()
    mockComplete.mockClear()
    mockExport.mockClear()
    mockSetCalendarEventId.mockClear()
    mockFormValues.exportToCalendar = false
    mockReminder.calendarEventId = null
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('без чекбокса onSuccess не вызывает экспорт и не навигирует', async () => {
    mockUpdate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.({})
    })

    const { getByLabelText } = await render(<ReminderDetailScreen />)
    await act(async () => {
      fireEvent.press(getByLabelText('Сохранить'))
    })

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockExport).not.toHaveBeenCalled()
    // «Сохранить» закрывает форму (возврат назад) сразу после успешного PUT.
    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('с чекбоксом экспорт вызывается только после onSuccess, с Alert о результате', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    mockFormValues.exportToCalendar = true
    mockExport.mockResolvedValue('event-9')

    let savedOpts: { onSuccess?: (data: unknown) => void } | undefined
    mockUpdate.mockImplementation((_data, opts) => {
      savedOpts = opts
    })

    const { getByLabelText } = await render(<ReminderDetailScreen />)
    await act(async () => {
      fireEvent.press(getByLabelText('Сохранить'))
    })
    expect(mockExport).not.toHaveBeenCalled()

    await act(async () => {
      savedOpts?.onSuccess?.({})
    })
    expect(mockExport).toHaveBeenCalledWith({
      title: 'Свет',
      notes: null,
      remind_at: '2026-07-03T10:00:00.000Z',
    })
    expect(alertSpy).toHaveBeenCalledWith(
      'Добавлено в календарь',
      'Напоминание экспортировано.',
      [expect.objectContaining({ text: 'OK' })],
    )
    // Возврат назад — только после закрытия алерта (кнопка OK).
    expect(mockBack).not.toHaveBeenCalled()
    const okButtons = alertSpy.mock.calls.at(-1)?.[2] as AlertButton[]
    okButtons.find((b) => b.text === 'OK')?.onPress?.()
    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('после успешного экспорта сохраняет eventId в calendar_event_id напоминания', async () => {
    jest.spyOn(Alert, 'alert')
    mockFormValues.exportToCalendar = true
    mockExport.mockResolvedValue('event-9')
    mockUpdate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.({})
    })

    const { getByLabelText } = await render(<ReminderDetailScreen />)
    await act(async () => {
      fireEvent.press(getByLabelText('Сохранить'))
    })

    expect(mockSetCalendarEventId).toHaveBeenCalledWith({
      uuid: 'rem-1',
      calendarEventId: 'event-9',
    })
  })

  it('при неуспешном экспорте (null) calendar_event_id НЕ записывается', async () => {
    jest.spyOn(Alert, 'alert')
    mockFormValues.exportToCalendar = true
    mockExport.mockResolvedValue(null)
    mockUpdate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.({})
    })

    const { getByLabelText } = await render(<ReminderDetailScreen />)
    await act(async () => {
      fireEvent.press(getByLabelText('Сохранить'))
    })

    expect(mockSetCalendarEventId).not.toHaveBeenCalled()
  })
})

describe('ReminderDetailScreen — признак exportedToCalendar в initialValues формы', () => {
  beforeEach(() => {
    capturedInitialValues.current = null
    mockReminder.calendarEventId = null
  })

  it('calendarEventId = null → exportedToCalendar: false', async () => {
    await render(<ReminderDetailScreen />)
    expect(capturedInitialValues.current?.exportedToCalendar).toBe(false)
  })

  it('calendarEventId задан → exportedToCalendar: true (форма покажет «В календаре»)', async () => {
    mockReminder.calendarEventId = 'event-42'
    await render(<ReminderDetailScreen />)
    expect(capturedInitialValues.current?.exportedToCalendar).toBe(true)
  })

  it('уже экспортировано: submit c exportToCalendar: false не запускает повторный экспорт', async () => {
    mockReminder.calendarEventId = 'event-42'
    // Форма для экспортированного напоминания всегда шлёт exportToCalendar: false.
    mockFormValues.exportToCalendar = false
    mockExport.mockClear()
    mockSetCalendarEventId.mockClear()
    mockUpdate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.({})
    })

    const { getByLabelText } = await render(<ReminderDetailScreen />)
    await act(async () => {
      fireEvent.press(getByLabelText('Сохранить'))
    })

    expect(mockExport).not.toHaveBeenCalled()
    expect(mockSetCalendarEventId).not.toHaveBeenCalled()
  })
})

describe('ReminderDetailScreen — «Выполнить» с подтверждением', () => {
  beforeEach(() => {
    mockComplete.mockClear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('нажатие «Выполнить» показывает Alert «Закрыть напоминание?» без мутации', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    const { getByLabelText } = await render(<ReminderDetailScreen />)
    fireEvent.press(getByLabelText('Выполнить'))
    expect(alertSpy).toHaveBeenCalledWith(
      'Закрыть напоминание?',
      undefined,
      expect.any(Array),
    )
    expect(mockComplete).not.toHaveBeenCalled()
    const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[]
    expect(buttons.map((b) => b.text)).toEqual(['Отмена', 'Закрыть'])
  })

  it('по кнопке «Закрыть» вызывается completeReminder.mutate(uuid)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    const { getByLabelText } = await render(<ReminderDetailScreen />)
    fireEvent.press(getByLabelText('Выполнить'))
    const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[]
    buttons.find((b) => b.text === 'Закрыть')?.onPress?.()
    expect(mockComplete).toHaveBeenCalledWith('rem-1', { onSuccess: expect.any(Function) })
  })

  it('кнопка «Отмена» (style: cancel) не вызывает мутацию', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    const { getByLabelText } = await render(<ReminderDetailScreen />)
    fireEvent.press(getByLabelText('Выполнить'))
    const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[]
    const cancel = buttons.find((b) => b.text === 'Отмена')
    expect(cancel?.style).toBe('cancel')
    cancel?.onPress?.()
    expect(mockComplete).not.toHaveBeenCalled()
  })
})

describe('ReminderDetailScreen — кнопки «Отложить» больше нет', () => {
  it('на экране нет «Отложить» и SnoozeSheet, «Выполнить» осталась', async () => {
    const { getByLabelText, queryByText, queryByTestId } = await render(<ReminderDetailScreen />)
    expect(getByLabelText('Выполнить')).toBeTruthy()
    expect(queryByText('Отложить')).toBeNull()
    expect(queryByTestId('snooze-sheet')).toBeNull()
  })
})
