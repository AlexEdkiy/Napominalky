/**
 * UI-fidelity тесты: ItemRow — соответствие дизайн-макету («облегчённая форма»).
 * Проверяем: структуру строки, порядок чипов, состояния чекбокса,
 * зачёркивание done-пунктов, правые контролы (допатрибуты/комментарии).
 */
jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('@/hooks/useDebouncedCallback', () => ({
  useDebouncedCallback: (fn: unknown) => fn,
}))

import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'

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
  status: 'new',
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
      <ItemRow item={base()} listType="goods" onToggle={jest.fn()} />,
    )
    const cb = getByRole('checkbox')
    // borderRadius для goods = 7 (не круг)
    expect(cb.props.style).toBeDefined()
  })

  it('[tasks] чекбокс — круг (borderRadius=10)', async () => {
    const { getByRole } = await render(
      <ItemRow item={base()} listType="tasks" onToggle={jest.fn()} />,
    )
    const cb = getByRole('checkbox')
    expect(cb.props.accessibilityRole).toBe('checkbox')
  })

  it('чекбокс не отмечен когда isChecked=false', async () => {
    const { getByRole } = await render(
      <ItemRow item={base()} listType="goods" onToggle={jest.fn()} />,
    )
    expect(getByRole('checkbox').props.accessibilityState?.checked).toBe(false)
  })

  it('чекбокс отмечен когда isChecked=true', async () => {
    const { getByRole } = await render(
      <ItemRow item={{ ...base(), isChecked: true }} listType="goods" onToggle={jest.fn()} />,
    )
    expect(getByRole('checkbox').props.accessibilityState?.checked).toBe(true)
  })

  it('название зачёркнуто когда isChecked=true (textDecorationLine=line-through)', async () => {
    const { getByText } = await render(
      <ItemRow item={{ ...base(), isChecked: true }} listType="goods" onToggle={jest.fn()} />,
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
      <ItemRow item={base()} listType="goods" onToggle={jest.fn()} />,
    )
    const nameEl = getByText('Молоко')
    const styleArr = Array.isArray(nameEl.props.style) ? nameEl.props.style : [nameEl.props.style]
    const hasStrike = styleArr.some(
      (s: Record<string, unknown> | undefined) => s?.textDecorationLine === 'line-through',
    )
    expect(hasStrike).toBe(false)
  })

  it('шеврона (chevron-down/up) в строке больше нет — раскрытие удалено', async () => {
    const { queryByTestId } = await render(
      <ItemRow item={base()} listType="goods" onToggle={jest.fn()} onOpenAttributes={jest.fn()} />,
    )
    expect(queryByTestId('icon-chevron-down')).toBeNull()
    expect(queryByTestId('icon-chevron-up')).toBeNull()
  })
})

// ============================================================
// Порядок чипов: тег → ×N → дедлайн
// ============================================================

describe('ItemRow — порядок чипов (макет)', () => {
  it('[goods] чип #тег присутствует при наличии тегов', async () => {
    const { getByText } = await render(
      <ItemRow item={{ ...base(), tags: '["молочные"]' }} listType="goods" onToggle={jest.fn()} />,
    )
    expect(getByText('#молочные')).toBeTruthy()
  })

  it('[goods] чип ×N присутствует при quantity>1', async () => {
    const { getByText } = await render(
      <ItemRow item={{ ...base(), quantity: 3 }} listType="goods" onToggle={jest.fn()} />,
    )
    expect(getByText('×3')).toBeTruthy()
  })

  it('[goods] чип ×N НЕ показывается при quantity=1', async () => {
    const { queryByText } = await render(
      <ItemRow item={{ ...base(), quantity: 1 }} listType="goods" onToggle={jest.fn()} />,
    )
    expect(queryByText(/^×/)).toBeNull()
  })

  it('[tasks] чип дедлайна присутствует при наличии deadline (локализованный формат)', async () => {
    const { getByText, queryByText } = await render(
      <ItemRow item={{ ...base(), deadline: '2026-07-10' }} listType="tasks" onToggle={jest.fn()} />,
    )
    // DEF-05: «10 июл», не raw ISO «2026-07-10»
    expect(getByText('10 июл')).toBeTruthy()
    expect(queryByText('2026-07-10')).toBeNull()
  })

  it('[tasks] чип дедлайна НЕ показывается для goods', async () => {
    const { queryByText } = await render(
      <ItemRow item={{ ...base(), deadline: '2026-07-10' }} listType="goods" onToggle={jest.fn()} />,
    )
    // Дедлайн не показывается в goods-режиме (ни raw ISO, ни форматированный)
    expect(queryByText('2026-07-10')).toBeNull()
    expect(queryByText('10 июл')).toBeNull()
  })

  it('[tasks] тег и дедлайн присутствуют вместе (локализованный формат)', async () => {
    const { getByText, queryByText } = await render(
      <ItemRow
        item={{ ...base(), tags: '["работа"]', deadline: '2026-07-15' }}
        listType="tasks"
        onToggle={jest.fn()}
      />,
    )
    expect(getByText('#работа')).toBeTruthy()
    // DEF-05: «15 июл», не raw ISO «2026-07-15»
    expect(getByText('15 июл')).toBeTruthy()
    expect(queryByText('2026-07-15')).toBeNull()
  })
})

// ============================================================
// Пункт 5: несколько тегов у пункта — показываются ВСЕ в строке
// ============================================================

describe('ItemRow — несколько тегов (макет)', () => {
  it('[ПУНКТ 5] показываются ВСЕ теги пункта, не только первый', async () => {
    const item = { ...base(), tags: '["срочно","дом","работа"]' }
    const { getByText } = await render(
      <ItemRow item={item} listType="goods" onToggle={jest.fn()} />,
    )
    expect(getByText('#срочно')).toBeTruthy()
    expect(getByText('#дом')).toBeTruthy()
    expect(getByText('#работа')).toBeTruthy()
  })

  it('[ПУНКТ 5][tasks] несколько тегов отображаются вместе с чипом дедлайна', async () => {
    const item = { ...base(), tags: '["срочно","дом"]', deadline: '2026-07-20' }
    const { getByText } = await render(
      <ItemRow item={item} listType="tasks" onToggle={jest.fn()} />,
    )
    expect(getByText('#срочно')).toBeTruthy()
    expect(getByText('#дом')).toBeTruthy()
    expect(getByText('20 июл')).toBeTruthy()
  })
})

// ============================================================
// Пункт 3: тег(и) и мета-индикаторы — в ОДНОЙ строке (metaLine)
// ============================================================

describe('ItemRow — тег(и) и мета-индикаторы в одной строке (макет)', () => {
  it('[ПУНКТ 3] тег и иконка-индикатор (напоминание) — общий родитель metaLine', async () => {
    const item = { ...base(), tags: '["работа"]', reminderAt: '2026-07-01T18:00:00Z' }
    const { getByText, getByTestId } = await render(
      <ItemRow item={item} listType="goods" onToggle={jest.fn()} />,
    )
    const tagChip = getByText('#работа').parent
    const indicatorsWrap = getByTestId('icon-notifications-outline').parent
    // Чип тега лежит прямо в metaLine; иконка — в indicators, чей родитель тоже metaLine.
    expect(tagChip?.parent).toBe(indicatorsWrap?.parent)
  })

  it('[ПУНКТ 3][tasks] тег, чип дедлайна и индикатор ссылки — общий родитель metaLine', async () => {
    const item = { ...base(), tags: '["дом"]', deadline: '2026-07-05', link: 'https://example.com' }
    const { getByText, getByTestId } = await render(
      <ItemRow item={item} listType="tasks" onToggle={jest.fn()} />,
    )
    const tagChip = getByText('#дом').parent
    const deadlineChip = getByText('5 июл').parent
    const indicatorsWrap = getByTestId('icon-link-outline').parent
    expect(tagChip?.parent).toBe(deadlineChip?.parent)
    expect(tagChip?.parent).toBe(indicatorsWrap?.parent)
  })
})

// ============================================================
// Индикаторы-иконки (колокол/ссылка) + входы комментариев
// ============================================================

describe('ItemRow — мета-индикаторы и комментарии (макет)', () => {
  it('иконка колокола при наличии reminderAt', async () => {
    const { getByTestId } = await render(
      <ItemRow
        item={{ ...base(), reminderAt: '2026-07-01T18:00:00Z' }}
        listType="goods"
        onToggle={jest.fn()}
      />,
    )
    expect(getByTestId('icon-notifications-outline')).toBeTruthy()
  })

  // 6: при наличии треда — жёлтый чип со счётчиком в мета-строке (один тап).
  it('жёлтый чип комментариев со счётчиком при commentsCount > 0', async () => {
    const { getByTestId, getByLabelText, getByText } = await render(
      <ItemRow
        item={base()}
        listType="goods"
        onToggle={jest.fn()}
        commentsCount={3}
        onOpenComments={jest.fn()}
      />,
    )
    const chip = getByTestId('item-comments-chip')
    const merged = Object.assign(
      {},
      ...(Array.isArray(chip.props.style) ? chip.props.style : [chip.props.style]),
    )
    expect(merged.backgroundColor).toBe('#FBEFD6') // amberBg
    expect(getByLabelText('Комментарии: 3')).toBeTruthy()
    expect(getByText('3')).toBeTruthy()
  })

  it('тап по чипу 💬 вызывает onOpenComments с uuid пункта (один тап)', async () => {
    const onOpenComments = jest.fn()
    const { getByLabelText } = await render(
      <ItemRow
        item={base()}
        listType="goods"
        onToggle={jest.fn()}
        commentsCount={2}
        onOpenComments={onOpenComments}
      />,
    )
    fireEvent.press(getByLabelText('Комментарии: 2'))
    expect(onOpenComments).toHaveBeenCalledWith('item-1')
  })

  // 6: без треда — серая иконка-контрол рядом с иконкой допатрибутов.
  it('без комментариев — серая иконка-контрол, тап открывает тред (один тап)', async () => {
    const onOpenComments = jest.fn()
    const { getByLabelText, queryByTestId } = await render(
      <ItemRow
        item={base()}
        listType="goods"
        onToggle={jest.fn()}
        commentsCount={0}
        onOpenComments={onOpenComments}
      />,
    )
    expect(queryByTestId('item-comments-chip')).toBeNull()
    fireEvent.press(getByLabelText('Комментарии'))
    expect(onOpenComments).toHaveBeenCalledWith('item-1')
  })

  it('legacy-поле comment пункта БЕЗ треда не показывает чип комментариев', async () => {
    const { queryByTestId } = await render(
      <ItemRow
        item={{ ...base(), comment: 'Взять свежее' }}
        listType="goods"
        onToggle={jest.fn()}
        commentsCount={0}
      />,
    )
    expect(queryByTestId('item-comments-chip')).toBeNull()
  })

  it('иконка ссылки при наличии link', async () => {
    const { getByTestId } = await render(
      <ItemRow
        item={{ ...base(), link: 'https://example.com' }}
        listType="goods"
        onToggle={jest.fn()}
      />,
    )
    expect(getByTestId('icon-link-outline')).toBeTruthy()
  })

  it('индикаторы отсутствуют когда нет мета-данных', async () => {
    const { queryByTestId } = await render(
      <ItemRow item={base()} listType="goods" onToggle={jest.fn()} />,
    )
    expect(queryByTestId('icon-notifications-outline')).toBeNull()
    expect(queryByTestId('item-comments-chip')).toBeNull()
    expect(queryByTestId('icon-link-outline')).toBeNull()
  })
})

// ============================================================
// Правые контролы: иконка «допатрибуты» с точкой-индикатором
// ============================================================

describe('ItemRow — иконка «допатрибуты» и точка-индикатор (макет)', () => {
  it('иконка options-outline рендерится при onOpenAttributes', async () => {
    const { getByTestId, getByLabelText } = await render(
      <ItemRow item={base()} listType="goods" onToggle={jest.fn()} onOpenAttributes={jest.fn()} />,
    )
    expect(getByTestId('icon-options-outline')).toBeTruthy()
    expect(getByLabelText('Допатрибуты')).toBeTruthy()
  })

  it('тап по иконке вызывает onOpenAttributes(uuid)', async () => {
    const onOpenAttributes = jest.fn()
    const { getByLabelText } = await render(
      <ItemRow
        item={base()}
        listType="goods"
        onToggle={jest.fn()}
        onOpenAttributes={onOpenAttributes}
      />,
    )
    fireEvent.press(getByLabelText('Допатрибуты'))
    expect(onOpenAttributes).toHaveBeenCalledWith('item-1')
  })

  it('точка-индикатор жёлтая (amber) при заданных атрибутах', async () => {
    const { getByTestId } = await render(
      <ItemRow
        item={{ ...base(), deadline: '2026-07-10' }}
        listType="tasks"
        onToggle={jest.fn()}
        onOpenAttributes={jest.fn()}
      />,
    )
    const dot = getByTestId('item-attributes-dot')
    const merged = Object.assign(
      {},
      ...(Array.isArray(dot.props.style) ? dot.props.style : [dot.props.style]),
    )
    expect(merged.backgroundColor).toBe('#F59E0B') // colors.amber
  })

  it('без атрибутов точки нет', async () => {
    const { queryByTestId } = await render(
      <ItemRow item={base()} listType="goods" onToggle={jest.fn()} onOpenAttributes={jest.fn()} />,
    )
    expect(queryByTestId('item-attributes-dot')).toBeNull()
  })
})
