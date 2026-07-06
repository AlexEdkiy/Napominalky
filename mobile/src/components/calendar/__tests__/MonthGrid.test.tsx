/**
 * Покрытие сворачивания сетки месяца до одной недели (по selectedDate).
 */
import React from 'react'
import { render } from '@testing-library/react-native'

import MonthGrid from '../MonthGrid'
import type { Reminder } from '@/db/repositories/remindersRepo'

const emptyByDay = new Map<string, Reminder[]>()

// Июль 2026 (month=6, 0-indexed): 1 июля — среда, сетка 6×7=42 ячейки.
describe('MonthGrid — сворачивание до недели', () => {
  it('collapsed=false рендерит полную сетку (42 дня)', async () => {
    const { getAllByRole } = await render(
      <MonthGrid
        year={2026}
        month={6}
        byDay={emptyByDay}
        selectedDate={new Date(2026, 6, 15)}
        collapsed={false}
        onSelectDay={jest.fn()}
      />,
    )
    expect(getAllByRole('button')).toHaveLength(42)
  })

  it('collapsed=true показывает только неделю с выбранной датой (7 дней)', async () => {
    const { getAllByRole, getByLabelText } = await render(
      <MonthGrid
        year={2026}
        month={6}
        byDay={emptyByDay}
        selectedDate={new Date(2026, 6, 15)}
        collapsed
        onSelectDay={jest.fn()}
      />,
    )
    expect(getAllByRole('button')).toHaveLength(7)
    expect(getByLabelText('15')).toBeTruthy()
  })

  it('при смене выбранной даты в свёрнутом виде показывается неделя новой даты', async () => {
    const { rerender, getAllByRole, getByLabelText } = await render(
      <MonthGrid
        year={2026}
        month={6}
        byDay={emptyByDay}
        selectedDate={new Date(2026, 6, 1)}
        collapsed
        onSelectDay={jest.fn()}
      />,
    )
    expect(getAllByRole('button')).toHaveLength(7)

    await rerender(
      <MonthGrid
        year={2026}
        month={6}
        byDay={emptyByDay}
        selectedDate={new Date(2026, 6, 29)}
        collapsed
        onSelectDay={jest.fn()}
      />,
    )
    expect(getAllByRole('button')).toHaveLength(7)
    expect(getByLabelText('29')).toBeTruthy()
  })

  it('если выбранная дата вне текущей сетки месяца — падает на первую неделю (не пусто)', async () => {
    const { getAllByRole } = await render(
      <MonthGrid
        year={2026}
        month={6}
        byDay={emptyByDay}
        selectedDate={new Date(2027, 0, 1)}
        collapsed
        onSelectDay={jest.fn()}
      />,
    )
    expect(getAllByRole('button')).toHaveLength(7)
  })

  it('кружок выбранного дня «чистый» — без точки-маркера событий', async () => {
    const selected = new Date(2026, 6, 15)
    const byDay = new Map<string, Reminder[]>([
      ['2026-07-15', [{ uuid: 'r-1' } as Reminder]],
    ])
    const { queryByTestId } = await render(
      <MonthGrid
        year={2026}
        month={6}
        byDay={byDay}
        selectedDate={selected}
        collapsed={false}
        onSelectDay={jest.fn()}
      />,
    )
    expect(queryByTestId('day-dot-2026-07-15')).toBeNull()
  })

  it('показывает ненавязчивую точку под невыбранным днём с событиями', async () => {
    const selected = new Date(2026, 6, 15)
    const byDay = new Map<string, Reminder[]>([
      ['2026-07-16', [{ uuid: 'r-1' } as Reminder]],
    ])
    const { getByTestId } = await render(
      <MonthGrid
        year={2026}
        month={6}
        byDay={byDay}
        selectedDate={selected}
        collapsed={false}
        onSelectDay={jest.fn()}
      />,
    )
    expect(getByTestId('day-dot-2026-07-16')).toBeTruthy()
  })
})
