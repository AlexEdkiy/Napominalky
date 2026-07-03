/**
 * После успешного создания напоминания экран должен просто вернуться назад
 * (router.back()), а НЕ открывать форму редактирования (/reminders/[uuid]) —
 * повторная кнопка «Сохранить» на только что созданном напоминании лишняя.
 */
import React from 'react'
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

jest.mock('@/hooks/useReminders', () => ({
  useReminders: () => ({
    createReminder: { mutate: mockMutate, isPending: false },
  }),
}))

jest.mock('@/components/reminders/ReminderForm', () => {
  const { Pressable, Text } = require('react-native')
  return {
    __esModule: true,
    default: ({
      onSubmit,
    }: {
      onSubmit: (values: {
        title: string
        notes: string
        remindAt: string
        recurrence: string
      }) => void
    }) => (
      <Pressable
        accessibilityLabel="Создать"
        onPress={() =>
          onSubmit({ title: 'Стирка', notes: '', remindAt: '2026-07-03T10:00:00.000Z', recurrence: 'none' })
        }
      >
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
})
