/**
 * UI-fidelity тесты карточки напоминания по макету:
 * - тон карточки: просроченные — danger (danger-soft фон), запланированные —
 *   amber (amberBg), консистентно с карточками задач/напоминаний на главной;
 * - заголовок и чип «дата, время» в формате «7 авг 2026, 10:00»;
 * - красная подпись «просрочено на N дней» ТОЛЬКО у просроченных;
 * - кнопка-галочка — скруглённый КВАДРАТ (radius 9), вызывает onComplete,
 *   тап по карточке — onPress;
 * - НЕТ лишних элементов: бейджа «источник/из какого списка» на карточке
 *   быть не должно (решение пользователя), даже если sourceType/sourceUuid заданы.
 */
import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'

import ReminderListItem from '@/components/reminders/ReminderListItem'
import { lightColors } from '@/theme/colors'
import type { Reminder } from '@/db/repositories/remindersRepo'

jest.mock('@expo/vector-icons', () => {
  const ReactLib = require('react')
  const { View } = require('react-native')
  const Ionicons = ({ name }: { name: string }) =>
    ReactLib.createElement(View, { testID: `icon-${name}` })
  return { Ionicons }
})

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  uuid: 'r-1',
  userId: null,
  title: 'Оплатить счёт',
  notes: null,
  remindAt: new Date(2026, 7, 7, 10, 0).toISOString(),
  recurrence: 'none',
  isCompleted: false,
  completedAt: null,
  snoozedUntil: null,
  sourceUuid: null,
  sourceType: null,
  notificationId: null,
  serverRevision: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
  ...overrides,
} as Reminder)

const renderItem = (
  overdueText: string | null = null,
  overrides: Partial<Reminder> = {},
  onPress = jest.fn(),
  onComplete = jest.fn(),
) =>
  render(
    <ReminderListItem
      reminder={reminder(overrides)}
      overdueText={overdueText}
      onPress={onPress}
      onComplete={onComplete}
    />,
  )

describe('ReminderListItem — состав карточки по макету', () => {
  it('иконка будильника, заголовок и чип «дата, время» в формате макета', async () => {
    const { getByTestId, getByText } = await renderItem()
    expect(getByTestId('icon-alarm')).toBeTruthy()
    expect(getByText('Оплатить счёт')).toBeTruthy()
    expect(getByText('7 авг 2026, 10:00')).toBeTruthy()
  })

  it('просроченный вариант: красная подпись просрочки', async () => {
    const { getByText } = await renderItem('просрочено на 3 дня')
    expect(getByText('просрочено на 3 дня')).toHaveStyle({ color: lightColors.danger })
  })

  it('запланированный вариант: подписи «просрочено…» нет', async () => {
    const { queryByText } = await renderItem(null)
    expect(queryByText(/просрочено/)).toBeNull()
  })

  it('запланированный вариант: amber-тон — иконка и чип даты на amberBg', async () => {
    const { getByTestId, getByText } = await renderItem(null)
    expect(getByTestId('reminder-icon-wrap'))
      .toHaveStyle({ backgroundColor: lightColors.amberBg })
    expect(getByTestId('reminder-date-chip'))
      .toHaveStyle({ backgroundColor: lightColors.amberBg })
    expect(getByText('7 авг 2026, 10:00')).toHaveStyle({ color: lightColors.amber })
  })

  it('просроченный вариант: danger-тон — иконка и чип даты на dangerSoftBg', async () => {
    const { getByTestId, getByText } = await renderItem('просрочено на 3 дня')
    expect(getByTestId('reminder-icon-wrap'))
      .toHaveStyle({ backgroundColor: lightColors.dangerSoftBg })
    expect(getByTestId('reminder-date-chip'))
      .toHaveStyle({ backgroundColor: lightColors.dangerSoftBg })
    expect(getByText('7 авг 2026, 10:00')).toHaveStyle({ color: lightColors.danger })
  })

  it('явный tone="planned" перекрывает вывод из overdueText', async () => {
    const { getByTestId } = await render(
      <ReminderListItem
        reminder={reminder()}
        overdueText={null}
        tone="overdue"
        onPress={jest.fn()}
        onComplete={jest.fn()}
      />,
    )
    expect(getByTestId('reminder-icon-wrap'))
      .toHaveStyle({ backgroundColor: lightColors.dangerSoftBg })
  })

  it('НЕТ бейджа источника, даже когда sourceType/sourceUuid заданы', async () => {
    const { queryAllByText } = await renderItem(null, {
      sourceType: 'list',
      sourceUuid: 'list-uuid-1',
    } as Partial<Reminder>)
    // На карточке ровно два текста: заголовок и чип даты — ничего лишнего.
    const texts = queryAllByText(/\S/).map((t) => t.props.children)
    expect(texts).toEqual(['Оплатить счёт', '7 авг 2026, 10:00'])
  })

  it('пустой заголовок заменяется на «Без названия»', async () => {
    const { getByText } = await renderItem(null, { title: '  ' })
    expect(getByText('Без названия')).toBeTruthy()
  })
})

describe('ReminderListItem — действия', () => {
  it('кнопка-галочка вызывает onComplete(uuid) и не открывает карточку', async () => {
    const onPress = jest.fn()
    const onComplete = jest.fn()
    const { getByLabelText, getByTestId } = await renderItem(null, {}, onPress, onComplete)
    expect(getByTestId('icon-checkmark')).toBeTruthy()
    fireEvent.press(getByLabelText('Выполнить: Оплатить счёт'))
    expect(onComplete).toHaveBeenCalledWith('r-1')
    expect(onPress).not.toHaveBeenCalled()
  })

  it('кнопка-галочка — скруглённый квадрат (radius 9 при стороне 30), не круг', async () => {
    const { getByTestId } = await renderItem()
    expect(getByTestId('reminder-check-btn')).toHaveStyle({
      width: 30,
      height: 30,
      borderRadius: 9,
    })
  })

  it('тап по карточке вызывает onPress(uuid)', async () => {
    const onPress = jest.fn()
    const { getByLabelText } = await renderItem(null, {}, onPress)
    fireEvent.press(getByLabelText('Оплатить счёт'))
    expect(onPress).toHaveBeenCalledWith('r-1')
  })
})
