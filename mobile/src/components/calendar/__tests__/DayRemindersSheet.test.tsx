jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { accent: '#0D9488', amber: '#D9962A' },
  }),
}))

import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'

import DayRemindersSheet from '../DayRemindersSheet'
import type { Reminder } from '@/db/repositories/remindersRepo'

const makeReminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  uuid: 'r-1',
  userId: null,
  title: 'Купить молоко',
  notes: null,
  remindAt: '2026-07-02T21:00:00',
  recurrence: 'none',
  isCompleted: false,
  completedAt: null,
  snoozedUntil: null,
  sourceUuid: null,
  sourceType: null,
  notificationId: null,
  calendarEventId: null,
  serverRevision: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  deletedAt: null,
  ...overrides,
})

describe('DayRemindersSheet — заголовок и плюрализация', () => {
  it('заголовок «2 июля 2026»', async () => {
    const { getByText } = await render(
      <DayRemindersSheet date={new Date(2026, 6, 2)} reminders={[]} onOpenReminder={jest.fn()} />,
    )
    expect(getByText('2 июля 2026')).toBeTruthy()
  })

  it('1 напоминание → «1 событие»', async () => {
    const { getByText } = await render(
      <DayRemindersSheet
        date={new Date(2026, 6, 2)}
        reminders={[makeReminder()]}
        onOpenReminder={jest.fn()}
      />,
    )
    expect(getByText('1 событие')).toBeTruthy()
  })

  it('2 напоминания → «2 события»', async () => {
    const { getByText } = await render(
      <DayRemindersSheet
        date={new Date(2026, 6, 2)}
        reminders={[makeReminder({ uuid: 'r-1' }), makeReminder({ uuid: 'r-2' })]}
        onOpenReminder={jest.fn()}
      />,
    )
    expect(getByText('2 события')).toBeTruthy()
  })

  it('5 напоминаний → «5 событий»', async () => {
    const reminders = Array.from({ length: 5 }, (_, i) => makeReminder({ uuid: `r-${i}` }))
    const { getByText } = await render(
      <DayRemindersSheet date={new Date(2026, 6, 2)} reminders={reminders} onOpenReminder={jest.fn()} />,
    )
    expect(getByText('5 событий')).toBeTruthy()
  })

  it('пустой список — «Нет событий» и «0 событий»', async () => {
    const { getByText } = await render(
      <DayRemindersSheet date={new Date(2026, 6, 2)} reminders={[]} onOpenReminder={jest.fn()} />,
    )
    expect(getByText('Нет событий')).toBeTruthy()
    expect(getByText('0 событий')).toBeTruthy()
  })
})

describe('DayRemindersSheet — строка события', () => {
  it('отображает время, заголовок и подпись «Напоминание»', async () => {
    const { getByText } = await render(
      <DayRemindersSheet
        date={new Date(2026, 6, 2)}
        reminders={[makeReminder({ title: 'Купить молоко', remindAt: '2026-07-02T21:00:00' })]}
        onOpenReminder={jest.fn()}
      />,
    )
    expect(getByText('21:00')).toBeTruthy()
    expect(getByText('Купить молоко')).toBeTruthy()
    expect(getByText('Напоминание')).toBeTruthy()
  })

  it('отображает цветную точку (амбер)', async () => {
    const { getByTestId } = await render(
      <DayRemindersSheet
        date={new Date(2026, 6, 2)}
        reminders={[makeReminder({ uuid: 'r-42' })]}
        onOpenReminder={jest.fn()}
      />,
    )
    const dot = getByTestId('row-dot-r-42')
    const flatStyle = Array.isArray(dot.props.style) ? Object.assign({}, ...dot.props.style) : dot.props.style
    expect(flatStyle.backgroundColor).toBe('#D9962A')
  })

  it('тап по строке вызывает onOpenReminder с uuid напоминания', async () => {
    const onOpenReminder = jest.fn()
    const { getByLabelText } = await render(
      <DayRemindersSheet
        date={new Date(2026, 6, 2)}
        reminders={[makeReminder({ uuid: 'r-99', title: 'Позвонить врачу' })]}
        onOpenReminder={onOpenReminder}
      />,
    )
    fireEvent.press(getByLabelText('Позвонить врачу'))
    expect(onOpenReminder).toHaveBeenCalledWith('r-99')
  })

  it('пустой заголовок напоминания подменяется на «Без названия»', async () => {
    const { getByText } = await render(
      <DayRemindersSheet
        date={new Date(2026, 6, 2)}
        reminders={[makeReminder({ title: '   ' })]}
        onOpenReminder={jest.fn()}
      />,
    )
    expect(getByText('Без названия')).toBeTruthy()
  })
})
