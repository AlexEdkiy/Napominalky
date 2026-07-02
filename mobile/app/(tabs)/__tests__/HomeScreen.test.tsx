// Моки до импортов

jest.mock('@/db/client', () => ({ db: {} }))

jest.mock('@expo/vector-icons', () => {
  const React = require('react')
  const { View } = require('react-native')
  const Ionicons = ({ name }: { name: string }) =>
    React.createElement(View, { testID: `icon-${name}` })
  return { Ionicons }
})

jest.mock('expo-linear-gradient', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'linear-gradient', ...props }, children),
  }
})

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}))

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}))

const mockSyncNow = jest.fn(async () => undefined)

jest.mock('@/hooks/useSyncEngine', () => ({
  useSyncEngine: () => ({
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    syncNow: mockSyncNow,
  }),
}))

jest.mock('@/hooks/useNotes', () => ({
  useNotes: () => ({ notes: [], isLoading: false, deleteNote: { mutate: jest.fn() } }),
}))

jest.mock('@/hooks/useReminders', () => ({
  useReminders: () => ({ reminders: [], isLoading: false }),
}))

const mockLists: Array<Record<string, unknown>> = []

jest.mock('@/hooks/useShoppingLists', () => ({
  useShoppingLists: () => ({ lists: mockLists, isLoading: false }),
}))

jest.mock('@/components/home/FilterChips', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'filter-chips' }),
  }
})

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      screenBg: '#fff',
      surface: '#ffffff',
      borderSubtle: '#EFF3F6',
      accent: '#0D9488',
      amber: '#D9962A',
      noteBlue: '#4067a8',
      noteBlueBg: '#dde6f3',
      accentSoftBg: '#DDF1ED',
      amberBg: '#FBEFD6',
      textPrimary: '#1B2733',
      textSecondary: '#76828F',
      textTertiary: '#9AA6B2',
    },
  }),
}))

jest.mock('@/theme/typography', () => ({
  typography: { cardTitle: {}, body: {} },
}))

import React from 'react'
import { render } from '@testing-library/react-native'
import HomeScreen from '../index'

beforeEach(() => {
  jest.clearAllMocks()
  mockLists.length = 0
})

const buildList = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  uuid: 'list-1',
  title: 'Купить продукты',
  type: 'goods',
  itemsCount: 4,
  checkedItemsCount: 2,
  ...overrides,
})

describe('HomeScreen — заголовок', () => {
  it('рендерит DarkHeader с title «Вспомнить всё!»', async () => {
    const { getByText } = await render(<HomeScreen />)
    expect(getByText('Вспомнить всё!')).toBeTruthy()
  })
})

describe('HomeScreen — pull-to-refresh', () => {
  it('ScrollView (testID=home-scroll) присутствует', async () => {
    const { getByTestId } = await render(<HomeScreen />)
    expect(getByTestId('home-scroll')).toBeTruthy()
  })

  it('ScrollView имеет prop refreshControl', async () => {
    const { getByTestId } = await render(<HomeScreen />)
    const scrollView = getByTestId('home-scroll')
    expect((scrollView.props as Record<string, unknown>).refreshControl).toBeDefined()
  })

  it('onRefresh вызывает syncNow', async () => {
    const { getByTestId } = await render(<HomeScreen />)
    const scrollView = getByTestId('home-scroll')
    const { refreshControl } = scrollView.props as {
      refreshControl: { props: { onRefresh: () => Promise<void> } }
    }
    await refreshControl.props.onRefresh()
    expect(mockSyncNow).toHaveBeenCalledTimes(1)
  })

  it('refreshing = false при isSyncing=false', async () => {
    const { getByTestId } = await render(<HomeScreen />)
    const scrollView = getByTestId('home-scroll')
    const { refreshControl } = scrollView.props as {
      refreshControl: { props: { refreshing: boolean } }
    }
    expect(refreshControl.props.refreshing).toBe(false)
  })
})

describe('HomeScreen — карточки задач (кольцо прогресса + иконка по типу)', () => {
  it('рендерит кольцо прогресса для карточки задачи', async () => {
    mockLists.push(buildList())
    const { getAllByTestId } = await render(<HomeScreen />)
    expect(getAllByTestId('progress-ring-svg').length).toBeGreaterThan(0)
  })

  it('goods → иконка bag-handle', async () => {
    mockLists.push(buildList({ type: 'goods' }))
    const { getByTestId } = await render(<HomeScreen />)
    expect(getByTestId('icon-bag-handle')).toBeTruthy()
  })

  it('tasks → иконка list', async () => {
    mockLists.push(buildList({ type: 'tasks' }))
    const { getByTestId } = await render(<HomeScreen />)
    expect(getByTestId('icon-list')).toBeTruthy()
  })

  it('не падает при itemsCount=0', async () => {
    mockLists.push(buildList({ itemsCount: 0, checkedItemsCount: 0 }))
    const { getAllByTestId } = await render(<HomeScreen />)
    expect(getAllByTestId('progress-ring-svg').length).toBeGreaterThan(0)
  })
})

describe('HomeScreen — подпись статуса по типу задачи', () => {
  it('tasks → подзаголовок содержит «сделано»', async () => {
    mockLists.push(buildList({ type: 'tasks', itemsCount: 4, checkedItemsCount: 1 }))
    const { getByText } = await render(<HomeScreen />)
    expect(getByText('4 пунктов · 1 сделано')).toBeTruthy()
  })

  it('goods → подзаголовок содержит «куплено»', async () => {
    mockLists.push(buildList({ type: 'goods', itemsCount: 4, checkedItemsCount: 2 }))
    const { getByText } = await render(<HomeScreen />)
    expect(getByText('4 пунктов · 2 куплено')).toBeTruthy()
  })
})
