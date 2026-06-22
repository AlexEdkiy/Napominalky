// Изолируем от нативного expo-sqlite
jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { render } from '@testing-library/react-native'

import ItemRow from '../ItemRow'
import type { ShoppingListItem } from '@/db/repositories/shoppingListsRepo'

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#fff',
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
  position: 0,
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

  it('рендерит чип дедлайна для задачи', async () => {
    const item = { ...baseItem(), deadline: '2026-07-05' }
    const { getByText } = await render(
      <ItemRow
        item={item}
        listType="tasks"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(getByText('2026-07-05')).toBeTruthy()
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
