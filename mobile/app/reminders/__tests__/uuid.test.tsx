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

jest.mock('@/hooks/useReminders', () => ({
  useReminder: () => ({
    data: {
      uuid: 'rem-1',
      title: 'Свет',
      notes: null,
      remindAt: '2026-07-03T10:00:00.000Z',
      recurrence: 'none',
      isCompleted: false,
    },
    isLoading: false,
  }),
  useReminders: () => ({
    updateReminder: { mutate: mockUpdate, isPending: false },
    deleteReminder: { mutate: jest.fn(), isPending: false },
    completeReminder: { mutate: mockComplete, isPending: false },
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
}

const mockFormValues: MockFormValues = {
  title: 'Свет',
  notes: '',
  remindAt: '2026-07-03T10:00:00.000Z',
  recurrence: 'none',
  exportToCalendar: false,
}

jest.mock('@/components/reminders/ReminderForm', () => {
  const { Pressable, Text, View } = require('react-native')
  return {
    __esModule: true,
    default: ({
      onSubmit,
      footer,
    }: {
      onSubmit: (values: MockFormValues) => void
      footer?: React.ReactNode
    }) => (
      <View>
        <Pressable accessibilityLabel="Сохранить" onPress={() => onSubmit({ ...mockFormValues })}>
          <Text>Сохранить</Text>
        </Pressable>
        {footer}
      </View>
    ),
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
    mockFormValues.exportToCalendar = false
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
    expect(mockBack).not.toHaveBeenCalled()
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
    expect(alertSpy).toHaveBeenCalledWith('Добавлено в календарь', 'Напоминание экспортировано.')
    expect(mockBack).not.toHaveBeenCalled()
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
    expect(mockComplete).toHaveBeenCalledWith('rem-1')
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
