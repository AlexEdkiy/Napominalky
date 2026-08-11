/**
 * UI-fidelity тесты сегмент-фильтра «Просроченные / Запланированные» по макету:
 * - две пилюли с корректными подписями и счётчиками;
 * - КРАСНЫЙ бейдж у «Просроченные» (danger) при count > 0, белая цифра;
 * - активный сегмент визуально выделен светлым фоном (surface), а не только
 *   accessibilityState.selected;
 * - роль tab + selected для скринридеров, переключение вызывает onChange.
 */
import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'

import ReminderSegmentedFilter from '@/components/reminders/ReminderSegmentedFilter'
import { lightColors } from '@/theme/colors'

const renderFilter = (
  active: 'overdue' | 'planned' = 'overdue',
  overdueCount = 3,
  plannedCount = 4,
  onChange: (s: 'overdue' | 'planned') => void = jest.fn(),
) =>
  render(
    <ReminderSegmentedFilter
      active={active}
      overdueCount={overdueCount}
      plannedCount={plannedCount}
      onChange={onChange}
    />,
  )

describe('ReminderSegmentedFilter — структура по макету', () => {
  it('две пилюли: «Просроченные» и «Запланированные» со счётчиками 3 и 4', async () => {
    const { getByLabelText, getByText } = await renderFilter()
    expect(getByLabelText('Просроченные')).toBeTruthy()
    expect(getByLabelText('Запланированные')).toBeTruthy()
    expect(getByText('3')).toBeTruthy()
    expect(getByText('4')).toBeTruthy()
  })

  it('бейдж «Просроченные» КРАСНЫЙ (danger) с белой цифрой при count > 0', async () => {
    const { getByTestId, getByText } = await renderFilter()
    expect(getByTestId('segment-badge-Просроченные')).toHaveStyle({
      backgroundColor: lightColors.danger,
    })
    expect(getByText('3')).toHaveStyle({ color: '#FFFFFF' })
  })

  it('бейдж «Просроченные» НЕ красный при count = 0', async () => {
    const { getByTestId } = await renderFilter('overdue', 0, 4)
    expect(getByTestId('segment-badge-Просроченные')).not.toHaveStyle({
      backgroundColor: lightColors.danger,
    })
  })

  it('бейдж «Запланированные» не красный даже при count > 0', async () => {
    const { getByTestId } = await renderFilter()
    expect(getByTestId('segment-badge-Запланированные')).not.toHaveStyle({
      backgroundColor: lightColors.danger,
    })
  })
})

describe('ReminderSegmentedFilter — активное состояние (визуально, не только selected)', () => {
  it('активный сегмент выделен светлым фоном surface, неактивный — без фона', async () => {
    const { getByLabelText } = await renderFilter('overdue')
    expect(getByLabelText('Просроченные')).toHaveStyle({
      backgroundColor: lightColors.surface,
    })
    expect(getByLabelText('Запланированные')).not.toHaveStyle({
      backgroundColor: lightColors.surface,
    })
  })

  it('при active="planned" светлый фон переходит на «Запланированные»', async () => {
    const { getByLabelText } = await renderFilter('planned')
    expect(getByLabelText('Запланированные')).toHaveStyle({
      backgroundColor: lightColors.surface,
    })
    expect(getByLabelText('Просроченные')).not.toHaveStyle({
      backgroundColor: lightColors.surface,
    })
  })

  it('роль tab и accessibilityState.selected отражают активный сегмент', async () => {
    const { getByLabelText } = await renderFilter('overdue')
    const overdue = getByLabelText('Просроченные')
    const planned = getByLabelText('Запланированные')
    expect(overdue.props.accessibilityRole).toBe('tab')
    expect(planned.props.accessibilityRole).toBe('tab')
    expect(overdue.props.accessibilityState?.selected).toBe(true)
    expect(planned.props.accessibilityState?.selected).toBe(false)
  })
})

describe('ReminderSegmentedFilter — переключение', () => {
  it('нажатие на пилюлю вызывает onChange с её сегментом', async () => {
    const onChange = jest.fn()
    const { getByLabelText } = await renderFilter('overdue', 3, 4, onChange)
    fireEvent.press(getByLabelText('Запланированные'))
    expect(onChange).toHaveBeenCalledWith('planned')
    fireEvent.press(getByLabelText('Просроченные'))
    expect(onChange).toHaveBeenCalledWith('overdue')
  })
})
