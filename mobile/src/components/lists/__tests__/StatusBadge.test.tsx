// Изолируем от нативного expo-sqlite
jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'

import StatusBadge, { statusBadgeColors } from '../StatusBadge'
import StatusSheet from '../StatusSheet'
import { lightColors } from '@/theme/colors'

jest.mock('@/theme', () => {
  const { lightColors: colors } = jest.requireActual('@/theme/colors')
  return { useTheme: () => ({ colors }) }
})

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

describe('StatusBadge — пилюля статуса', () => {
  it.each([
    ['new', 'Новая'],
    ['in_progress', 'В работе'],
    ['postponed', 'Отложена'],
    ['done', 'Выполнена'],
  ] as const)('статус %s → подпись «%s»', async (status, label) => {
    const { getByText } = await render(<StatusBadge status={status} />)
    expect(getByText(label)).toBeTruthy()
  })

  it('вызывает onPress по тапу', async () => {
    const onPress = jest.fn()
    const { getByLabelText } = await render(
      <StatusBadge status="in_progress" onPress={onPress} />,
    )
    fireEvent.press(getByLabelText('Статус: В работе'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('без onPress — не кнопка (нет accessibility-обёртки)', async () => {
    const { queryByLabelText } = await render(<StatusBadge status="new" />)
    expect(queryByLabelText('Статус: Новая')).toBeNull()
  })
})

describe('statusBadgeColors — цвета по веб-палитре', () => {
  it('Новая — синий, В работе — amber, Отложена — фиолетовый, Выполнена — зелёный', () => {
    expect(statusBadgeColors('new', lightColors).fg).toBe(lightColors.noteBlue)
    expect(statusBadgeColors('in_progress', lightColors).fg).toBe(lightColors.amber)
    expect(statusBadgeColors('postponed', lightColors).fg).toBe(lightColors.purple)
    expect(statusBadgeColors('done', lightColors).fg).toBe(lightColors.accent)
  })
})

describe('StatusSheet — шторка выбора статуса', () => {
  it('рендерит 4 статуса; «Авто» отсутствует без showAuto', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <StatusSheet
        visible
        title="Статус пункта"
        current="new"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    )
    expect(getByLabelText('Новая')).toBeTruthy()
    expect(getByLabelText('В работе')).toBeTruthy()
    expect(getByLabelText('Отложена')).toBeTruthy()
    expect(getByLabelText('Выполнена')).toBeTruthy()
    expect(queryByLabelText('Авто')).toBeNull()
  })

  it('showAuto добавляет пункт «Авто»; выбор возвращает "auto"', async () => {
    const onSelect = jest.fn()
    const { getByLabelText } = await render(
      <StatusSheet
        visible
        title="Статус задачи"
        current="in_progress"
        showAuto
        isAuto
        onSelect={onSelect}
        onClose={jest.fn()}
      />,
    )
    fireEvent.press(getByLabelText('Авто'))
    expect(onSelect).toHaveBeenCalledWith('auto')
  })

  it('выбор статуса возвращает его значение', async () => {
    const onSelect = jest.fn()
    const { getByLabelText } = await render(
      <StatusSheet
        visible
        title="Статус пункта"
        current="new"
        onSelect={onSelect}
        onClose={jest.fn()}
      />,
    )
    fireEvent.press(getByLabelText('Отложена'))
    expect(onSelect).toHaveBeenCalledWith('postponed')
  })

  it('не рендерится при visible=false', async () => {
    const { queryByTestId } = await render(
      <StatusSheet
        visible={false}
        title="Статус"
        current="new"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    )
    expect(queryByTestId('status-sheet')).toBeNull()
  })
})
