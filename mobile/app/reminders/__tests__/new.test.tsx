/**
 * После успешного создания напоминания экран должен просто вернуться назад
 * (router.back()), а НЕ открывать форму редактирования (/reminders/[uuid]).
 * Если в форме включён чекбокс «Добавить в календарь» — экспорт выполняется
 * ТОЛЬКО после успешного сохранения, затем показывается Alert с результатом,
 * и назад экран уходит после закрытия алерта.
 */
import React from 'react'
import { Alert } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'

const mockBack = jest.fn()
const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  router: {
    back: (...args: unknown[]) => mockBack(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    push: jest.fn(),
  },
}))

const mockMutate = jest.fn()
const mockSetCalendarEventId = jest.fn()

jest.mock('@/hooks/useReminders', () => ({
  useReminders: () => ({
    createReminder: { mutate: mockMutate, isPending: false },
    setCalendarEventId: { mutate: mockSetCalendarEventId, isPending: false },
  }),
}))

const mockExport = jest.fn()

jest.mock('@/services/systemCalendar', () => ({
  exportReminderToCalendar: (...args: unknown[]) => mockExport(...args),
}))

interface MockFormValues {
  title: string
  notes: string
  remindAt: string
  recurrence: string
  exportToCalendar: boolean
  exportedToCalendar: boolean
}

const mockFormValues: MockFormValues = {
  title: 'Стирка',
  notes: '',
  remindAt: '2026-07-03T10:00:00.000Z',
  recurrence: 'none',
  exportToCalendar: false,
  exportedToCalendar: false,
}

jest.mock('@/components/reminders/ReminderForm', () => {
  const { Pressable, Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ onSubmit }: { onSubmit: (values: MockFormValues) => void }) => (
      <Pressable accessibilityLabel="Создать" onPress={() => onSubmit({ ...mockFormValues })}>
        <Text>Создать</Text>
      </Pressable>
    ),
  }
})

// eslint-disable-next-line @typescript-eslint/no-var-requires
const NewReminderScreen: React.FC = require('../new').default

describe('NewReminderScreen — после создания', () => {
  beforeEach(() => {
    mockBack.mockClear()
    mockReplace.mockClear()
    mockMutate.mockClear()
    mockExport.mockClear()
    mockSetCalendarEventId.mockClear()
    mockFormValues.exportToCalendar = false
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('onSuccess вызывает router.back(), а не replace на /reminders/[uuid]', async () => {
    mockMutate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.({ uuid: 'new-uuid-123' })
    })

    const { getByLabelText } = await render(<NewReminderScreen />)
    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })

    expect(mockBack).toHaveBeenCalledTimes(1)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('без чекбокса экспорт в календарь не вызывается', async () => {
    mockMutate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.({ uuid: 'new-uuid-123' })
    })

    const { getByLabelText } = await render(<NewReminderScreen />)
    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })

    expect(mockExport).not.toHaveBeenCalled()
  })

  it('с чекбоксом экспорт выполняется ПОСЛЕ успешного сохранения, Alert показан, back — после «OK»', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    mockFormValues.exportToCalendar = true
    mockExport.mockResolvedValue('event-1')

    let savedOpts: { onSuccess?: (data: unknown) => void } | undefined
    mockMutate.mockImplementation((_data, opts) => {
      savedOpts = opts
    })

    const { getByLabelText } = await render(<NewReminderScreen />)
    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })

    // Сохранение ещё не завершилось — экспорта нет.
    expect(mockExport).not.toHaveBeenCalled()

    await act(async () => {
      savedOpts?.onSuccess?.({ uuid: 'new-uuid-123' })
    })
    expect(mockExport).toHaveBeenCalledWith({
      title: 'Стирка',
      notes: null,
      remind_at: '2026-07-03T10:00:00.000Z',
    })
    expect(alertSpy).toHaveBeenCalledWith(
      'Добавлено в календарь',
      'Напоминание экспортировано.',
      expect.any(Array),
    )

    // Назад — только после закрытия алерта.
    expect(mockBack).not.toHaveBeenCalled()
    const buttons = alertSpy.mock.calls[0]?.[2] ?? []
    await act(async () => {
      buttons.find((b) => b.text === 'OK')?.onPress?.()
    })
    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('при неудачном экспорте показывает Alert «Не удалось» и всё равно уходит назад после «OK»', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    mockFormValues.exportToCalendar = true
    mockExport.mockResolvedValue(null)
    mockMutate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.({ uuid: 'new-uuid-123' })
    })

    const { getByLabelText } = await render(<NewReminderScreen />)
    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })

    expect(alertSpy).toHaveBeenCalledWith(
      'Не удалось',
      'Нет разрешения или произошла ошибка.',
      expect.any(Array),
    )
    const buttons = alertSpy.mock.calls[0]?.[2] ?? []
    await act(async () => {
      buttons.find((b) => b.text === 'OK')?.onPress?.()
    })
    expect(mockBack).toHaveBeenCalledTimes(1)
  })
})

describe('NewReminderScreen — сохранение eventId в calendar_event_id', () => {
  beforeEach(() => {
    mockBack.mockClear()
    mockMutate.mockClear()
    mockExport.mockClear()
    mockSetCalendarEventId.mockClear()
    mockFormValues.exportToCalendar = true
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('после успешного экспорта сохраняет eventId для uuid созданного напоминания', async () => {
    jest.spyOn(Alert, 'alert')
    mockExport.mockResolvedValue('event-1')
    mockMutate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.({ uuid: 'new-uuid-123' })
    })

    const { getByLabelText } = await render(<NewReminderScreen />)
    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })

    expect(mockSetCalendarEventId).toHaveBeenCalledWith({
      uuid: 'new-uuid-123',
      calendarEventId: 'event-1',
    })
  })

  it('при неуспешном экспорте (null) calendar_event_id НЕ записывается', async () => {
    jest.spyOn(Alert, 'alert')
    mockExport.mockResolvedValue(null)
    mockMutate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.({ uuid: 'new-uuid-123' })
    })

    const { getByLabelText } = await render(<NewReminderScreen />)
    await act(async () => {
      fireEvent.press(getByLabelText('Создать'))
    })

    expect(mockSetCalendarEventId).not.toHaveBeenCalled()
  })
})
