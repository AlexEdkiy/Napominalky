/**
 * [UITEST] UI-fidelity тесты — дефекты, выявленные аудитом соответствия дизайн-макету.
 * Каждый тест отражает ожидание по макету; тесты ПАДАЮТ при наличии дефекта.
 *
 * Дефекты:
 *  DEF-01 (major)   — Кнопка-«×» (close-circle-outline) на каждой строке пункта — в макете НЕТ
 *  DEF-02 (major)   — Лейблы «Количество»/«Дедлайн» uppercase — в макете компактные строки без uppercase
 *                     (после редизайна проверяется в шторке «Допатрибуты»)
 *  DEF-05 (minor)   — Чип дедлайна в строке пункта (tasks): показывает raw "YYYY-MM-DD", а не локализованную дату
 */

jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('@/hooks/useDebouncedCallback', () => ({
  useDebouncedCallback: (fn: unknown) => fn,
}))

import React from 'react'
import { render } from '@testing-library/react-native'

import AttributesSheet from '../AttributesSheet'
import ItemRow from '../ItemRow'
import { EMPTY_ATTRIBUTE_VALUES } from '@/utils/itemAttributes'
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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

jest.mock('@react-native-community/datetimepicker', () => () => null)

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
    buttonLabel: { fontSize: 16, fontWeight: '700' },
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
  status: 'new',
  position: 0,
  notificationId: null,
  serverRevision: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
})

const hasUppercase = (el: { props: Record<string, unknown> }): boolean => {
  const styleArr = Array.isArray(el.props.style) ? el.props.style : [el.props.style]
  return styleArr.some(
    (s: Record<string, unknown> | undefined) => s?.textTransform === 'uppercase',
  )
}

// ============================================================
// DEF-01: Кнопка-«×» на строке пункта — НЕ должна быть в макете
// ============================================================

describe('[DEF-01] ItemRow — лишняя кнопка «×» на строке (major)', () => {
  /**
   * По макету «Красной кнопки «×»/удаления на строке НЕТ».
   * Удаление: свайп влево (MOB-59) либо футер шторки «Допатрибуты».
   */
  it('[ДЕФЕКТ DEF-01] на строке НЕТ кнопки удаления (нет иконки close-circle-outline)', async () => {
    const { queryByTestId, queryByLabelText } = await render(
      <ItemRow item={base()} listType="goods" onToggle={jest.fn()} />,
    )
    // Макет: кнопки удаления на строке нет
    expect(queryByTestId('icon-close-circle-outline')).toBeNull()
    expect(queryByLabelText('Удалить Молоко')).toBeNull()
  })

  it('[ДЕФЕКТ DEF-01] в tasks-режиме на строке тоже нет кнопки удаления', async () => {
    const { queryByTestId } = await render(
      <ItemRow item={base()} listType="tasks" onToggle={jest.fn()} />,
    )
    expect(queryByTestId('icon-close-circle-outline')).toBeNull()
  })
})

// ============================================================
// DEF-02: Лейблы в шторке «Допатрибуты» — не uppercase
// ============================================================

describe('[DEF-02] AttributesSheet — лейблы без textTransform=uppercase (major)', () => {
  /**
   * По макету — «компактные строки иконка + значение», без uppercase-лейблов.
   * После редизайна редактор атрибутов живёт в шторке «Допатрибуты».
   */
  it('[ДЕФЕКТ DEF-02][goods] лейбл «Количество» — нет textTransform uppercase в стиле', async () => {
    const { getByText } = await render(
      <AttributesSheet
        visible
        values={EMPTY_ATTRIBUTE_VALUES}
        accentColor="#0EA5A0"
        accentBg="#DDF1ED"
        quantity={1}
        onQuantityChange={jest.fn()}
        onChangeAttribute={jest.fn()}
        onClose={jest.fn()}
      />,
    )
    expect(hasUppercase(getByText('Количество'))).toBe(false)
  })

  it('[ДЕФЕКТ DEF-02][tasks] лейбл «Дедлайн» — нет textTransform uppercase в стиле', async () => {
    const { getByText } = await render(
      <AttributesSheet
        visible
        values={EMPTY_ATTRIBUTE_VALUES}
        accentColor="#F59E0B"
        accentBg="#FBEFD6"
        onChangeAttribute={jest.fn()}
        onClose={jest.fn()}
      />,
    )
    expect(hasUppercase(getByText('Дедлайн'))).toBe(false)
  })
})

// ============================================================
// DEF-05: Чип дедлайна в строке пункта — локализованная дата, не raw ISO
// ============================================================

describe('[DEF-05] ItemRow — чип дедлайна: локализованная дата, не YYYY-MM-DD (minor)', () => {
  /**
   * По макету: в чипе дедлайна отображается человекочитаемая дата («10 июл»),
   * а не raw YYYY-MM-DD строка из базы данных.
   */
  it('[ДЕФЕКТ DEF-05][tasks] чип дедлайна НЕ показывает raw YYYY-MM-DD формат', async () => {
    const deadline = '2026-07-10'
    const { queryByText } = await render(
      <ItemRow item={{ ...base(), deadline }} listType="tasks" onToggle={jest.fn()} />,
    )
    // Макет: не raw ISO-дата, а человекочитаемая. «2026-07-10» не должен отображаться как есть.
    expect(queryByText('2026-07-10')).toBeNull()
  })
})
