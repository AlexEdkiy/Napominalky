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
describe('ItemRow — компактная строка (облегчённая форма, без раскрытия)', () => {
  it('рендерит имя пункта без падений', async () => {
    const { getByText } = await render(
      <ItemRow item={baseItem()} listType="goods" onToggle={jest.fn()} />,
    )
    expect(getByText('Тестовый пункт')).toBeTruthy()
  })

  it('шеврона «Развернуть» больше НЕТ (инлайн-раскрытие удалено)', async () => {
    const { queryByLabelText } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        onOpenAttributes={jest.fn()}
      />,
    )
    expect(queryByLabelText('Развернуть')).toBeNull()
  })

  it('рендерит иконку «Допатрибуты» если задан onOpenAttributes', async () => {
    const { getByLabelText } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        onOpenAttributes={jest.fn()}
      />,
    )
    expect(getByLabelText('Допатрибуты')).toBeTruthy()
  })

  it('тап по иконке «Допатрибуты» вызывает onOpenAttributes с uuid', async () => {
    const onOpenAttributes = jest.fn()
    const { getByLabelText } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        onOpenAttributes={onOpenAttributes}
      />,
    )
    fireEvent.press(getByLabelText('Допатрибуты'))
    expect(onOpenAttributes).toHaveBeenCalledWith('item-1')
  })

  it('тап по названию тоже открывает шторку допатрибутов', async () => {
    const onOpenAttributes = jest.fn()
    const { getByLabelText } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        onOpenAttributes={onOpenAttributes}
      />,
    )
    fireEvent.press(getByLabelText('Тестовый пункт'))
    expect(onOpenAttributes).toHaveBeenCalledWith('item-1')
  })

  it('без атрибутов точки-индикатора нет', async () => {
    const { queryByTestId } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        onOpenAttributes={jest.fn()}
      />,
    )
    expect(queryByTestId('item-attributes-dot')).toBeNull()
  })

  it('жёлтая точка-индикатор при заданном дедлайне', async () => {
    const item = { ...baseItem(), deadline: '2026-07-05' }
    const { getByTestId } = await render(
      <ItemRow item={item} listType="tasks" onToggle={jest.fn()} onOpenAttributes={jest.fn()} />,
    )
    expect(getByTestId('item-attributes-dot')).toBeTruthy()
  })

  it('точка-индикатор при заданном напоминании', async () => {
    const { getByTestId } = await render(
      <ItemRow
        item={{ ...baseItem(), reminderAt: '2026-07-01T18:00:00Z' }}
        listType="goods"
        onToggle={jest.fn()}
        onOpenAttributes={jest.fn()}
      />,
    )
    expect(getByTestId('item-attributes-dot')).toBeTruthy()
  })

  it('точка-индикатор при заданной ссылке', async () => {
    const { getByTestId } = await render(
      <ItemRow
        item={{ ...baseItem(), link: 'https://example.com' }}
        listType="goods"
        onToggle={jest.fn()}
        onOpenAttributes={jest.fn()}
      />,
    )
    expect(getByTestId('item-attributes-dot')).toBeTruthy()
  })

  it('точка-индикатор при заданном теге', async () => {
    const { getByTestId } = await render(
      <ItemRow
        item={{ ...baseItem(), tags: '["дом"]' }}
        listType="goods"
        onToggle={jest.fn()}
        onOpenAttributes={jest.fn()}
      />,
    )
    expect(getByTestId('item-attributes-dot')).toBeTruthy()
  })

  it('рендерит чипы всех тегов если tags задан', async () => {
    const item = { ...baseItem(), tags: '["обувь","одежда"]' }
    const { getByText } = await render(
      <ItemRow item={item} listType="goods" onToggle={jest.fn()} />,
    )
    expect(getByText('#обувь')).toBeTruthy()
    expect(getByText('#одежда')).toBeTruthy()
  })

  it('рендерит чип ×N для товара с quantity > 1', async () => {
    const item = { ...baseItem(), quantity: 3 }
    const { getByText } = await render(
      <ItemRow item={item} listType="goods" onToggle={jest.fn()} />,
    )
    expect(getByText('×3')).toBeTruthy()
  })

  it('рендерит чип дедлайна для задачи (локализованная дата, не raw ISO)', async () => {
    const item = { ...baseItem(), deadline: '2026-07-05' }
    const { getByText, queryByText } = await render(
      <ItemRow item={item} listType="tasks" onToggle={jest.fn()} />,
    )
    // DEF-05: отображается «5 июл», а не raw «2026-07-05»
    expect(getByText('5 июл')).toBeTruthy()
    expect(queryByText('2026-07-05')).toBeNull()
  })

  it('не рендерит чип тега если tags=null', async () => {
    const { queryByText } = await render(
      <ItemRow item={baseItem()} listType="goods" onToggle={jest.fn()} />,
    )
    expect(queryByText(/^#/)).toBeNull()
  })
})

describe('ItemRow — вход в комментарии (один тап)', () => {
  it('commentsCount > 0 → жёлтый чип со счётчиком в мета-строке', async () => {
    const { getByTestId, getByLabelText, getByText } = await render(
      <ItemRow
        item={baseItem()}
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
    expect(merged.backgroundColor).toBe('#FEF3C7') // amberBg — жёлтый чип
    expect(getByLabelText('Комментарии: 3')).toBeTruthy()
    expect(getByText('3')).toBeTruthy()
  })

  it('тап по жёлтому чипу открывает тред (onOpenComments) в один тап', async () => {
    const onOpenComments = jest.fn()
    const { getByLabelText } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        commentsCount={2}
        onOpenComments={onOpenComments}
      />,
    )
    fireEvent.press(getByLabelText('Комментарии: 2'))
    expect(onOpenComments).toHaveBeenCalledWith('item-1')
  })

  it('commentsCount = 0 → серая иконка комментария (контрол), чипа нет', async () => {
    const { getByLabelText, queryByTestId } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        commentsCount={0}
        onOpenComments={jest.fn()}
      />,
    )
    expect(getByLabelText('Комментарии')).toBeTruthy()
    expect(queryByTestId('item-comments-chip')).toBeNull()
  })

  it('тап по серой иконке тоже открывает тред в один тап', async () => {
    const onOpenComments = jest.fn()
    const { getByLabelText } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        commentsCount={0}
        onOpenComments={onOpenComments}
      />,
    )
    fireEvent.press(getByLabelText('Комментарии'))
    expect(onOpenComments).toHaveBeenCalledWith('item-1')
  })

  it('при commentsCount > 0 серой иконки-дубля нет (вход один — чип)', async () => {
    const { queryByLabelText } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        commentsCount={1}
        onOpenComments={jest.fn()}
      />,
    )
    expect(queryByLabelText('Комментарии')).toBeNull()
  })
})

describe('ItemRow — статусы пунктов задач (только tasks)', () => {
  it('показывает бейдж статуса для пункта tasks-списка', async () => {
    const item = { ...baseItem(), status: 'in_progress' as const }
    const { getByTestId, getByText } = await render(
      <ItemRow item={item} listType="tasks" onToggle={jest.fn()} />,
    )
    expect(getByTestId('item-status-badge')).toBeTruthy()
    expect(getByText('В работе')).toBeTruthy()
  })

  it('НЕ показывает бейдж статуса для goods-списка', async () => {
    const { queryByTestId } = await render(
      <ItemRow item={baseItem()} listType="goods" onToggle={jest.fn()} />,
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
        onOpenStatus={onOpenStatus}
      />,
    )
    fireEvent.press(getByLabelText('Статус: Отложена'))
    expect(onOpenStatus).toHaveBeenCalledWith('item-1')
  })

  it('зачёркивание пункта задачи — по status=done (приоритет над isChecked)', async () => {
    const item = { ...baseItem(), status: 'done' as const, isChecked: true }
    const { getByLabelText } = await render(
      <ItemRow item={item} listType="tasks" onToggle={jest.fn()} />,
    )
    const checkbox = getByLabelText('Отметить Тестовый пункт')
    expect(checkbox.props.accessibilityState.checked).toBe(true)
  })

  it('пункт задачи со status=in_progress НЕ зачёркнут (checked=false)', async () => {
    const item = { ...baseItem(), status: 'in_progress' as const }
    const { getByLabelText } = await render(
      <ItemRow item={item} listType="tasks" onToggle={jest.fn()} />,
    )
    const checkbox = getByLabelText('Отметить Тестовый пункт')
    expect(checkbox.props.accessibilityState.checked).toBe(false)
  })
})

describe('ItemRow — свайп влево: удаление с подтверждением в строке (Swipeable)', () => {
  it('с onSwipeDelete рендерится правое действие «Удалить» (renderRightActions)', async () => {
    const { getByTestId, getByLabelText } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        onSwipeDelete={jest.fn()}
      />,
    )
    expect(getByTestId('item-swipe-delete')).toBeTruthy()
    expect(getByLabelText('Удалить Тестовый пункт')).toBeTruthy()
  })

  it('без onSwipeDelete свайп-действия нет', async () => {
    const { queryByTestId } = await render(
      <ItemRow item={baseItem()} listType="goods" onToggle={jest.fn()} />,
    )
    expect(queryByTestId('item-swipe-delete')).toBeNull()
  })

  it('свайп сам по себе НЕ удаляет: без тапа по кнопке onSwipeDelete не вызван', async () => {
    const onSwipeDelete = jest.fn()
    await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        onSwipeDelete={onSwipeDelete}
      />,
    )
    expect(onSwipeDelete).not.toHaveBeenCalled()
  })

  it('тап по «Удалить» (= подтверждение в строке) вызывает onSwipeDelete с uuid', async () => {
    const onSwipeDelete = jest.fn()
    const { getByTestId } = await render(
      <ItemRow
        item={baseItem()}
        listType="goods"
        onToggle={jest.fn()}
        onSwipeDelete={onSwipeDelete}
      />,
    )
    fireEvent.press(getByTestId('item-swipe-delete'))
    expect(onSwipeDelete).toHaveBeenCalledWith('item-1')
  })
})

describe('ItemRow — тапы по контролам не конфликтуют с открытием шторки', () => {
  it('тап по бейджу статуса вызывает onOpenStatus и НЕ вызывает onOpenAttributes', async () => {
    const onOpenStatus = jest.fn()
    const onOpenAttributes = jest.fn()
    const item = { ...baseItem(), status: 'new' as const }
    const { getByLabelText } = await render(
      <ItemRow
        item={item}
        listType="tasks"
        onToggle={jest.fn()}
        onOpenAttributes={onOpenAttributes}
        onOpenStatus={onOpenStatus}
      />,
    )
    fireEvent.press(getByLabelText('Статус: Новая'))
    expect(onOpenStatus).toHaveBeenCalledWith('item-1')
    expect(onOpenAttributes).not.toHaveBeenCalled()
  })

  it('бейдж статуса НЕ вложен в Pressable названия (нет предка-обработчика)', async () => {
    const { getByTestId, getByLabelText } = await render(
      <ItemRow
        item={baseItem()}
        listType="tasks"
        onToggle={jest.fn()}
        onOpenAttributes={jest.fn()}
        onOpenStatus={jest.fn()}
      />,
    )
    const namePressable = getByLabelText('Тестовый пункт')
    // Поднимаемся от бейджа к корню: Pressable названия не должен встретиться.
    let node: { parent: unknown } | null = getByTestId('item-status-badge')
    let nestedInName = false
    while (node !== null) {
      if (node === namePressable) nestedInName = true
      node = (node as { parent: { parent: unknown } | null }).parent
    }
    expect(nestedInName).toBe(false)
  })
})
