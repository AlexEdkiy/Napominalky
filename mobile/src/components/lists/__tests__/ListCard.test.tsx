// Mock нативного expo-sqlite перед любыми импортами
jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { render } from '@testing-library/react-native'

import ListCard from '../ListCard'
import type { ShoppingList } from '@/db/repositories/shoppingListsRepo'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

jest.mock('@/components/ui/IconSquare', () => {
  const { View, Text } = require('react-native')
  return ({ icon }: { icon: string }) => (
    <View testID="icon-square">
      <Text>{icon}</Text>
    </View>
  )
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

const makeList = (overrides: Partial<ShoppingList> = {}): ShoppingList => ({
  uuid: 'list-1',
  userId: null,
  title: 'Продукты',
  type: 'goods',
  serverRevision: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
  itemsCount: 5,
  checkedItemsCount: 2,
  ...overrides,
})

describe('ListCard — соответствие макету (Экран «Списки»)', () => {
  describe('тип goods', () => {
    it('отображает название списка', async () => {
      const { getByText } = await render(
        <ListCard list={makeList({ title: 'Продукты на неделю' })} onPress={jest.fn()} />,
      )
      expect(getByText('Продукты на неделю')).toBeTruthy()
    })

    it('отображает счётчик «N/M куплено»', async () => {
      const { getByText } = await render(
        <ListCard list={makeList({ checkedItemsCount: 3, itemsCount: 7 })} onPress={jest.fn()} />,
      )
      expect(getByText('3/7 куплено')).toBeTruthy()
    })

    it('показывает иконку-корзину (bag-handle) для goods', async () => {
      const { getByText } = await render(
        <ListCard list={makeList({ type: 'goods' })} onPress={jest.fn()} />,
      )
      expect(getByText('bag-handle')).toBeTruthy()
    })

    it('показывает chevron-forward справа', async () => {
      const { getByText } = await render(
        <ListCard list={makeList()} onPress={jest.fn()} />,
      )
      expect(getByText('chevron-forward')).toBeTruthy()
    })

    it('НЕ показывает чип дедлайна когда nearestDeadline=null (goods)', async () => {
      const { queryByTestId } = await render(
        <ListCard list={makeList({ type: 'goods' })} onPress={jest.fn()} nearestDeadline={null} />,
      )
      expect(queryByTestId('icon-calendar-outline')).toBeNull()
    })

    it('карточка имеет accessibilityLabel = название списка', async () => {
      const { getByLabelText } = await render(
        <ListCard list={makeList({ title: 'Мои покупки' })} onPress={jest.fn()} />,
      )
      expect(getByLabelText('Мои покупки')).toBeTruthy()
    })
  })

  describe('тип tasks', () => {
    it('отображает счётчик «N/M сделано» для tasks', async () => {
      const { getByText } = await render(
        <ListCard
          list={makeList({ type: 'tasks', checkedItemsCount: 1, itemsCount: 4 })}
          onPress={jest.fn()}
        />,
      )
      expect(getByText('1/4 сделано')).toBeTruthy()
    })

    it('показывает иконку чек-лист (list) для tasks', async () => {
      const { getByText } = await render(
        <ListCard list={makeList({ type: 'tasks' })} onPress={jest.fn()} />,
      )
      expect(getByText('list')).toBeTruthy()
    })

    it('показывает чип ближайшего дедлайна для tasks', async () => {
      const { getByText } = await render(
        <ListCard
          list={makeList({ type: 'tasks' })}
          onPress={jest.fn()}
          nearestDeadline="5 июл"
        />,
      )
      expect(getByText('5 июл')).toBeTruthy()
    })

    it('показывает иконку calendar-outline внутри чипа дедлайна', async () => {
      const { getByTestId } = await render(
        <ListCard
          list={makeList({ type: 'tasks' })}
          onPress={jest.fn()}
          nearestDeadline="5 июл"
        />,
      )
      expect(getByTestId('icon-calendar-outline')).toBeTruthy()
    })
  })

  describe('порядок элементов строки', () => {
    it('icon-square, название и счётчик присутствуют одновременно', async () => {
      const { getByTestId, getByText } = await render(
        <ListCard list={makeList({ title: 'Тест' })} onPress={jest.fn()} />,
      )
      expect(getByTestId('icon-square')).toBeTruthy()
      expect(getByText('Тест')).toBeTruthy()
      expect(getByText('2/5 куплено')).toBeTruthy()
      expect(getByText('chevron-forward')).toBeTruthy()
    })
  })
})
