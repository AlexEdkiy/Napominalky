/**
 * Экран редактирования: при включённом чекбоксе «Добавить в календарь»
 * экспорт выполняется ТОЛЬКО после успешного сохранения (onSuccess мутации),
 * с показом Alert о результате; навигации после сохранения нет.
 */
import React from 'react'
import { Alert } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'

const mockBack = jest.fn()

jest.mock('expo-router', () => ({
  router: { back: (...args: unknown[]) => mockBack(...args), push: jest.fn() },
  useLocalSearchParams: () => ({ uuid: 'rem-1' }),
}))

const mockUpdate = jest.fn()

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
    completeReminder: { mutate: jest.fn(), isPending: false },
    snoozeReminder: { mutate: jest.fn(), isPending: false },
  }),
}))

const mockExport = jest.fn()

jest.mock('@/services/systemCalendar', () => ({
  exportReminderToCalendar: (...args: unknown[]) => mockExport(...args),
}))

jest.mock('@/components/reminders/SnoozeSheet', () => {
  const { View } = require('react-native')
  return { __esModule: true, default: () => <View testID="snooze-sheet" /> }
})

jest.mock('@/components/common/BaseButton', () => {
  const { View } = require('react-native')
  return { __esModule: true, default: () => <View testID="base-button" /> }
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
  const { Pressable, Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ onSubmit }: { onSubmit: (values: MockFormValues) => void }) => (
      <Pressable accessibilityLabel="Сохранить" onPress={() => onSubmit({ ...mockFormValues })}>
        <Text>Сохранить</Text>
      </Pressable>
    ),
  }
})

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReminderDetailScreen: React.FC = require('../[uuid]').default

describe('ReminderDetailScreen — экспорт в календарь после сохранения', () => {
  beforeEach(() => {
    mockBack.mockClear()
    mockUpdate.mockClear()
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
