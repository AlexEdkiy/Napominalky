// Изолируем от нативного expo-sqlite
jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'

import ItemRow from '../ItemRow'
import type { ShoppingListItem } from '@/db/repositories/shoppingListsRepo'

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#fff',
      screenBg: '#F6F8FA',
      accent: '#5856D6',
      amber: '#F59E0B',
      accentSoftBg: '#EDE9FE',
      amberBg: '#FEF3C7',
      textPrimary: '#111',
      textSecondary: '#666',
      textTertiary: '#999',
      borderSubtle: '#eee',
      borderInput: '#ddd',
      danger: '#FF3B30',
      purple: '#7C6CF0',
      purpleBg: '#E9E7FB',
      noteBlue: '#4067a8',
      noteBlueBg: '#dde6f3',
    },
  }),
}))

const baseItem = (): ShoppingListItem => ({
  uuid: 'item-1',
  shoppingListUuid: 'list-1',
  userId: null,
  name: 'Тестовый пункт',
  category: 'other',
  quantity: 1,
  deadline: null,
  reminderAt: null,
  link: null,
  comment: null,
  tags: null,
  isChecked: false,
  status: 'new',
  position: 0,
  notificationId: null,
  serverRevision: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
})

/**
 * React 19 + RNTL 14: render() возвращает Promise.
 * Используем await render() для получения query-методов.
 */
describe('ItemRow — индикаторы мета-полей (свёрнутый вид)', () => {
  it('рендерит имя пункта без падений', async () => {
    const { getByText } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(getByText('Тестовый пункт')).toBeTruthy()
  })

  it('рендерит кнопку «Развернуть» если задан onExpand', async () => {
    const item = { ...baseItem(), reminderAt: '2026-07-01T18:00:00.000Z' }
    const { getByLabelText } = await render(
      <ItemRow
        item={item}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
        onExpand={jest.fn()}
        isExpanded={false}
      />,
    )
    expect(getByLabelText('Развернуть')).toBeTruthy()
  })

  it('рендерит чип тега (#первыйТег) если tags задан', async () => {
    const item = { ...baseItem(), tags: '["обувь","одежда"]' }
    const { getByText } = await render(
      <ItemRow
        item={item}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(getByText('#обувь')).toBeTruthy()
  })

  it('рендерит чип ×N для товара с quantity > 1', async () => {
    const item = { ...baseItem(), quantity: 3 }
    const { getByText } = await render(
      <ItemRow
        item={item}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(getByText('×3')).toBeTruthy()
  })

  it('рендерит чип дедлайна для задачи (локализованная дата, не raw ISO)', async () => {
    const item = { ...baseItem(), deadline: '2026-07-05' }
    const { getByText, queryByText } = await render(
      <ItemRow
        item={item}
        listType="tasks"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    // DEF-05: отображается «5 июл», а не raw «2026-07-05»
    expect(getByText('5 июл')).toBeTruthy()
    expect(queryByText('2026-07-05')).toBeNull()
  })

  it('не рендерит чип тега если tags=null', async () => {
    const { queryByText } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(queryByText(/^#/)).toBeNull()
  })
})

describe('ItemRow — статусы пунктов задач (только tasks)', () => {
  it('показывает бейдж статуса для пункта tasks-списка', async () => {
    const item = { ...baseItem(), status: 'in_progress' as const }
    const { getByTestId, getByText } = await render(
      <ItemRow item={item} listType="tasks" onToggle={jest.fn()} onDelete={jest.fn()} />,
    )
    expect(getByTestId('item-status-badge')).toBeTruthy()
    expect(getByText('В работе')).toBeTruthy()
  })

  it('НЕ показывает бейдж статуса для goods-списка', async () => {
    const { queryByTestId } = await render(
      <ItemRow item={baseItem()} listType="goods" onToggle={jest.fn()} onDelete={jest.fn()} />,
    )
    expect(queryByTestId('item-status-badge')).toBeNull()
  })

  it('тап по бейджу вызывает onOpenStatus с uuid пункта', async () => {
    const onOpenStatus = jest.fn()
    const item = { ...baseItem(), status: 'postponed' as const }
    const { getByLabelText } = await render(
      <ItemRow
        item={item}
        listType="tasks"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
        onOpenStatus={onOpenStatus}
      />,
    )
    fireEvent.press(getByLabelText('Статус: Отложена'))
    expect(onOpenStatus).toHaveBeenCalledWith('item-1')
  })

  it('зачёркивание пункта задачи — по status=done (приоритет над isChecked)', async () => {
    const item = { ...baseItem(), status: 'done' as const, isChecked: true }
    const { getByLabelText } = await render(
      <ItemRow item={item} listType="tasks" onToggle={jest.fn()} onDelete={jest.fn()} />,
    )
    const checkbox = getByLabelText('Отметить Тестовый пункт')
    expect(checkbox.props.accessibilityState.checked).toBe(true)
  })

  it('пункт задачи со status=in_progress НЕ зачёркнут (checked=false)', async () => {
    const item = { ...baseItem(), status: 'in_progress' as const }
    const { getByLabelText } = await render(
      <ItemRow item={item} listType="tasks" onToggle={jest.fn()} onDelete={jest.fn()} />,
    )
    const checkbox = getByLabelText('Отметить Тестовый пункт')
    expect(checkbox.props.accessibilityState.checked).toBe(false)
  })
})
