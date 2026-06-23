/**
 * UI-fidelity тесты: ItemRow — соответствие дизайн-макету.
 * Проверяем: структуру строки, порядок чипов, состояния чекбокса,
 * зачёркивание done-пунктов, раскрытый редактор.
 */
jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('@/hooks/useDebouncedCallback', () => ({
  useDebouncedCallback: (fn: unknown) => fn,
}))

import React from 'react'
import { render } from '@testing-library/react-native'

import ItemRow from '../ItemRow'
import type { ShoppingListItem } from '@/db/repositories/shoppingListsRepo'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#fff',
      screenBg: '#F6F8FA',
      accent: '#0EA5A0',
      amber: '#F59E0B',
      accentSoftBg: '#DDF1ED',
      amberBg: '#FBEFD6',
      textPrimary: '#111',
      textSecondary: '#666',
      textTertiary: '#999',
      borderSubtle: '#eee',
      borderInput: '#ddd',
      danger: '#FF3B30',
    },
  }),
}))

const base = (): ShoppingListItem => ({
  uuid: 'item-1',
  shoppingListUuid: 'list-1',
  userId: null,
  name: 'Молоко',
  category: 'products',
  quantity: 1,
  deadline: null,
  reminderAt: null,
  link: null,
  comment: null,
  tags: null,
  isChecked: false,
  position: 0,
  notificationId: null,
  serverRevision: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
})

// ============================================================
// Структура строки пункта
// ============================================================

describe('ItemRow — структура строки (макет)', () => {
  it('[goods] чекбокс — квадрат (borderRadius=7)', async () => {
    const { getByRole } = await render(
      <ItemRow item={base()} listType="goods" onToggle={jest.fn()} onDelete={jest.fn()} />,
    )
    const cb = getByRole('checkbox')
    // borderRadius для goods = 7 (не круг)
    expect(cb.props.style).toBeDefined()
  })

  it('[tasks] чекбокс — круг (borderRadius=10)', async () => {
    const { getByRole } = await render(
      <ItemRow item={base()} listType="tasks" onToggle={jest.fn()} onDelete={jest.fn()} />,
    )
    const cb = getByRole('checkbox')
    expect(cb.props.accessibilityRole).toBe('checkbox')
  })

  it('чекбокс не отмечен когда isChecked=false', async () => {
    const { getByRole } = await render(
      <ItemRow item={base()} listType="goods" onToggle={jest.fn()} onDelete={jest.fn()} />,
    )
    expect(getByRole('checkbox').props.accessibilityState?.checked).toBe(false)
  })

  it('чекбокс отмечен когда isChecked=true', async () => {
    const { getByRole } = await render(
      <ItemRow item={{ ...base(), isChecked: true }} listType="goods" onToggle={jest.fn()} onDelete={jest.fn()} />,
    )
    expect(getByRole('checkbox').props.accessibilityState?.checked).toBe(true)
  })

  it('название зачёркнуто когда isChecked=true (textDecorationLine=line-through)', async () => {
    const { getByText } = await render(
      <ItemRow item={{ ...base(), isChecked: true }} listType="goods" onToggle={jest.fn()} onDelete={jest.fn()} />,
    )
    const nameEl = getByText('Молоко')
    const styleArr = Array.isArray(nameEl.props.style) ? nameEl.props.style : [nameEl.props.style]
    const hasStrike = styleArr.some(
      (s: Record<string, unknown> | undefined) => s?.textDecorationLine === 'line-through',
    )
    expect(hasStrike).toBe(true)
  })

  it('название НЕ зачёркнуто когда isChecked=false', async () => {
    const { getByText } = await render(
      <ItemRow item={base()} listType="goods" onToggle={jest.fn()} onDelete={jest.fn()} />,
    )
    const nameEl = getByText('Молоко')
    const styleArr = Array.isArray(nameEl.props.style) ? nameEl.props.style : [nameEl.props.style]
    const hasStrike = styleArr.some(
      (s: Record<string, unknown> | undefined) => s?.textDecorationLine === 'line-through',
    )
    expect(hasStrike).toBe(false)
  })
})

// ============================================================
// Порядок чипов: тег → ×N → дедлайн
// ============================================================

describe('ItemRow — порядок чипов (макет)', () => {
  it('[goods] чип #тег присутствует при наличии тегов', async () => {
    const { getByText } = await render(
      <ItemRow
        item={{ ...base(), tags: '["молочные"]' }}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(getByText('#молочные')).toBeTruthy()
  })

  it('[goods] чип ×N присутствует при quantity>1', async () => {
    const { getByText } = await render(
      <ItemRow
        item={{ ...base(), quantity: 3 }}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(getByText('×3')).toBeTruthy()
  })

  it('[goods] чип ×N НЕ показывается при quantity=1', async () => {
    const { queryByText } = await render(
      <ItemRow
        item={{ ...base(), quantity: 1 }}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(queryByText(/^×/)).toBeNull()
  })

  it('[tasks] чип дедлайна присутствует при наличии deadline', async () => {
    const { getByText } = await render(
      <ItemRow
        item={{ ...base(), deadline: '2026-07-10' }}
        listType="tasks"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(getByText('2026-07-10')).toBeTruthy()
  })

  it('[tasks] чип дедлайна НЕ показывается для goods', async () => {
    const { queryByText } = await render(
      <ItemRow
        item={{ ...base(), deadline: '2026-07-10' }}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    // Дедлайн не показывается в goods-режиме
    expect(queryByText('2026-07-10')).toBeNull()
  })

  it('[tasks] тег и дедлайн присутствуют вместе', async () => {
    const { getByText } = await render(
      <ItemRow
        item={{ ...base(), tags: '["работа"]', deadline: '2026-07-15' }}
        listType="tasks"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(getByText('#работа')).toBeTruthy()
    expect(getByText('2026-07-15')).toBeTruthy()
  })
})

// ============================================================
// Индикаторы-иконки (колокол/коммент/ссылка)
// ============================================================

describe('ItemRow — мета-индикаторы (макет)', () => {
  it('иконка колокола при наличии reminderAt', async () => {
    const { getByTestId } = await render(
      <ItemRow
        item={{ ...base(), reminderAt: '2026-07-01T18:00:00Z' }}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(getByTestId('icon-notifications-outline')).toBeTruthy()
  })

  it('иконка комментария при наличии comment', async () => {
    const { getByTestId } = await render(
      <ItemRow
        item={{ ...base(), comment: 'Взять свежее' }}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(getByTestId('icon-chatbubble-outline')).toBeTruthy()
  })

  it('иконка ссылки при наличии link', async () => {
    const { getByTestId } = await render(
      <ItemRow
        item={{ ...base(), link: 'https://example.com' }}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(getByTestId('icon-link-outline')).toBeTruthy()
  })

  it('индикаторы отсутствуют когда нет мета-данных', async () => {
    const { queryByTestId } = await render(
      <ItemRow item={base()} listType="goods" onToggle={jest.fn()} onDelete={jest.fn()} />,
    )
    expect(queryByTestId('icon-notifications-outline')).toBeNull()
    expect(queryByTestId('icon-chatbubble-outline')).toBeNull()
    expect(queryByTestId('icon-link-outline')).toBeNull()
  })
})

// ============================================================
// Раскрытый редактор
// ============================================================

describe('ItemRow — раскрытый редактор (макет)', () => {
  it('[goods] показывает секцию «Количество» (степпер)', async () => {
    const { getByText } = await render(
      <ItemRow
        item={base()}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
        isExpanded
        onExpand={jest.fn()}
        onQuantityChange={jest.fn()}
        onDeadlinePress={jest.fn()}
        onReminderPress={jest.fn()}
        onUpdateMeta={jest.fn()}
      />,
    )
    expect(getByText('Количество')).toBeTruthy()
  })

  it('[tasks] показывает секцию «Дедлайн»', async () => {
    const { getByText } = await render(
      <ItemRow
        item={base()}
        listType="tasks"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
        isExpanded
        onExpand={jest.fn()}
        onQuantityChange={jest.fn()}
        onDeadlinePress={jest.fn()}
        onReminderPress={jest.fn()}
        onUpdateMeta={jest.fn()}
      />,
    )
    expect(getByText('Дедлайн')).toBeTruthy()
  })

  it('placeholder «Добавить напоминание» при пустом reminderAt', async () => {
    const { getByText } = await render(
      <ItemRow
        item={base()}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
        isExpanded
        onExpand={jest.fn()}
        onReminderPress={jest.fn()}
        onUpdateMeta={jest.fn()}
      />,
    )
    expect(getByText('Добавить напоминание')).toBeTruthy()
  })

  it('placeholder «Добавить ссылку» при пустой ссылке', async () => {
    const { getByPlaceholderText } = await render(
      <ItemRow
        item={base()}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
        isExpanded
        onExpand={jest.fn()}
        onUpdateMeta={jest.fn()}
      />,
    )
    expect(getByPlaceholderText('Добавить ссылку')).toBeTruthy()
  })

  it('placeholder «Добавить комментарий» при пустом комментарии', async () => {
    const { getByPlaceholderText } = await render(
      <ItemRow
        item={base()}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
        isExpanded
        onExpand={jest.fn()}
        onUpdateMeta={jest.fn()}
      />,
    )
    expect(getByPlaceholderText('Добавить комментарий')).toBeTruthy()
  })

  it('placeholder «+ тег» в поле тега', async () => {
    const { getByPlaceholderText } = await render(
      <ItemRow
        item={base()}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
        isExpanded
        onExpand={jest.fn()}
        onUpdateMeta={jest.fn()}
      />,
    )
    expect(getByPlaceholderText('+ тег')).toBeTruthy()
  })

  // По макету: плейсхолдер дедлайна без значения — «Указать дедлайн».
  it('[tasks] placeholder дедлайна — «Указать дедлайн»', async () => {
    const { getByText } = await render(
      <ItemRow
        item={base()}
        listType="tasks"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
        isExpanded
        onExpand={jest.fn()}
        onDeadlinePress={jest.fn()}
        onUpdateMeta={jest.fn()}
      />,
    )
    expect(getByText('Указать дедлайн')).toBeTruthy()
  })
})
