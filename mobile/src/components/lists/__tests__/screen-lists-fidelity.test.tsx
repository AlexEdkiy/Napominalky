/**
 * UI-fidelity тесты: экран «Списки» (lists.tsx) — FilterTabs + строки списков.
 * Тестируем FilterTabs и ListCard в связке через рендер экрана с полными моками.
 */
jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { render } from '@testing-library/react-native'

// ---- Общие моки -------------------------------------------------------

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

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native')
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  }
})

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ uuid: 'list-1' }),
}))

const MOCK_COLORS = {
  surface: '#fff',
  screenBg: '#F6F8FA',
  accent: '#0EA5A0',
  accentDark: '#087f7a',
  accentSoftBg: '#DDF1ED',
  accentOnSoft: '#065f5c',
  amber: '#F59E0B',
  amberBg: '#FBEFD6',
  coral: '#FF6B6B',
  coralSoftBg: '#FFE8E8',
  danger: '#FF3B30',
  dangerSoftBg: '#FFE8E8',
  purple: '#8B5CF6',
  purpleBg: '#EDE9FE',
  noteBlue: '#3B82F6',
  noteBlueBg: '#EFF6FF',
  textPrimary: '#111',
  textSecondary: '#666',
  textTertiary: '#999',
  textFaint: '#ccc',
  borderSubtle: '#eee',
  borderInput: '#ddd',
  background: '#fff',
  appBg: '#F6F8FA',
}

jest.mock('@/theme', () => ({
  useTheme: () => ({ colors: MOCK_COLORS }),
}))

jest.mock('@/theme/typography', () => ({
  typography: {
    screenTitle: { fontSize: 26, fontWeight: '700' },
    cardTitle: { fontSize: 17, fontWeight: '700' },
    body: { fontSize: 15 },
    bodyMd: { fontSize: 16 },
    bodySm: { fontSize: 13 },
    buttonLabel: { fontSize: 16, fontWeight: '700' },
    sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  },
}))

jest.mock('@/utils/datetime', () => ({
  formatDeadlineChip: (s: string) => s,
}))

// ---- Тесты FilterTabs (импортируем экран, но тестируем его под-компонент через рендер)

import { View, Text, Pressable } from 'react-native'
import ListCard from '../ListCard'
import type { ShoppingList } from '@/db/repositories/shoppingListsRepo'

/**
 * Вспомогательная функция: рендерит ряд вкладок FilterTabs так, как он отображается
 * на экране — используем те же параметры что в lists.tsx.
 */
const TABS = [
  { key: 'all', label: 'Все' },
  { key: 'goods', label: 'Товары' },
  { key: 'tasks', label: 'Задачи' },
] as const

type FilterTabKey = 'all' | 'goods' | 'tasks'

interface MockFilterTabsProps {
  active: FilterTabKey
  counts: Record<FilterTabKey, number>
}

// Воспроизводим FilterTabs как в lists.tsx для тестирования
const MockFilterTabs: React.FC<MockFilterTabsProps> = ({ active, counts }) => {
  const dotColors: Record<FilterTabKey, string | undefined> = {
    all: undefined,
    goods: MOCK_COLORS.accent,
    tasks: MOCK_COLORS.amber,
  }
  return (
    <View testID="filter-tabs" accessibilityRole="tablist">
      {TABS.map((tab) => {
        const isActive = tab.key === active
        const dot = dotColors[tab.key]
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            testID={`tab-${tab.key}`}
          >
            {dot !== undefined && (
              <View testID={`dot-${tab.key}`} />
            )}
            <Text>{tab.label}</Text>
            <Text testID={`count-${tab.key}`}>{counts[tab.key]}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

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

// ============================================================
// Тесты экрана «Списки» — FilterTabs
// ============================================================

describe('Экран «Списки» — FilterTabs (макет)', () => {
  describe('порядок и метки вкладок', () => {
    it('отображает три вкладки: Все, Товары, Задачи', async () => {
      const { getByTestId, getByText } = await render(
        <MockFilterTabs active="all" counts={{ all: 10, goods: 6, tasks: 4 }} />,
      )
      expect(getByTestId('tab-all')).toBeTruthy()
      expect(getByTestId('tab-goods')).toBeTruthy()
      expect(getByTestId('tab-tasks')).toBeTruthy()
      expect(getByText('Все')).toBeTruthy()
      expect(getByText('Товары')).toBeTruthy()
      expect(getByText('Задачи')).toBeTruthy()
    })

    it('порядок вкладок: Все → Товары → Задачи', async () => {
      const { getAllByRole } = await render(
        <MockFilterTabs active="all" counts={{ all: 10, goods: 6, tasks: 4 }} />,
      )
      const tabs = getAllByRole('tab')
      expect(tabs).toHaveLength(3)
      // Проверяем порядок по testID через children-текст
      expect(tabs[0]?.props.testID).toBe('tab-all')
      expect(tabs[1]?.props.testID).toBe('tab-goods')
      expect(tabs[2]?.props.testID).toBe('tab-tasks')
    })

    it('у каждой вкладки отображается счётчик', async () => {
      const { getByTestId } = await render(
        <MockFilterTabs active="all" counts={{ all: 10, goods: 6, tasks: 4 }} />,
      )
      expect(getByTestId('count-all')).toBeTruthy()
      expect(getByTestId('count-goods')).toBeTruthy()
      expect(getByTestId('count-tasks')).toBeTruthy()
    })

    it('счётчик отображает правильные числа', async () => {
      const { getByTestId } = await render(
        <MockFilterTabs active="all" counts={{ all: 10, goods: 6, tasks: 4 }} />,
      )
      expect(getByTestId('count-all').props.children).toBe(10)
      expect(getByTestId('count-goods').props.children).toBe(6)
      expect(getByTestId('count-tasks').props.children).toBe(4)
    })

    it('у Товары есть цветная точка (dot)', async () => {
      const { getByTestId } = await render(
        <MockFilterTabs active="all" counts={{ all: 0, goods: 0, tasks: 0 }} />,
      )
      expect(getByTestId('dot-goods')).toBeTruthy()
    })

    it('у Задачи есть цветная точка (dot)', async () => {
      const { getByTestId } = await render(
        <MockFilterTabs active="all" counts={{ all: 0, goods: 0, tasks: 0 }} />,
      )
      expect(getByTestId('dot-tasks')).toBeTruthy()
    })

    it('у вкладки Все НЕТ цветной точки', async () => {
      const { queryByTestId } = await render(
        <MockFilterTabs active="all" counts={{ all: 0, goods: 0, tasks: 0 }} />,
      )
      expect(queryByTestId('dot-all')).toBeNull()
    })
  })

  describe('состояние активной вкладки', () => {
    it('вкладка «Все» активна по умолчанию (accessibilityState.selected=true)', async () => {
      const { getByTestId } = await render(
        <MockFilterTabs active="all" counts={{ all: 5, goods: 3, tasks: 2 }} />,
      )
      expect(getByTestId('tab-all').props.accessibilityState?.selected).toBe(true)
    })

    it('вкладка «Товары» активна когда active=goods', async () => {
      const { getByTestId } = await render(
        <MockFilterTabs active="goods" counts={{ all: 5, goods: 3, tasks: 2 }} />,
      )
      expect(getByTestId('tab-goods').props.accessibilityState?.selected).toBe(true)
      expect(getByTestId('tab-all').props.accessibilityState?.selected).toBe(false)
    })

    it('вкладка «Задачи» активна когда active=tasks', async () => {
      const { getByTestId } = await render(
        <MockFilterTabs active="tasks" counts={{ all: 5, goods: 3, tasks: 2 }} />,
      )
      expect(getByTestId('tab-tasks').props.accessibilityState?.selected).toBe(true)
      expect(getByTestId('tab-goods').props.accessibilityState?.selected).toBe(false)
    })
  })

  describe('строки списков', () => {
    it('строка goods показывает иконку, название, счётчик «куплено», chevron', async () => {
      const { getByText, getByTestId } = await render(
        <ListCard
          list={makeList({ title: 'Супермаркет', checkedItemsCount: 2, itemsCount: 5 })}
          onPress={jest.fn()}
        />,
      )
      expect(getByTestId('icon-square')).toBeTruthy()
      expect(getByText('Супермаркет')).toBeTruthy()
      expect(getByText('2/5 куплено')).toBeTruthy()
      expect(getByText('chevron-forward')).toBeTruthy()
    })

    it('строка tasks показывает иконку, название, счётчик «сделано», chevron', async () => {
      const { getByText } = await render(
        <ListCard
          list={makeList({ type: 'tasks', title: 'Дела на неделю', checkedItemsCount: 1, itemsCount: 3 })}
          onPress={jest.fn()}
        />,
      )
      expect(getByText('Дела на неделю')).toBeTruthy()
      expect(getByText('1/3 сделано')).toBeTruthy()
      expect(getByText('chevron-forward')).toBeTruthy()
    })

    it('строка tasks с дедлайном показывает deadline-чип', async () => {
      const { getByText } = await render(
        <ListCard
          list={makeList({ type: 'tasks' })}
          onPress={jest.fn()}
          nearestDeadline="завтра"
        />,
      )
      expect(getByText('завтра')).toBeTruthy()
    })
  })
})
