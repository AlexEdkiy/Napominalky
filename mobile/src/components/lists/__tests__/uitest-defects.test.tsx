/**
 * [UITEST] UI-fidelity тесты — дефекты, выявленные аудитом соответствия дизайн-макету.
 * Каждый тест отражает ожидание по макету; тесты ПАДАЮТ при наличии дефекта.
 *
 * Дефекты:
 *  DEF-01 (major)   — Кнопка-«×» (close-circle-outline) на каждой строке пункта — в макете НЕТ
 *  DEF-02 (major)   — ExpandedEditor: лейблы «Количество»/«Дедлайн» uppercase — в макете компактные строки без uppercase
 *  DEF-03 (blocker) — Ряд тегов уровня СПИСКА (под полем добавления) — полностью отсутствует
 *  DEF-04 (minor)   — FilterTabs (lists.tsx): активная вкладка подчёркнута только accent, а не цветом таба (goods=accent, tasks=amber)
 *  DEF-05 (minor)   — Чип дедлайна в строке пункта (tasks): показывает raw "YYYY-MM-DD", а не локализованную дату
 *  DEF-06 (structural/nav) — lists/_layout.tsx: Stack без headerShown=false → потенциальная двойная шапка над [uuid].tsx
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

jest.mock('@/theme/typography', () => ({
  typography: {
    body: { fontSize: 15 },
    bodyMd: { fontSize: 16 },
    bodySm: { fontSize: 13 },
    sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  },
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
// DEF-01: Кнопка-«×» на строке пункта — НЕ должна быть в макете
// ============================================================

describe('[DEF-01] ItemRow — лишняя кнопка «×» на строке (major)', () => {
  /**
   * По макету «Красной кнопки «×»/удаления на строке НЕТ».
   * Реализация: Pressable с accessibilityLabel=`Удалить ${item.name}` + icon close-circle-outline.
   * Этот тест ПАДАЕТ пока DEF-01 не исправлен.
   */
  it('[ДЕФЕКТ DEF-01] на свёрнутой строке НЕТ кнопки удаления (нет иконки close-circle-outline)', async () => {
    const { queryByTestId, queryByLabelText } = await render(
      <ItemRow
        item={base()}
        listType="goods"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    // Макет: кнопки удаления на строке нет
    expect(queryByTestId('icon-close-circle-outline')).toBeNull()
    expect(queryByLabelText('Удалить Молоко')).toBeNull()
  })

  it('[ДЕФЕКТ DEF-01] в tasks-режиме на свёрнутой строке тоже нет кнопки удаления', async () => {
    const { queryByTestId } = await render(
      <ItemRow
        item={base()}
        listType="tasks"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    expect(queryByTestId('icon-close-circle-outline')).toBeNull()
  })
})

// ============================================================
// DEF-02: Лейблы в ExpandedEditor — не uppercase
// ============================================================

describe('[DEF-02] ExpandedEditor — лейблы без textTransform=uppercase (major)', () => {
  /**
   * По макету раскрытие — «компактные строки иконка + значение», без uppercase-лейблов.
   * Реализация: expandLabel имеет textTransform: 'uppercase', что не соответствует макету.
   * Этот тест проверяет что лейбл «Количество» НЕ является uppercase.
   */
  it('[ДЕФЕКТ DEF-02][goods] лейбл «Количество» — нет textTransform uppercase в стиле', async () => {
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
    const labelEl = getByText('Количество')
    const styleArr = Array.isArray(labelEl.props.style) ? labelEl.props.style : [labelEl.props.style]
    const hasUppercase = styleArr.some(
      (s: Record<string, unknown> | undefined) => s?.textTransform === 'uppercase',
    )
    // По макету: лейбл без uppercase (компактная строка, не форма с section label)
    expect(hasUppercase).toBe(false)
  })

  it('[ДЕФЕКТ DEF-02][tasks] лейбл «Дедлайн» — нет textTransform uppercase в стиле', async () => {
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
    const labelEl = getByText('Дедлайн')
    const styleArr = Array.isArray(labelEl.props.style) ? labelEl.props.style : [labelEl.props.style]
    const hasUppercase = styleArr.some(
      (s: Record<string, unknown> | undefined) => s?.textTransform === 'uppercase',
    )
    expect(hasUppercase).toBe(false)
  })
})

// ============================================================
// DEF-05: Чип дедлайна в строке пункта — локализованная дата, не raw ISO
// ============================================================

describe('[DEF-05] ItemRow — чип дедлайна: локализованная дата, не YYYY-MM-DD (minor)', () => {
  /**
   * По макету: в чипе дедлайна отображается человекочитаемая дата («10 июл» или «10.07»),
   * а не raw YYYY-MM-DD строка из базы данных.
   * Текущая реализация: {item.deadline} — показывает «2026-07-10» как есть.
   */
  it('[ДЕФЕКТ DEF-05][tasks] чип дедлайна НЕ показывает raw YYYY-MM-DD формат', async () => {
    const deadline = '2026-07-10'
    const { queryByText } = await render(
      <ItemRow
        item={{ ...base(), deadline }}
        listType="tasks"
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />,
    )
    // Макет: не raw ISO-дата, а человекочитаемая. «2026-07-10» не должен отображаться как есть.
    expect(queryByText('2026-07-10')).toBeNull()
  })
})
